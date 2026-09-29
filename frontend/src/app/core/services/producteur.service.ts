import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProducteurResponse } from '../modeles/domaine.modeles';

/**
 * Profil du producteur connecté (GET /api/producteurs/moi).
 * Le backend déduit le producteur du jeton : aucun identifiant n'est envoyé
 * ni reçu en paramètre, et le frontend ne lit jamais l'identité dans le
 * stockage local. Cet `id` est la seule source du `producteurId` des formulaires.
 */
@Injectable({ providedIn: 'root' })
export class ProducteurService {
  private readonly http = inject(HttpClient);

  moi(): Observable<ProducteurResponse> {
    return this.http.get<ProducteurResponse>(`${environment.apiUrl}/producteurs/moi`);
  }
}
