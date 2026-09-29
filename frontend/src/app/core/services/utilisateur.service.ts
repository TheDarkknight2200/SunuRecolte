import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ModifierActifRequest, UtilisateurResponse } from '../modeles/domaine.modeles';
import { Role } from '../modeles/referentiels';

/**
 * Comptes utilisateurs, côté administration.
 * `lister` et `changerActif` sont réservées à l'ADMIN côté backend (403 pour les autres
 * rôles, 401 sans jeton) : le frontend n'ajoute aucune règle de sécurité, il présente la
 * réponse du serveur. `findById` reste ouvert au titulaire du compte.
 */
@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/utilisateurs`;

  /** GET /api/utilisateurs — liste triée par création décroissante, filtrable par rôle. */
  lister(role?: Role): Observable<UtilisateurResponse[]> {
    let parametres = new HttpParams();
    if (role) {
      parametres = parametres.set('role', role);
    }
    return this.http.get<UtilisateurResponse[]>(this.url, { params: parametres });
  }

  /** GET /api/utilisateurs/{id} — route protégée par jeton. */
  findById(id: number): Observable<UtilisateurResponse> {
    return this.http.get<UtilisateurResponse>(`${this.url}/${id}`);
  }

  /**
   * PATCH /api/utilisateurs/{id}/actif — le corps ne porte que `actif` ; l'identifiant
   * de la cible est dans l'URL. Une désactivation rend le jeton déjà émis inutilisable
   * à la requête suivante (le filtre JWT recharge le compte en base).
   */
  changerActif(id: number, actif: boolean): Observable<UtilisateurResponse> {
    const requete: ModifierActifRequest = { actif };
    return this.http.patch<UtilisateurResponse>(`${this.url}/${id}/actif`, requete);
  }
}
