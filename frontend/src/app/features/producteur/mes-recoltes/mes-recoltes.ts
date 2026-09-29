import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, effect, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProducteurResponse, RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { LIBELLES_FILIERE, LIBELLES_STATUT_RECOLTE, StatutRecolte } from '../../../core/modeles/referentiels';
import { ProducteurService } from '../../../core/services/producteur.service';
import { RecolteService } from '../../../core/services/recolte.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { formaterDate, formaterMontant, formaterQuantite } from '../../../core/utilitaires/formatage';

/**
 * Gestion des récoltes du producteur connecté.
 *
 * L'identité vient exclusivement de GET /api/producteurs/moi, déduit du jeton par
 * le backend : la liste est ensuite demandée à GET /api/recoltes/mes-recoltes sans
 * aucun identifiant en paramètre. Un 403 est affiché comme un refus d'accès, jamais
 * comme une déconnexion (la purge de session ne concerne que le 401, cf. intercepteur).
 */
@Component({
  selector: 'app-mes-recoltes',
  imports: [RouterLink],
  templateUrl: './mes-recoltes.html',
  styleUrl: './mes-recoltes.scss',
})
export class MesRecoltes {
  private readonly producteurService = inject(ProducteurService);
  private readonly recoltes = inject(RecolteService);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  protected readonly producteur = signal<ProducteurResponse | null>(null);
  protected readonly liste = signal<RecolteResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly recolteASupprimer = signal<RecolteResponse | null>(null);
  protected readonly suppressionEnCours = signal(false);
  protected readonly erreurSuppression = signal<string | null>(null);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;
  protected readonly formaterDate = formaterDate;

  private readonly boutonAnnuler = viewChild('boutonAnnuler', { read: ElementRef });
  private readonly modale = viewChild('modale', { read: ElementRef });
  private readonly lienPublication = viewChild('lienPublication', { read: ElementRef });

  /** Déclencheur de la modale, pour lui rendre le focus à la fermeture. */
  private declencheurSuppression: HTMLElement | null = null;

  protected readonly messageSucces = signal<string | null>(this.messageDepuisLaRoute());

  constructor() {
    this.charger();

    // viewChild est un signal : l'effet se rejoue quand la modale est réellement rendue.
    effect(() => {
      const bouton = this.boutonAnnuler();
      if (this.recolteASupprimer() !== null && bouton !== undefined) {
        bouton.nativeElement.focus();
      }
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.producteurService.moi().subscribe({
      next: (profil) => {
        this.producteur.set(profil);
        this.chargerListe();
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger votre profil producteur.'));
        this.chargement.set(false);
      },
    });
  }

  private chargerListe(): void {
    this.recoltes.mesRecoltes().subscribe({
      next: (recoltes) => {
        this.liste.set(recoltes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.liste.set([]);
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger vos récoltes.'));
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected libelleStatut(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
  }

  protected libelleFiliere(profil: ProducteurResponse): string {
    return LIBELLES_FILIERE[profil.filiere];
  }

  protected meta(recolte: RecolteResponse): string | null {
    const date = recolte.dateDisponibilite
      ? `Disponible à partir du ${formaterDate(recolte.dateDisponibilite)}`
      : null;
    const lieu = recolte.localisation;
    if (date && lieu) {
      return `${date} — ${lieu}`;
    }
    return date ?? lieu;
  }

  protected lienModification(recolte: RecolteResponse): string[] {
    return ['/producteur/recoltes', String(recolte.id), 'modifier'];
  }

  protected denombrement(): string {
    const total = this.liste().length;
    return total === 1 ? '1 récolte publiée' : `${total} récoltes publiées`;
  }

  /**
   * Escape ferme la modale même si le focus a quitté son sous-arbre : l'événement
   * est écouté sur le document, pas sur l'overlay.
   */
  @HostListener('document:keydown.escape')
  protected fermerParEscape(): void {
    if (this.recolteASupprimer() !== null) {
      this.annulerSuppression();
    }
  }

  /**
   * Piège de focus : Tab et Shift+Tab tournent entre les cibles focusables de la
   * modale. Sans lui, la Tab suivante atteint l'arrière-plan et Escape ne ferme plus rien.
   * Les deux événements sont écoutés séparément : « keydown.tab » ne correspond pas
   * à une pression Shift+Tab.
   */
  @HostListener('document:keydown.tab', ['$event'])
  @HostListener('document:keydown.shift.tab', ['$event'])
  protected piegerLeFocus(evenement: Event): void {
    const modale = this.modale()?.nativeElement;
    if (modale === undefined) {
      return;
    }
    const focusables = this.focusablesDe(modale);
    if (focusables.length === 0) {
      return;
    }

    evenement.preventDefault();
    const { shiftKey } = evenement as KeyboardEvent;
    const actif = this.document.activeElement as HTMLElement | null;
    const index = actif === null ? -1 : focusables.indexOf(actif);
    const cible = shiftKey
      ? (index <= 0 ? focusables[focusables.length - 1] : focusables[index - 1])
      : (index === -1 || index === focusables.length - 1 ? focusables[0] : focusables[index + 1]);
    cible.focus();
  }

  protected demanderSuppression(recolte: RecolteResponse, evenement: MouseEvent): void {
    this.declencheurSuppression = evenement.currentTarget as HTMLElement;
    this.erreurSuppression.set(null);
    this.recolteASupprimer.set(recolte);
  }

  protected annulerSuppression(): void {
    if (this.suppressionEnCours()) {
      return;
    }
    this.recolteASupprimer.set(null);
    this.erreurSuppression.set(null);
    this.rendreLeFocus();
  }

  protected confirmerSuppression(): void {
    const recolte = this.recolteASupprimer();
    if (recolte === null || this.suppressionEnCours()) {
      return;
    }

    this.suppressionEnCours.set(true);
    this.erreurSuppression.set(null);

    this.recoltes.supprimer(recolte.id).subscribe({
      next: () => {
        this.liste.update((liste) => liste.filter((element) => element.id !== recolte.id));
        this.suppressionEnCours.set(false);
        this.recolteASupprimer.set(null);
        this.messageSucces.set(`« ${recolte.produit} » a été supprimée du catalogue.`);
        this.placerLeFocusApresSuppression();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        // 400 (récolte utilisée) et 403 (pas propriétaire) : message du backend,
        // la modale reste ouverte, aucune purge de session.
        const statut = erreur instanceof HttpErrorResponse ? erreur.status : 0;
        this.erreurSuppression.set(
          messageErreurApi(erreur, statut === 403 ? 'Accès refusé pour cette récolte.' : 'La suppression a échoué.'),
        );
      },
    });
  }

  private focusablesDe(modale: HTMLElement): HTMLElement[] {
    return Array.from(
      modale.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
    );
  }

  /**
   * Le bouton déclencheur est retiré du DOM avec sa carte : le focus reprend le lien
   * de publication, seule cible stable encore présente dans cet écran.
   */
  private placerLeFocusApresSuppression(): void {
    this.declencheurSuppression = null;
    this.lienPublication()?.nativeElement.focus();
  }

  private rendreLeFocus(): void {
    const bouton = this.declencheurSuppression;
    this.declencheurSuppression = null;
    if (bouton !== null && bouton.isConnected) {
      bouton.focus();
    }
  }

  private messageDepuisLaRoute(): string | null {
    const parametres = this.route.snapshot.queryParamMap;
    if (parametres.has('recolteCreee')) {
      return 'Votre récolte a été publiée.';
    }
    if (parametres.has('recolteModifiee')) {
      return 'Votre récolte a été modifiée.';
    }
    return null;
  }
}
