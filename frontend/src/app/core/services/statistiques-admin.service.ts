import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StatistiquesAdminResponse } from '../modeles/domaine.modeles';
import { PeriodeStatistique } from '../modeles/referentiels';

/**
 * Statistiques de la plateforme vues de l'administration (lot STAT-2).
 *
 * Un seul endpoint, en lecture seule : `GET /api/admin/statistiques`. Le backend n'accepte
 * aucun identifiant en paramètre — la période est le seul argument — et la portée transverse
 * des chiffres vient du rôle ADMIN vérifié sur le jeton. Le jeton lui-même est ajouté par
 * `authInterceptor` : ce service ne touche aucune donnée d'authentification.
 *
 * `periode` est facultatif côté Java : absent, le serveur applique 30 jours. Il refuse toute
 * autre valeur que `7j`, `30j`, `mois` par un 400 dont le message est déjà en français. Un 403
 * (rôle insuffisant) remonte le message du filtre de sécurité sans déconnexion : la route est
 * réservée à ADMIN par `roleGuard` comme par le backend.
 */
@Injectable({ providedIn: 'root' })
export class StatistiquesAdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/statistiques`;

  lister(periode?: PeriodeStatistique): Observable<StatistiquesAdminResponse> {
    let parametres = new HttpParams();
    if (periode) {
      parametres = parametres.set('periode', periode);
    }
    return this.http.get<StatistiquesAdminResponse>(this.url, { params: parametres });
  }
}
