import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionUtilisateur } from '../modeles/auth.modeles';
import { RecolteRequest, RecolteResponse } from '../modeles/domaine.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from './auth.service';
import { authInterceptor } from '../intercepteurs/auth.interceptor';
import { messageErreurApi } from '../utilitaires/erreurs-api';
import { RecolteService } from './recolte.service';

const API = 'http://localhost:8080/api';
const RECOLTES = `${API}/recoltes`;

const RECOLTE: RecolteResponse = {
  id: 12,
  producteurId: 4,
  nomProducteur: 'Awa Diop',
  localisationProducteur: 'Rufisque',
  produit: 'Tomate',
  description: null,
  quantiteDisponible: 500,
  quantiteMin: 10,
  quantiteMax: null,
  unite: 'kg',
  prixUnitaire: 250,
  imageUrl: null,
  localisation: null,
  dateDisponibilite: null,
  statut: 'DISPONIBLE',
  dateCreation: '2026-09-28T10:15:00',
};

const REQUETE: RecolteRequest = {
  producteurId: 4,
  produit: 'Tomate',
  description: 'Tomates de saison',
  quantiteDisponible: 500,
  quantiteMin: 10,
  quantiteMax: 200,
  unite: 'kg',
  prixUnitaire: 250,
  imageUrl: null,
  localisation: 'Rufisque',
  dateDisponibilite: '2026-10-05',
};

const SESSION_PRODUCTEUR: SessionUtilisateur = {
  utilisateurId: 4,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '4', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

describe('RecolteService', () => {
  let service: RecolteService;
  let http: HttpTestingController;
  const routeurFactice = { navigate: vi.fn().mockResolvedValue(true) };

  function configurer(): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routeurFactice },
      ],
    });
    service = TestBed.inject(RecolteService);
    http = TestBed.inject(HttpTestingController);
  }

  /** Session déjà ouverte : sert à vérifier qu'un refus ne purge pas le jeton. */
  function ouvrirSession(): string {
    const jeton = fabriquerJeton(dansUneHeure());
    localStorage.setItem(CLE_JETON, jeton);
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_PRODUCTEUR));
    TestBed.resetTestingModule();
    configurer();
    return jeton;
  }

  beforeEach(() => {
    localStorage.clear();
    routeurFactice.navigate.mockClear();
    configurer();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('lister : GET /api/recoltes sans aucun paramètre quand aucun critère n’est donné', () => {
    let resultat: RecolteResponse[] = [];

    service.lister().subscribe((recoltes) => (resultat = recoltes));

    const requete = http.expectOne((req) => req.url === RECOLTES && req.method === 'GET');
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush([RECOLTE]);

    expect(resultat).toEqual([RECOLTE]);
  });

  it('lister : envoie exactement statut, filiere et recherche', () => {
    service
      .lister({ statut: 'DISPONIBLE', filiere: 'CEREALES', recherche: 'milde' })
      .subscribe();

    const requete = http.expectOne(
      `${RECOLTES}?statut=DISPONIBLE&filiere=CEREALES&recherche=milde`,
    );
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.get('statut')).toBe('DISPONIBLE');
    expect(requete.request.params.get('filiere')).toBe('CEREALES');
    expect(requete.request.params.get('recherche')).toBe('milde');
    requete.flush([]);
  });

  it('findById : GET /api/recoltes/{id}', () => {
    let resultat: RecolteResponse | undefined;

    service.findById(12).subscribe((recolte) => (resultat = recolte));

    const requete = http.expectOne(`${RECOLTES}/12`);
    expect(requete.request.method).toBe('GET');
    requete.flush(RECOLTE);

    expect(resultat).toEqual(RECOLTE);
  });

  it('mesRecoltes : GET /api/recoltes/mes-recoltes avec statut et recherche, sans producteurId', () => {
    service.mesRecoltes({ statut: 'EPUISEE', recherche: 'mouton' }).subscribe();

    const requete = http.expectOne(`${RECOLTES}/mes-recoltes?statut=EPUISEE&recherche=mouton`);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.has('producteurId')).toBe(false);
    expect(requete.request.params.has('filiere')).toBe(false);
    requete.flush([RECOLTE]);
  });

  it('mesRecoltes : aucun paramètre quand aucun critère n’est donné', () => {
    service.mesRecoltes().subscribe();

    const requete = http.expectOne((req) => req.url === `${RECOLTES}/mes-recoltes`);
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush([]);
  });

  it('creer : POST /api/recoltes avec le contrat RecolteRequest, réponse 201', () => {
    let resultat: RecolteResponse | undefined;

    service.creer(REQUETE).subscribe((recolte) => (resultat = recolte));

    const requete = http.expectOne(RECOLTES);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(REQUETE);
    requete.flush(RECOLTE, { status: 201, statusText: 'Created' });

    expect(resultat).toEqual(RECOLTE);
  });

  it('modifier : PUT /api/recoltes/{id} avec le contrat RecolteRequest', () => {
    let resultat: RecolteResponse | undefined;

    service.modifier(12, REQUETE).subscribe((recolte) => (resultat = recolte));

    const requete = http.expectOne(`${RECOLTES}/12`);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toEqual(REQUETE);
    requete.flush(RECOLTE);

    expect(resultat).toEqual(RECOLTE);
  });

  it('supprimer : DELETE /api/recoltes/{id} et réponse 204 sans corps', () => {
    let terminez = false;
    let statut = 0;

    service.supprimer(12).subscribe({
      next: () => (terminez = true),
      error: (erreur: HttpErrorResponse) => (statut = erreur.status),
    });

    const requete = http.expectOne(`${RECOLTES}/12`);
    expect(requete.request.method).toBe('DELETE');
    requete.flush(null, { status: 204, statusText: 'No Content' });

    expect(statut).toBe(0);
    expect(terminez).toBe(true);
  });

  it('403 : le refus est propagé tel quel, sans purge ni redirection', () => {
    const jeton = ouvrirSession();
    const auth = TestBed.inject(AuthService);
    let erreurRecue: unknown;

    service.mesRecoltes().subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${RECOLTES}/mes-recoltes`)
      .flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
          timestamp: '2026-01-01T10:00:00',
        },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(erreurRecue).toBeInstanceOf(HttpErrorResponse);
    expect((erreurRecue as HttpErrorResponse).status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'Refus inattendu.')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
    expect(auth.estConnecte()).toBe(true);
    expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
    expect(routeurFactice.navigate).not.toHaveBeenCalled();
  });

  it('404 : reste une 404 avec le message du backend, jamais convertie en 401', () => {
    const jeton = ouvrirSession();
    let erreurRecue: unknown;

    service.findById(999_999).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${RECOLTES}/999999`)
      .flush(
        {
          statut: 404,
          message: "Recolte introuvable avec l'id : 999999",
          timestamp: '2026-01-01T10:00:00',
        },
        { status: 404, statusText: 'Not Found' },
      );

    expect((erreurRecue as HttpErrorResponse).status).toBe(404);
    expect(messageErreurApi(erreurRecue, 'Récolte introuvable.')).toBe(
      "Recolte introuvable avec l'id : 999999",
    );
    expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
    expect(routeurFactice.navigate).not.toHaveBeenCalled();
  });
});
