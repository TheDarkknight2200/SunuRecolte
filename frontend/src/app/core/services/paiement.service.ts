import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaiementRequest, PaiementResponse } from '../modeles/domaine.modeles';

/**
 * Paiement **simulé** de l'acheteur. Aucune transaction réelle n'est effectuée et
 * aucun appel n'est fait vers Wave ou Orange Money : tout passe par l'API de
 * l'application, qui écrit une référence de simulation (`SIMU-…`).
 *
 * Deux méthodes, celles dont l'écran a besoin : `POST /api/paiements` et
 * `GET /api/paiements/commande/{commandeId}`. `GET /api/paiements/{id}` existe
 * côté backend mais n'est utilisé par aucun écran, donc pas par ce service.
 *
 * Le service ne calcule et ne décide rien : le montant est repris du total de la
 * commande par le serveur, qui est aussi le seul à choisir le statut renvoyé.
 */
@Injectable({ providedIn: 'root' })
export class PaiementService {
  private readonly http = inject(HttpClient);

  /**
   * Enregistre l'intention de paiement d'une commande. Le corps est exactement le DTO
   * Java (`commandeId` et `moyenPaiement`) : **aucun `acheteurId`**, l'identité est portée
   * par le jeton, et le serveur refuse (403) si la commande n'appartient pas au titulaire.
   *
   * Réponse réelle du backend : `201` avec un paiement `REUSSI`, une date de confirmation
   * horodatée par le serveur et une référence `SIMU-…`. La réussite fait partie de la
   * simulation (`PaiementService.appliquerLaReussiteSimulee`, seule écriture de `REUSSI`) :
   * aucune transaction réelle n'est effectuée et aucun opérateur de paiement n'est appelé.
   * À l'annulation de la commande liée, ce statut devient `REMBOURSE` ; `ECHOUE` est dans
   * l'enum sans qu'aucun chemin d'API l'écrive aujourd'hui.
   */
  simuler(requete: PaiementRequest): Observable<PaiementResponse> {
    return this.http.post<PaiementResponse>(`${environment.apiUrl}/paiements`, requete);
  }

  /**
   * Paiement déjà enregistré pour cette commande (`@OneToOne` : un seul par commande).
   * Le backend répond **404** — « Aucun paiement n'existe pour la commande : {id} » —
   * quand aucun paiement n'a encore été initié : ce 404 est une information, pas un échec.
   */
  parCommande(commandeId: number): Observable<PaiementResponse> {
    return this.http.get<PaiementResponse>(`${environment.apiUrl}/paiements/commande/${commandeId}`);
  }
}
