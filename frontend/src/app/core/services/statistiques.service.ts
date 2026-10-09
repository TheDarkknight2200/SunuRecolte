import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StatistiquesProducteurResponse } from '../modeles/domaine.modeles';
import { PeriodeStatistique } from '../modeles/referentiels';

/**
 * Statistiques de vente du producteur connecté (lot STAT-1).
 *
 * Un seul endpoint, en lecture seule : `GET /api/producteurs/moi/statistiques`. Aucun
 * identifiant de producteur n'est envoyé — le backend lit le profil sur le jeton, et un
 * `producteurId` en paramètre est ignoré par le serveur. Le jeton lui-même est ajouté par
 * `authInterceptor` : ce service ne touche aucune donnée d'authentification.
 *
 * `periode` est facultatif côté Java : absent, le serveur applique 30 jours. Il refuse toute
 * autre valeur que `7j`, `30j`, `mois` par un 400 dont le message est déjà en français.
 */
@Injectable({ providedIn: 'root' })
export class StatistiquesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/producteurs/moi/statistiques`;

  lister(periode?: PeriodeStatistique): Observable<StatistiquesProducteurResponse> {
    let parametres = new HttpParams();
    if (periode) {
      parametres = parametres.set('periode', periode);
    }
    return this.http.get<StatistiquesProducteurResponse>(this.url, { params: parametres });
  }
}
