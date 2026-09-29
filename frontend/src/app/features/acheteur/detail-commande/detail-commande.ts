import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommandeResponse } from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_MODE_RECEPTION,
  LIBELLES_STATUT_COMMANDE,
  ModeReception,
  StatutCommande,
  VARIANTES_BADGE_COMMANDE,
} from '../../../core/modeles/referentiels';
import { CommandeService } from '../../../core/services/commande.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  formaterDateHeure,
  formaterMontant,
  formaterQuantite,
} from '../../../core/utilitaires/formatage';

/**
 * Statuts depuis lesquels le backend admet une annulation par l'acheteur
 * (`CommandeService.TRANSITIONS_AUTORISEES` : `EN_ATTENTE → ANNULEE` et
 * `CONFIRMEE → ANNULEE`). `PRETE` ne mène qu'à `LIVREE`, et `LIVREE` comme `ANNULEE`
 * sont terminaux : le bouton n'apparaît donc pas dans ces trois cas.
 *
 * Retirer le bouton est un confort d'usage, pas une règle de sécurité : si l'état a
 * changé entre-temps, le serveur refuse la transition (400) et le message est affiché.
 */
const STATUTS_ANNULABLES: readonly StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE'];

/**
 * Statuts pour lesquels `PaiementService` admet une simulation : il refuse `ANNULEE` et
 * `LIVREE` par un 400 serveur. Le lien vers l'écran de paiement disparaît donc dans ces
 * deux cas — et avec lui tout vocabulaire de paiement sur une commande terminée.
 *
 * Le simple fait de proposer le lien ne déclenche aucun appel : l'écran de paiement
 * relit la commande et vérifie lui-même un paiement déjà enregistré.
 */
const STATUTS_PAYABLES: readonly StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE', 'PRETE'];

/**
 * Détail d'une commande de l'acheteur (GET /api/commandes/{id}).
 *
 * Tout ce qui est affiché vient de la réponse du serveur : montants, total, statut,
 * quantités et lignes. Le panier local n'est jamais relu pour remplacer une valeur, et
 * l'annulation utilise la commande renvoyée par le PATCH, jamais un statut écrit ici.
 * Un identifiant mal formé ou inconnu est présenté comme « introuvable » ; un 403 reste
 * un refus, sans déconnexion.
 */
@Component({
  selector: 'app-detail-commande',
  imports: [RouterLink],
  templateUrl: './detail-commande.html',
  styleUrl: './detail-commande.scss',
})
export class DetailCommande {
  private readonly route = inject(ActivatedRoute);
  private readonly commandes = inject(CommandeService);
  private readonly document = inject(DOCUMENT);

  protected readonly commande = signal<CommandeResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly introuvable = signal(false);

  protected readonly confirmationAnnulation = signal(false);
  protected readonly annulationEnCours = signal(false);
  protected readonly erreurAnnulation = signal<string | null>(null);
  protected readonly succesAnnulation = signal<string | null>(null);

  protected readonly annulable = computed(() => {
    const statut = this.commande()?.statut;
    return statut !== undefined && STATUTS_ANNULABLES.includes(statut);
  });

  protected readonly payable = computed(() => {
    const statut = this.commande()?.statut;
    return statut !== undefined && STATUTS_PAYABLES.includes(statut);
  });

  protected readonly livraison = computed(() => this.commande()?.modeReception === 'LIVRAISON');

  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  private readonly boutonAnnuler = viewChild('boutonAnnuler', { read: ElementRef });
  private readonly modale = viewChild('modale', { read: ElementRef });
  private readonly lienRetour = viewChild('lienRetour', { read: ElementRef });

  /** Déclencheur de la modale, pour lui rendre le focus à la fermeture. */
  private declencheurAnnulation: HTMLElement | null = null;

  /** Le bouton « Annuler » disparaît avec le statut : le focus attend le lien de retour. */
  private readonly focusApresAnnulation = signal(false);

  private identifiant: number | null = null;

  constructor() {
    // paramMap plutôt que snapshot : le composant est réutilisé d'une commande à l'autre.
    this.route.paramMap.subscribe((parametres) => {
      const id = Number(parametres.get('id'));
      this.identifiant = Number.isInteger(id) && id > 0 ? id : null;
      this.charger();
    });

    // viewChild est un signal : l'effet se rejoue quand la modale est réellement rendue.
    effect(() => {
      const bouton = this.boutonAnnuler();
      if (this.confirmationAnnulation() && bouton !== undefined) {
        bouton.nativeElement.focus();
      }
    });

    effect(() => {
      const lien = this.lienRetour();
      if (this.focusApresAnnulation() && lien !== undefined) {
        lien.nativeElement.focus();
        this.focusApresAnnulation.set(false);
      }
    });
  }

  protected charger(): void {
    const id = this.identifiant;
    if (id === null) {
      this.commande.set(null);
      this.erreur.set(null);
      this.introuvable.set(true);
      this.chargement.set(false);
      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);
    this.introuvable.set(false);
    this.commande.set(null);
    this.succesAnnulation.set(null);

    this.commandes.findById(id).subscribe({
      next: (commande) => {
        this.commande.set(commande);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.introuvable.set(true);
          return;
        }
        // 403 et autres : le message du backend, sans purge de session (le 401 reste
        // traité par l'intercepteur).
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger cette commande.'));
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected libelleStatut(statut: StatutCommande): string {
    return LIBELLES_STATUT_COMMANDE[statut];
  }

  /** Le libellé reste affiché à côté : la couleur ne porte jamais le sens seule (§27). */
  protected classesStatut(statut: StatutCommande): string {
    return `badge ${VARIANTES_BADGE_COMMANDE[statut]}`;
  }

  protected libelleReception(mode: ModeReception): string {
    return LIBELLES_MODE_RECEPTION[mode];
  }

  /** Valeur absente : un seul signe, jamais une case vide ni « null » (§30). */
  protected ouValeurAbsente(valeur: string | null): string {
    return valeur ?? '—';
  }

  protected demanderAnnulation(evenement: MouseEvent): void {
    this.declencheurAnnulation = evenement.currentTarget as HTMLElement;
    this.erreurAnnulation.set(null);
    this.confirmationAnnulation.set(true);
  }

  protected annulerDemande(): void {
    if (this.annulationEnCours()) {
      return;
    }
    this.confirmationAnnulation.set(false);
    this.erreurAnnulation.set(null);
    this.rendreLeFocus();
  }

  /**
   * Une seule requête par confirmation : la garde sur `annulationEnCours` bloque le
   * double clic, le bouton étant de plus désactivé et son libellé remplacé par « … ».
   */
  protected confirmerAnnulation(): void {
    const commande = this.commande();
    if (commande === null || this.annulationEnCours()) {
      return;
    }

    this.annulationEnCours.set(true);
    this.erreurAnnulation.set(null);

    this.commandes.changerStatut(commande.id, 'ANNULEE').subscribe({
      next: (reponse) => {
        // Le statut affiché est celui renvoyé par le serveur, pas une réécriture locale.
        this.commande.set(reponse);
        this.annulationEnCours.set(false);
        this.confirmationAnnulation.set(false);
        this.succesAnnulation.set(`La commande n° ${reponse.id} a été annulée.`);
        // Le bouton déclencheur disparaît avec le statut : le focus passera au retour.
        this.declencheurAnnulation = null;
        this.focusApresAnnulation.set(true);
      },
      error: (erreur: unknown) => {
        // Échec : la commande garde le statut affiché, la modale reste ouverte.
        this.annulationEnCours.set(false);
        this.erreurAnnulation.set(
          messageErreurApi(erreur, "L'annulation a échoué. La commande reste en l'état."),
        );
      },
    });
  }

  /**
   * Escape écouté sur le document : la modale se ferme même si le focus a quitté
   * son sous-arbre.
   */
  @HostListener('document:keydown.escape')
  protected fermerParEscape(): void {
    if (this.confirmationAnnulation()) {
      this.annulerDemande();
    }
  }

  /**
   * Piège de focus sur Tab et Shift+Tab : les deux événements sont interceptés,
   * « keydown.tab » ne couvrant pas Shift+Tab.
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
      ? index <= 0
        ? focusables[focusables.length - 1]
        : focusables[index - 1]
      : index === -1 || index === focusables.length - 1
        ? focusables[0]
        : focusables[index + 1];
    cible.focus();
  }

  private focusablesDe(modale: HTMLElement): HTMLElement[] {
    return Array.from(
      modale.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea',
      ),
    );
  }

  private rendreLeFocus(): void {
    const bouton = this.declencheurAnnulation;
    this.declencheurAnnulation = null;
    if (bouton !== null && bouton.isConnected) {
      bouton.focus();
    }
  }
}
