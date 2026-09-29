import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LIBELLES_ROLE } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PanierService } from '../../core/services/panier.service';
import { espaceParRole } from '../../core/utilitaires/navigation';

/** En-tête unique de l'application (FRONTEND_DESIGN.md §10.5). */
@Component({
  selector: 'app-en-tete',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './en-tete.html',
  styleUrl: './en-tete.scss',
})
export class EnTete {
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);
  private readonly notifications = inject(NotificationService);
  private readonly routeur = inject(Router);

  protected readonly session = this.auth.session;

  protected readonly libelleRole = computed(() => {
    const role = this.session()?.role;
    return role ? LIBELLES_ROLE[role] : '';
  });

  protected readonly lienEspace = computed(() => {
    const role = this.session()?.role;
    return role ? espaceParRole(role) : '/tableau-de-bord';
  });

  protected readonly libelleEspace = computed(() => {
    switch (this.session()?.role) {
      case 'PRODUCTEUR':
        return 'Mes récoltes';
      case 'ACHETEUR':
        return 'Mes commandes';
      case 'ADMIN':
        return 'Administration';
      default:
        return 'Tableau de bord';
    }
  });

  /** Le panier ne concerne qu'un acheteur ; pour les autres rôles, rien n'est affiché. */
  protected readonly acheteur = computed(() => this.session()?.role === 'ACHETEUR');

  /**
   * Compteur de lignes du panier local (§25) : nombre d'articles du panier, jamais la
   * somme des quantités ni un total. Il vit dans le lien « Panier », le badge seul
   * restant non cliquable (§10.7).
   */
  protected readonly compteurPanier = computed(() => {
    const lignes = this.panier.lignes().length;
    return lignes > 99 ? '99+' : String(lignes);
  });

  /**
   * Compte dont l'en-tête a lui-même lu les notifications. Le badge n'est autorisé que pour
   * ce compte-là : une session qui change (déconnexion puis connexion d'un autre compte)
   * cache le compteur jusqu'à la réponse du serveur, au lieu de montrer un chiffre qui ne
   * serait pas le sien.
   */
  private readonly compteCharge = signal<number | null>(null);

  /**
   * **Compteur de notifications non lues** (§29) : calculé sur `GET /api/notifications`,
   * aucun endpoint de comptage n'existant côté backend. Il est lu une fois par session —
   * pas de polling, pas de minuteur — puis entretenu par l'écran `/notifications` lui-même,
   * qui partage le même service : marquer une notification comme lue met donc ce badge à jour.
   *
   * La requête n'est émise **que** pour une session locale utilisable : un appel sans jeton
   * répondrait 401, purgerait la session et relancerait une redirection (§19).
   */
  protected readonly compteurNotifications = computed(() => {
    const session = this.session();
    if (session === null || this.compteCharge() !== session.utilisateurId) {
      return null;
    }
    const nonLues = this.notifications.nonLues();
    if (nonLues === 0) {
      return null;
    }
    return nonLues > 99 ? '99+' : String(nonLues);
  });

  constructor() {
    effect(() => {
      const session = this.auth.session();
      this.compteCharge.set(null);
      if (session === null || !this.auth.sessionValide()) {
        return;
      }
      this.notifications.mesNotifications().subscribe({
        next: () => this.compteCharge.set(session.utilisateurId),
        // Un refus ou une panne laisse le compteur caché : l'en-tête ne déconnecte personne,
        // et l'écran de notifications garde son bouton « Actualiser ».
        error: () => this.compteCharge.set(null),
      });
    });
  }

  protected seDeconnecter(): void {
    this.auth.deconnexion();
    void this.routeur.navigate(['/']);
  }
}
