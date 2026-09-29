import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UtilisateurResponse } from '../../../core/modeles/domaine.modeles';
import { LIBELLES_ROLE, Role } from '../../../core/modeles/referentiels';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { formaterDateHeure } from '../../../core/utilitaires/formatage';

/**
 * Comptes utilisateurs vus de l'administration (GET /api/utilisateurs).
 *
 * Seule l'activation change ici : le contenu d'un compte (nom, email, rôle, mot de passe)
 * n'est administrable par aucune route du backend, donc par aucun écran. La liste et son
 * tri viennent du serveur, rien n'est recalculé côté client.
 *
 * Le changement d'état passe par une modale de confirmation (§31) : `PATCH
 * /api/utilisateurs/{id}/actif` est l'action la plus lourde disponible ici — elle coupe
 * l'accès d'un compte en cours de session. Un 400 (auto-désactivation refusée), 403 ou 404
 * affiche le message du backend dans la modale, sans déconnexion ni purge de session.
 */
@Component({
  selector: 'app-admin-utilisateurs',
  imports: [RouterLink],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss',
})
export class Utilisateurs {
  private readonly utilisateurs = inject(UtilisateurService);
  private readonly document = inject(DOCUMENT);
  private readonly rendu = inject(ChangeDetectorRef);

  protected readonly liste = signal<UtilisateurResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Compte choisi pour la modale : `null` = fermée. */
  protected readonly cible = signal<UtilisateurResponse | null>(null);
  /** Identifiant dont le `PATCH` est en vol : un seul appel à la fois. */
  protected readonly enCours = signal<number | null>(null);
  protected readonly refus = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);

  protected readonly formaterDateHeure = formaterDateHeure;

  private readonly boutonAnnuler = viewChild('boutonAnnuler', { read: ElementRef });
  private readonly modale = viewChild('modale', { read: ElementRef });
  private readonly boutonActualiser = viewChild('boutonActualiser', { read: ElementRef });

  /** Déclencheur de la modale, pour lui rendre le focus à la fermeture. */
  private declencheur: HTMLElement | null = null;

  constructor() {
    this.charger();

    // viewChild est un signal : l'effet se rejoue quand la modale est réellement rendue.
    effect(() => {
      const bouton = this.boutonAnnuler();
      if (this.cible() !== null && bouton !== undefined) {
        bouton.nativeElement.focus();
      }
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.succes.set(null);

    this.utilisateurs.lister().subscribe({
      next: (utilisateurs) => {
        this.liste.set(utilisateurs);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.liste.set([]);
        // 403 (compte non ADMIN) comme 500 : le message du backend, sans déconnexion.
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger la liste des comptes.'));
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected libelleRole(role: Role): string {
    return LIBELLES_ROLE[role];
  }

  protected nomComplet(utilisateur: UtilisateurResponse): string {
    return `${utilisateur.prenom} ${utilisateur.nom}`;
  }

  protected denombrement(): string {
    const total = this.liste().length;
    return total === 1 ? '1 compte' : `${total} comptes`;
  }

  /**
   * Escape ferme la modale même si le focus a quitté son sous-arbre : l'événement
   * est écouté sur le document, pas sur l'overlay.
   */
  @HostListener('document:keydown.escape')
  protected fermerParEscape(): void {
    if (this.cible() !== null) {
      this.annuler();
    }
  }

  /**
   * Piège de focus : Tab et Shift+Tab tournent entre les cibles focusables de la modale.
   * Les deux événements sont écoutés séparément : « keydown.tab » ne correspond pas à
   * une pression Shift+Tab.
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

  protected demander(utilisateur: UtilisateurResponse, evenement: MouseEvent): void {
    this.declencheur = evenement.currentTarget as HTMLElement;
    this.refus.set(null);
    this.succes.set(null);
    this.cible.set(utilisateur);
  }

  protected annuler(): void {
    if (this.enCours() !== null) {
      return;
    }
    this.cible.set(null);
    this.refus.set(null);
    this.rendreLeFocus();
  }

  /** Le bouton « Annuler » de la modale n'est jamais le bouton destructif (§31). */
  protected libelleBouton(utilisateur: UtilisateurResponse): string {
    return utilisateur.actif ? 'Désactiver' : 'Réactiver';
  }

  protected confirmer(): void {
    const cible = this.cible();
    if (cible === null || this.enCours() !== null) {
      return;
    }

    this.enCours.set(cible.id);
    this.refus.set(null);

    this.utilisateurs.changerActif(cible.id, !cible.actif).subscribe({
      next: (utilisateur) => {
        // La ligne est remplacée par la réponse du serveur, jamais par un état écrit ici.
        this.liste.update((liste) =>
          liste.map((element) => (element.id === utilisateur.id ? utilisateur : element)),
        );
        this.enCours.set(null);
        this.cible.set(null);
        this.succes.set(
          utilisateur.actif
            ? `Le compte de ${this.nomComplet(utilisateur)} est de nouveau actif.`
            : `Le compte de ${this.nomComplet(utilisateur)} est désactivé.`,
        );
        this.rendreLeFocus();
      },
      error: (erreur: unknown) => {
        this.enCours.set(null);
        // 400 (propre compte), 403 et 404 : message du backend, la modale reste ouverte.
        this.refus.set(
          messageErreurApi(
            erreur,
            `Le compte de ${this.nomComplet(cible)} n’a pas pu être mis à jour.`,
          ),
        );
        this.placerLeFocusSurAnnuler();
      },
    });
  }

  private focusablesDe(modale: HTMLElement): HTMLElement[] {
    return Array.from(
      modale.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
    );
  }

  /**
   * En cas d'échec la modale reste ouverte avec son message : le focus revient sur
   * « Annuler », seule issue explicite proposée à ce moment-là.
   */
  private placerLeFocusSurAnnuler(): void {
    this.declencheur = null;
    this.boutonAnnuler()?.nativeElement.focus();
  }

  private rendreLeFocus(): void {
    const bouton = this.declencheur;
    this.declencheur = null;
    // Les boutons de la liste portent [disabled] tant qu'un PATCH est en vol, et un contrôle
    // désactivé refuse le focus : le DOM doit être rafraîchi avant de chercher une cible.
    this.rendu.detectChanges();
    if (bouton !== null && bouton.isConnected) {
      bouton.focus();
      return;
    }
    this.boutonActualiser()?.nativeElement.focus();
  }
}
