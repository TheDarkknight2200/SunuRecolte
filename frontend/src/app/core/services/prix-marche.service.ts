import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PrixMarcheRequest, PrixMarcheResponse } from '../modeles/domaine.modeles';

/**
 * Prix indicatifs de marché.
 * La lecture (les deux GET) est publique côté backend ; les trois écritures sont
 * réservées à l'ADMIN (403 sinon, 401 sans jeton). `dateMiseAJour` n'est jamais envoyé :
 * l'entité Java le remplit elle-même à chaque enregistrement.
 */
@Injectable({ providedIn: 'root' })
export class PrixMarcheService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/prix-marche`;

  /** GET /api/prix-marche — liste publique, triée par produit croissant. */
  lister(): Observable<PrixMarcheResponse[]> {
    return this.http.get<PrixMarcheResponse[]>(this.url);
  }

  /** GET /api/prix-marche/{id} — réponse 404 `{"statut", "message", "timestamp"}` si inconnu. */
  findById(id: number): Observable<PrixMarcheResponse> {
    return this.http.get<PrixMarcheResponse>(`${this.url}/${id}`);
  }

  /** POST /api/prix-marche — réponse 201 avec la ligne créée (ADMIN). */
  creer(requete: PrixMarcheRequest): Observable<PrixMarcheResponse> {
    return this.http.post<PrixMarcheResponse>(this.url, requete);
  }

  /** PUT /api/prix-marche/{id} — réponse 200 avec la ligne modifiée (ADMIN). */
  modifier(id: number, requete: PrixMarcheRequest): Observable<PrixMarcheResponse> {
    return this.http.put<PrixMarcheResponse>(`${this.url}/${id}`, requete);
  }

  /** DELETE /api/prix-marche/{id} — réponse 204, sans corps (ADMIN). */
  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
