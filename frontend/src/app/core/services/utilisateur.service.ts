import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UtilisateurResponse } from '../modeles/domaine.modeles';

/** Consultation d'un compte : réservée au titulaire ou à l'ADMIN (règle du backend). */
@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly http = inject(HttpClient);

  /** GET /api/utilisateurs/{id} — route protégée par jeton. */
  findById(id: number): Observable<UtilisateurResponse> {
    return this.http.get<UtilisateurResponse>(`${environment.apiUrl}/utilisateurs/${id}`);
  }
}
