import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LIBELLES_ROLE } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
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

  protected seDeconnecter(): void {
    this.auth.deconnexion();
    void this.routeur.navigate(['/']);
  }
}
