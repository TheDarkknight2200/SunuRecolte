import { Component, inject, signal } from '@angular/core';
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
import { formaterDateHeure, formaterMontant } from '../../../core/utilitaires/formatage';

/**
 * Historique des commandes de l'acheteur connecté (GET /api/commandes).
 *
 * Le serveur filtre à partir du jeton et renvoie la liste triée par date décroissante :
 * aucun `acheteurId` n'est envoyé, aucun total n'est recalculé ici, aucun statut n'est
 * modifié depuis cette page. L'annulation est demandée sur le détail, là où le backend
 * l'autorise.
 */
@Component({
  selector: 'app-commandes',
  imports: [RouterLink],
  templateUrl: './commandes.html',
  styleUrl: './commandes.scss',
})
export class Commandes {
  private readonly commandes = inject(CommandeService);

  protected readonly liste = signal<CommandeResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.commandes.lister().subscribe({
      next: (commandes) => {
        this.liste.set(commandes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        // 403 comme 500 : le message du backend, sans déconnexion ni redirection.
        this.liste.set([]);
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger vos commandes.'));
        this.chargement.set(false);
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

  protected lignesDe(commande: CommandeResponse): string {
    const total = commande.lignes.length;
    return total === 1 ? '1 ligne' : `${total} lignes`;
  }

  protected lienDetail(commande: CommandeResponse): string[] {
    return ['/acheteur/commandes', String(commande.id)];
  }
}
