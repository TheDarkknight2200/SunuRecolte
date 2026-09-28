import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../modeles/referentiels';
import { AuthService } from '../services/auth.service';

/**
 * Exige un rôle autorisé, déclaré dans « data.roles » de la route.
 * Toujours chaîné après authGuard. Le refus mène à la page d'accès refusé,
 * sans déconnexion : l'utilisateur reste authentifié.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const routeur = inject(Router);

  const rolesAutorises = (route.data['roles'] as readonly Role[] | undefined) ?? [];
  const role = auth.role();

  if (role !== null && rolesAutorises.includes(role)) {
    return true;
  }
  return routeur.createUrlTree(['/acces-interdit']);
};
