import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
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
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
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
 * acheteur, coordonnées de réception. Une commande ne reçoit qu'une seule action, celle que la
 * table du service autorise depuis son statut courant ; le statut rendu après un `PATCH` est celui
 * renvoyé par le serveur, jamais un statut écrit ici.
 */
@Component({
  selector: 'app-commandes-recues',
  imports: [RouterLink],
  templateUrl: './commandes-recues.html',
  styleUrl: './commandes-recues.scss',
})
export class CommandesRecues {
  private readonly commandes = inject(CommandeService);

  protected readonly liste = signal<CommandeResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Identifiant de la commande dont le `PATCH` est en vol : une seule requête à la fois. */
  protected readonly commandeEnCours = signal<number | null>(null);
  protected readonly succes = signal<{ id: number; message: string } | null>(null);
  protected readonly refus = signal<{ id: number; message: string } | null>(null);

  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  /** Le bouton disparaissant avec le statut terminal, le message de succès reçoit le focus. */
  private readonly zoneSucces = viewChild('zoneSucces', { read: ElementRef });
  private readonly focusSurSucces = signal(false);

  constructor() {
    this.charger();

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

  /** L'unique étape autorisée depuis ce statut, ou `null` : une action impossible n'est jamais affichée. */
  protected etapeDe(commande: CommandeResponse): { statut: StatutCommande; libelle: string } | null {
    return ETAPES_SUIVANTES[commande.statut] ?? null;
  }

  protected appliquerEtape(commande: CommandeResponse): void {
    const etape = this.etapeDe(commande);
    if (etape === null || this.commandeEnCours() !== null) {
      return;
    }

    this.commandeEnCours.set(commande.id);
    this.succes.set(null);
    this.refus.set(null);

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
        this.refus.set({
          id: commande.id,
          message: messageErreurApi(
            erreur,
            'Le statut de cette commande n’a pas pu être mis à jour.',
          ),
        });
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
