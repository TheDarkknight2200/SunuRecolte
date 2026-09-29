import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcheteurResponse } from '../modeles/domaine.modeles';

/**
 * Profil de l'acheteur connecté (GET /api/acheteurs/moi).
 * Le backend déduit l'acheteur du jeton : aucun identifiant ni rôle n'est envoyé
 * ni reçu en paramètre, et le frontend ne lit jamais l'identité dans le stockage
 * local. Cet `id` est la seule source du `acheteurId` des commandes.
 */
@Injectable({ providedIn: 'root' })
export class AcheteurService {
  private readonly http = inject(HttpClient);

  moi(): Observable<AcheteurResponse> {
    return this.http.get<AcheteurResponse>(`${environment.apiUrl}/acheteurs/moi`);
  }
}
