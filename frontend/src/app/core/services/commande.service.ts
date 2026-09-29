import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CommandeRequest,
  CommandeResponse,
  StatutCommandeRequest,
} from '../modeles/domaine.modeles';
import { StatutCommande } from '../modeles/referentiels';

/**
 * Commandes de l'application : `POST`, `GET`, `GET/{id}` et `PATCH/{id}/statut` de
 * `/api/commandes`. Le service ne calcule rien et ne décide rien : prix unitaire,
 * sous-totaux, total, stock et statut sont établis par `CommandeService` côté serveur.
 *
 * Le périmètre est volontairement limité à la consultation et à l'annulation :
 * ni paiement, ni notification, ni pilotage du cycle de vie par un acheteur.
 */
@Injectable({ providedIn: 'root' })
export class CommandeService {
  private readonly http = inject(HttpClient);

  /**
   * `acheteurId` est exigé par le DTO Java (`@NotNull`) : il vient de
   * GET /api/acheteurs/moi, jamais d'une saisie. Le serveur vérifie que le titulaire
   * du jeton est bien cet acheteur (403 sinon), puis garde l'identité du jeton.
   */
  creer(requete: CommandeRequest): Observable<CommandeResponse> {
    return this.http.post<CommandeResponse>(`${environment.apiUrl}/commandes`, requete);
  }

  /**
   * Commandes du titulaire du jeton, triées par date décroissante par le serveur.
   * Aucun `acheteurId` n'est envoyé : la requête est déjà portée par le JWT, et le
   * serveur refuserait (403) un identifiant qui ne serait pas celui du jeton.
   */
  lister(): Observable<CommandeResponse[]> {
    return this.http.get<CommandeResponse[]>(`${environment.apiUrl}/commandes`);
  }

  /** Détail d'une commande : 404 si inconnue, 403 si le titulaire n'est pas partie prenante. */
  findById(id: number): Observable<CommandeResponse> {
    return this.http.get<CommandeResponse>(`${environment.apiUrl}/commandes/${id}`);
  }

  /**
   * Demande de changement de statut. Le corps n'a qu'une clé, `statut`, comme le DTO
   * Java : la légalité de la transition est vérifiée par le serveur, qui renvoie la
   * commande réelle — le frontend ne remplace jamais un statut localement.
   */
  changerStatut(id: number, statut: StatutCommande): Observable<CommandeResponse> {
    const corps: StatutCommandeRequest = { statut };
    return this.http.patch<CommandeResponse>(
      `${environment.apiUrl}/commandes/${id}/statut`,
      corps,
    );
  }
}
