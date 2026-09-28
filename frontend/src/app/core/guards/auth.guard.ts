import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Exige une session locale valide (jeton présent et non expiré).
 * En cas de refus : redirection vers la connexion, avec mémorisation de la
 * cible pour y revenir après authentification.
 */
export const authGuard: CanActivateFn = (_route, etat) => {
  const auth = inject(AuthService);
  const routeur = inject(Router);

  if (auth.sessionValide()) {
    return true;
  }
  return routeur.createUrlTree(['/connexion'], { queryParams: { retour: etat.url } });
};
