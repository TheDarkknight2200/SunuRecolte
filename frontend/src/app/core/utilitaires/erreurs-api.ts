import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ErreurApi } from '../modeles/erreur.modeles';

/**
 * Message compréhensible pour l'utilisateur à partir d'une erreur HTTP.
 * Seul le « message » du backend est repris : jamais de trace technique,
 * de détail Spring, de requête SQL ni de jeton (FRONTEND_DESIGN.md §16).
 */
export function messageErreurApi(erreur: unknown, messageParDefaut: string): string {
  if (erreur instanceof HttpErrorResponse) {
    if (estErreurApi(erreur.error)) {
      return erreur.error.message;
    }
    if (erreur.status === 0) {
      return 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.';
    }
  }
  return messageParDefaut;
}

/** Messages de validation renvoyés par champ (objet « erreurs » du backend). */
export function erreursParChamp(erreur: unknown): Record<string, string> {
  if (erreur instanceof HttpErrorResponse && estErreurApi(erreur.error)) {
    return erreur.error.erreurs ?? {};
  }
  return {};
}

function estErreurApi(valeur: unknown): valeur is ErreurApi {
  if (typeof valeur !== 'object' || valeur === null) {
    return false;
  }
  return typeof (valeur as { message?: unknown }).message === 'string';
}
