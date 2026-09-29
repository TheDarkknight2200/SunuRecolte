import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ModifierProfilProducteurRequest, ProducteurResponse } from '../modeles/domaine.modeles';

/**
 * Profil du producteur connecté.
 * `moi()` (GET /api/producteurs/moi) n'envoie aucun identifiant : le backend déduit
 * le producteur du jeton, et le frontend ne lit jamais l'identité dans le stockage
 * local. Cet `id` lu dans la réponse reste la seule source du `producteurId` des
 * formulaires de récolte ; la mise à jour du profil, elle, ne cible rien du tout.
 */
@Injectable({ providedIn: 'root' })
export class ProducteurService {
  private readonly http = inject(HttpClient);

  moi(): Observable<ProducteurResponse> {
    return this.http.get<ProducteurResponse>(`${environment.apiUrl}/producteurs/moi`);
  }

  /**
   * PUT /api/producteurs/moi — réponse 200 avec le profil complet et à jour.
   * Aucun identifiant n'est envoyé : le serveur modifie le producteur porté par le jeton,
   * ce qui rend le compte d'un autre producteur inatteignable. Les sept champs doivent être
   * présents à chaque appel, le service Java réécrivant le compte et l'exploitation sans
   * partielle (FRONTEND_DESIGN.md §36).
   */
  modifierMonProfil(requete: ModifierProfilProducteurRequest): Observable<ProducteurResponse> {
    return this.http.put<ProducteurResponse>(
      `${environment.apiUrl}/producteurs/moi`,
      requete,
    );
  }
}
