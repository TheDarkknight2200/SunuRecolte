import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionUtilisateur } from '../modeles/auth.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const API = 'http://localhost:8080/api';

const SESSION_PRODUCTEUR: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

function fabriquerJeton(expirationSecondes: number): string {
  const charge = { sub: '7', exp: expirationSecondes };
  const base64 = btoa(JSON.stringify(charge))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

describe('authInterceptor', () => {
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
    http = TestBed.inject(HttpTestingController);
  }

  /** Session stockée avant le démarrage : le service la relit au constructeur. */
  function ouvrirSession(role: SessionUtilisateur['role'] = 'PRODUCTEUR'): string {
    const jeton = fabriquerJeton(dansUneHeure());
    localStorage.setItem(CLE_JETON, jeton);
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify({ ...SESSION_PRODUCTEUR, role }));
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

  it('ajoute l’en-tête Authorization « Bearer » quand un jeton est présent', () => {
    const jeton = ouvrirSession();

    TestBed.inject(HttpClient).get(`${API}/utilisateurs/7`).subscribe();

    const requete = http.expectOne(`${API}/utilisateurs/7`);
    expect(requete.request.headers.get('Authorization')).toBe(`Bearer ${jeton}`);
  });

  it('n’ajoute aucun en-tête Authorization sans jeton', () => {
    TestBed.inject(HttpClient).get(`${API}/recoltes`).subscribe();

    const requete = http.expectOne(`${API}/recoltes`);
    expect(requete.request.headers.has('Authorization')).toBe(false);
  });

  it('401 sur une route protégée : purge la session et redirige vers la connexion', () => {
    ouvrirSession();
    const auth = TestBed.inject(AuthService);
    let statut = 0;

    TestBed.inject(HttpClient)
      .get(`${API}/utilisateurs/7`)
      .subscribe({ error: (erreur: HttpErrorResponse) => (statut = erreur.status) });

    http
      .expectOne(`${API}/utilisateurs/7`)
      .flush(
        { statut: 401, message: 'Authentification requise.', timestamp: '2026-01-01T10:00:00' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(statut).toBe(401);
    expect(auth.estConnecte()).toBe(false);
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
    expect(routeurFactice.navigate).toHaveBeenCalledWith(['/connexion'], {
      queryParams: { sessionExpiree: '1' },
    });
  });

  it('401 sur la connexion : ni purge ni redirection (identifiants refusés, pas session expirée)', () => {
    let statut = 0;

    TestBed.inject(HttpClient)
      .post(`${API}/auth/connexion`, { email: 'awa.diop@example.sn', motDePasse: 'mauvais' })
      .subscribe({ error: (erreur: HttpErrorResponse) => (statut = erreur.status) });

    http
      .expectOne(`${API}/auth/connexion`)
      .flush(
        { statut: 401, message: 'Email ou mot de passe incorrect.', timestamp: '2026-01-01T10:00:00' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(statut).toBe(401);
    expect(routeurFactice.navigate).not.toHaveBeenCalled();
  });

  it('403 : conserve la session, ne redirige pas et propage le refus', () => {
    ouvrirSession();
    const auth = TestBed.inject(AuthService);
    let statut = 0;

    TestBed.inject(HttpClient)
      .get(`${API}/utilisateurs/1`)
      .subscribe({ error: (erreur: HttpErrorResponse) => (statut = erreur.status) });

    http
      .expectOne(`${API}/utilisateurs/1`)
      .flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette action.",
          timestamp: '2026-01-01T10:00:00',
        },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(statut).toBe(403);
    expect(auth.estConnecte()).toBe(true);
    expect(auth.jeton()).not.toBeNull();
    expect(routeurFactice.navigate).not.toHaveBeenCalled();
  });
});
