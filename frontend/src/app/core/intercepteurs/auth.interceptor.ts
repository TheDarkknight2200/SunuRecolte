import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Ajoute le jeton JWT aux requêtes sortantes et traite les refus du backend
 * (FRONTEND_DESIGN.md §19) :
 * - 401 : jeton absent, invalide ou expiré → purge de la session locale, puis
 *   redirection vers /connexion ;
 * - 403 : utilisateur authentifié mais sans les droits → aucune déconnexion,
 *   l'écran concerné affiche le refus (un 403 n'est jamais transformé en 401).
 */
export const authInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const auth = inject(AuthService);
  const routeur = inject(Router);

  const jeton = auth.jeton();
  const requeteAuthentifiee = jeton
    ? requete.clone({ setHeaders: { Authorization: `Bearer ${jeton}` } })
    : requete;

  return suivant(requeteAuthentifiee).pipe(
    catchError((erreur: unknown) => {
      if (
        erreur instanceof HttpErrorResponse &&
        erreur.status === 401 &&
        !estRouteAuthentification(requete.url)
      ) {
        auth.purgerSession();
        void routeur.navigate(['/connexion'], { queryParams: { sessionExpiree: '1' } });
      }
      return throwError(() => erreur);
    }),
  );
};

/**
 * Les endpoints d'inscription et de connexion répondent 401 sur identifiants
 * erronés : ce n'est pas une session expirée, il n'y a donc ni purge ni redirection.
 */
function estRouteAuthentification(url: string): boolean {
  return url.includes('/auth/');
}
