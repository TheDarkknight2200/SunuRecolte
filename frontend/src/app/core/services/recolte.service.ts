import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Filiere, StatutRecolte } from '../modeles/referentiels';
import { RecolteRequest, RecolteResponse, StatutRecolteRequest } from '../modeles/domaine.modeles';

/** Filtres acceptés par GET /api/recoltes (catalogue public). */
export interface CriteresRechercheRecolte {
  statut?: StatutRecolte;
  filiere?: Filiere;
  recherche?: string;
}

/** Filtres acceptés par GET /api/recoltes/mes-recoltes : le backend n'expose pas `filiere` ici. */
export interface CriteresRecoltePerso {
  statut?: StatutRecolte;
  recherche?: string;
}

/**
 * Consultation et gestion des récoltes.
 * Le jeton est ajouté par l'intercepteur (`authInterceptor`) : ce service ne
 * manipule aucune donnée d'authentification, et n'envoie jamais d'identifiant
 * de producteur pour « mes récoltes » — le backend le déduit du jeton.
 */
@Injectable({ providedIn: 'root' })
export class RecolteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recoltes`;

  /** GET /api/recoltes — paramètres facultatifs identiques à ceux du backend. */
  lister(criteres: CriteresRechercheRecolte = {}): Observable<RecolteResponse[]> {
    return this.http.get<RecolteResponse[]>(this.url, {
      params: this.versParametres(criteres),
    });
  }

  /** GET /api/recoltes/mes-recoltes — récoltes du producteur connecté. */
  mesRecoltes(criteres: CriteresRecoltePerso = {}): Observable<RecolteResponse[]> {
    return this.http.get<RecolteResponse[]>(`${this.url}/mes-recoltes`, {
      params: this.versParametres(criteres),
    });
  }

  /** GET /api/recoltes/{id} */
  findById(id: number): Observable<RecolteResponse> {
    return this.http.get<RecolteResponse>(`${this.url}/${id}`);
  }

  /** POST /api/recoltes — réponse 201 avec la récolte créée. */
  creer(requete: RecolteRequest): Observable<RecolteResponse> {
    return this.http.post<RecolteResponse>(this.url, requete);
  }

  /** PUT /api/recoltes/{id} — réponse 200 avec la récolte mise à jour. */
  modifier(id: number, requete: RecolteRequest): Observable<RecolteResponse> {
    return this.http.put<RecolteResponse>(`${this.url}/${id}`, requete);
  }

  /** DELETE /api/recoltes/{id} — réponse 204, sans corps. */
  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /**
   * PATCH /api/recoltes/{id}/statut — modération réservée à l'ADMIN (403 pour un
   * producteur, même propriétaire). `statut` n'existe pas dans RecolteRequest : la
   * modération ne passe jamais par une création ni par une modification.
   */
  changerStatut(id: number, statut: StatutRecolte): Observable<RecolteResponse> {
    const requete: StatutRecolteRequest = { statut };
    return this.http.patch<RecolteResponse>(`${this.url}/${id}/statut`, requete);
  }

  private versParametres(criteres: CriteresRechercheRecolte): HttpParams {
    let parametres = new HttpParams();
    if (criteres.statut) {
      parametres = parametres.set('statut', criteres.statut);
    }
    if (criteres.filiere) {
      parametres = parametres.set('filiere', criteres.filiere);
    }
    if (criteres.recherche) {
      parametres = parametres.set('recherche', criteres.recherche);
    }
    return parametres;
  }
}
