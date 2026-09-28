import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Filiere, StatutRecolte } from '../modeles/referentiels';
import { RecolteResponse } from '../modeles/domaine.modeles';

export interface CriteresRechercheRecolte {
  statut?: StatutRecolte;
  filiere?: Filiere;
  recherche?: string;
}

/** Consultation du catalogue de récoltes (routes publiques). */
@Injectable({ providedIn: 'root' })
export class RecolteService {
  private readonly http = inject(HttpClient);

  /** GET /api/recoltes — paramètres facultatifs identiques à ceux du backend. */
  lister(criteres: CriteresRechercheRecolte = {}): Observable<RecolteResponse[]> {
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
    return this.http.get<RecolteResponse[]>(`${environment.apiUrl}/recoltes`, {
      params: parametres,
    });
  }

  /** GET /api/recoltes/{id} */
  findById(id: number): Observable<RecolteResponse> {
    return this.http.get<RecolteResponse>(`${environment.apiUrl}/recoltes/${id}`);
  }
}
