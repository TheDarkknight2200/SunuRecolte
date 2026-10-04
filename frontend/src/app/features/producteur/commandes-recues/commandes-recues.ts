import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommandeResponse } from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_MODE_RECEPTION,
  LIBELLES_STATUT_COMMANDE,
  ModeReception,
  StatutCommande,
  VARIANTES_BADGE_COMMANDE,
} from '../../../core/modeles/referentiels';
import { CommandeService } from '../../../core/services/commande.service';
import { ToastService } from '../../../core/services/toast.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  libellePaiement,
  messageDePaiementRequis,
  paiementRequisPour,
} from '../../../core/utilitaires/paiement-commande';
import {
  formaterDateHeure,
  formaterMontant,
  formaterQuantite,
} from '../../../core/utilitaires/formatage';

/**
 * Reflet de `CommandeService.TRANSITIONS_AUTORISEES` (`EN_ATTENTE → CONFIRMEE → PRETE → LIVREE`),
 * restreint au cycle que le backend admet de la part d'un producteur concerné. `LIVREE` et
 * `ANNULEE` sont terminaux : aucune suite n'est définie pour eux, donc aucun bouton n'apparaît.
 *
 * Ce n'est pas une règle concurrente : le serveur reste seul autorité (FRONTEND_DESIGN.md §19 et
 * §35). Retirer le bouton est un confort d'usage ; si le statut a changé entre-temps, le `PATCH`
 * est refusé (400) et son message est affiché.
 *
 * `ANNULEE` n'est pas proposé : l'API l'admet aussi pour un producteur, mais l'annulation reste
 * pilotée par l'acheteur (§33) et un second point d'annulation élargirait le périmètre.
 */
const ETAPES_SUIVANTES: Partial<
  Record<StatutCommande, { statut: StatutCommande; libelle: string }>
> = {
  EN_ATTENTE: { statut: 'CONFIRMEE', libelle: 'Confirmer la commande' },
  CONFIRMEE: { statut: 'PRETE', libelle: 'Marquer comme prête' },
  PRETE: { statut: 'LIVREE', libelle: 'Marquer comme livrée' },
};

/**
 * Commandes reçues par le producteur connecté (GET /api/commandes).
 *
 * Le serveur filtre à partir du jeton — aucun `producteurId` n'est envoyé — et renvoie la liste
 * triée par date décroissante. Tout ce qui est affiché vient de la réponse : montants, lignes,
 * acheteur, coordonnées de réception, statut du paiement et moyen choisi — `null` rendu
 * « Aucun paiement ». Une commande ne reçoit qu'une seule action, celle que la table du
 * service autorise depuis son statut courant ; le statut rendu après un `PATCH` est celui
 * renvoyé par le serveur, jamais un statut écrit ici.
 *
 * La règle « une livraison doit être payée avant d'être confirmée » est **anticipée** ici
 * (`paiementRequisPour`) : l'action reste visible et focusable, neutralisée par
 * `aria-disabled` et son motif, et la garde empêche l'appel. Le serveur garde le dernier
 * mot ; s'il refuse malgré tout, son message passe par la notice existante.
 *
 * La liste est relue à la demande (« Actualiser ») et quand l'onglet redevient visible : ces deux
 * lectures remplacent les données **sans** effacer l'écran, sans minuteur ni polling (§29).
 */
@Component({
  selector: 'app-commandes-recues',
  imports: [RouterLink],
  templateUrl: './commandes-recues.html',
  styleUrl: './commandes-recues.scss',
})
export class CommandesRecues {
  private readonly commandes = inject(CommandeService);
  private readonly toast = inject(ToastService);

  protected readonly liste = signal<CommandeResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Identifiant de la commande dont le `PATCH` est en vol : une seule requête à la fois. */
  protected readonly commandeEnCours = signal<number | null>(null);
  protected readonly succes = signal<{ id: number; message: string } | null>(null);
  protected readonly refus = signal<{ id: number; message: string } | null>(null);

  /**
   * Lecture relancée sur une liste déjà affichée : distincte du `chargement` initial, qui lui
   * remplace la liste par l'état « Chargement… ».
   */
  protected readonly actualisation = signal(false);

  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  /** Le bouton disparaissant avec le statut terminal, le message de succès reçoit le focus. */
  private readonly zoneSucces = viewChild('zoneSucces', { read: ElementRef });
  private readonly focusSurSucces = signal(false);

  constructor() {
    this.charger();

    // Un onglet qui redevient visible est relécu une fois : c'est le seul réveil prévu, aucun
    // minuteur et aucun polling (§29). L'écouteur est retiré à la destruction du composant.
    const auRetourDeOnglet = () => {
      if (document.visibilityState === 'visible') {
        this.actualiser();
      }
    };
    document.addEventListener('visibilitychange', auRetourDeOnglet);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('visibilitychange', auRetourDeOnglet),
    );

    effect(() => {
      const zone = this.zoneSucces();
      if (this.focusSurSucces() && zone !== undefined) {
        zone.nativeElement.focus();
        this.focusSurSucces.set(false);
      }
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.succes.set(null);
    this.refus.set(null);

    this.commandes.lister().subscribe({
      next: (commandes) => {
        this.liste.set(commandes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        // 403 comme 500 : le message du backend, sans déconnexion ni purge de session.
        this.liste.set([]);
        this.erreur.set(
          messageErreurApi(erreur, 'Impossible de charger les commandes reçues.'),
        );
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  /** Une seule lecture de liste à la fois, quoi qui la déclenche : clic ou retour d'onglet. */
  protected bloqueActualisation(): boolean {
    return this.chargement() || this.actualisation() || this.commandeEnCours() !== null;
  }

  /**
   * Relit `GET /api/commandes` sans rien effacer : la liste affichée reste en place, le message
   * de succès et le focus aussi. En cas d'échec, seul le message d'erreur change — une liste
   * périmée vaut mieux qu'une liste vide. Le serveur reste seul autorité du statut.
   */
  protected actualiser(): void {
    if (this.bloqueActualisation()) {
      return;
    }
    this.actualisation.set(true);

    this.commandes.lister().subscribe({
      next: (commandes) => {
        this.liste.set(commandes);
        this.erreur.set(null);
        this.actualisation.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(
          messageErreurApi(erreur, 'Impossible de charger les commandes reçues.'),
        );
        this.actualisation.set(false);
      },
    });
  }

  /** L'unique étape autorisée depuis ce statut, ou `null` : une action impossible n'est jamais affichée. */
  protected etapeDe(commande: CommandeResponse): { statut: StatutCommande; libelle: string } | null {
    return ETAPES_SUIVANTES[commande.statut] ?? null;
  }

  protected appliquerEtape(commande: CommandeResponse): void {
    const etape = this.etapeDe(commande);
    // Un blocage anticipé n'est pas une invitation à quand même tenter le `PATCH` : la garde arrête.
    if (etape === null || this.commandeEnCours() !== null || this.motifBlocage(commande) !== null) {
      return;
    }

    this.commandeEnCours.set(commande.id);
    this.succes.set(null);
    this.refus.set(null);
    // Une nouvelle tentative efface la notice du refus précédent.
    this.toast.masquer();

    this.commandes.changerStatut(commande.id, etape.statut).subscribe({
      next: (reponse) => {
        this.liste.update((liste) =>
          liste.map((element) => (element.id === reponse.id ? reponse : element)),
        );
        this.commandeEnCours.set(null);
        this.succes.set({
          id: reponse.id,
          message: `La commande n° ${reponse.id} est désormais « ${this.libelleStatut(reponse.statut)} ».`,
        });
        if (this.etapeDe(reponse) === null) {
          this.focusSurSucces.set(true);
        }
      },
      error: (erreur: unknown) => {
        // Échec : la carte garde le statut affiché, c'est le serveur qui a le dernier mot.
        this.commandeEnCours.set(null);
        const message = messageErreurApi(
          erreur,
          'Le statut de cette commande n’a pas pu être mis à jour.',
        );
        this.refus.set({ id: commande.id, message });
        this.toast.afficher(message, 'erreur');
      },
    });
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

  protected livraison(commande: CommandeResponse): boolean {
    return commande.modeReception === 'LIVRAISON';
  }

  /**
   * Paiement rendu par le serveur : « Aucun paiement » quand aucun n'a été enregistré,
   * sinon « moyen — statut ». La phrase vient de `libellePaiement`, unique source des deux
   * espaces : rien n'est déduit ici, un statut de paiement n'est jamais posé par l'écran.
   */
  protected readonly libellePaiement = libellePaiement;

  /**
   * Le motif qui neutralise l'unique action de la carte, `null` quand elle est possible.
   * Reflet de `CommandeService.verifierPaiementAvantConfirmation` : la règle est anticipée
   * pour ne pas proposer une action que le serveur refuserait, pas décidée ici.
   */
  protected motifBlocage(commande: CommandeResponse): string | null {
    const etape = this.etapeDe(commande);
    if (etape === null || !paiementRequisPour(commande, etape.statut)) {
      return null;
    }
    return messageDePaiementRequis(etape.statut);
  }

  /** L'identifiant du motif, pour `aria-describedby` ; `null` évite d'annoncer une description vide. */
  protected motifBlocageId(commande: CommandeResponse): string | null {
    return this.motifBlocage(commande) === null ? null : `commande-${commande.id}-paiement-requis`;
  }

  /** Valeur absente : un seul signe, jamais une case vide ni « null » (§30). */
  protected ouValeurAbsente(valeur: string | null): string {
    return valeur ?? '—';
  }

  protected succesPour(commande: CommandeResponse): string | null {
    const succes = this.succes();
    return succes !== null && succes.id === commande.id ? succes.message : null;
  }

  protected refusPour(commande: CommandeResponse): string | null {
    const refus = this.refus();
    return refus !== null && refus.id === commande.id ? refus.message : null;
  }

  protected libelleAccessible(commande: CommandeResponse, libelle: string): string {
    return `${libelle} — commande n° ${commande.id}`;
  }

  protected enCoursPour(commande: CommandeResponse): boolean {
    return this.commandeEnCours() === commande.id;
  }
}
