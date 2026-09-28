import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LIBELLES_ROLE } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
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

  protected seDeconnecter(): void {
    this.auth.deconnexion();
    void this.routeur.navigate(['/']);
  }
}
