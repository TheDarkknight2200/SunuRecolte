import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse, SessionUtilisateur } from '../modeles/auth.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from './auth.service';

const API_AUTH = 'http://localhost:8080/api/auth';

const REPONSE_CONNEXION: AuthResponse = {
  token: 'jeton-de-test',
  utilisateurId: 7,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

const SESSION_ATTENDUE: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais le contenu du jeton réel. */
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

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it("n'est pas connecté au démarrage sans session stockée", () => {
    expect(service.estConnecte()).toBe(false);
    expect(service.jeton()).toBeNull();
    expect(service.session()).toBeNull();
    expect(service.role()).toBeNull();
  });

  it('connexion : envoie les identifiants puis enregistre le jeton et la session', () => {
    service
      .connexion({ email: 'awa.diop@example.sn', motDePasse: 'secret1' })
      .subscribe((reponse) => expect(reponse).toEqual(REPONSE_CONNEXION));

    const requete = http.expectOne(`${API_AUTH}/connexion`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({
      email: 'awa.diop@example.sn',
      motDePasse: 'secret1',
    });

    requete.flush(REPONSE_CONNEXION);

    expect(service.estConnecte()).toBe(true);
    expect(service.jeton()).toBe('jeton-de-test');
    expect(service.session()).toEqual(SESSION_ATTENDUE);
    expect(service.role()).toBe('PRODUCTEUR');
    expect(localStorage.getItem(CLE_JETON)).toBe('jeton-de-test');
    expect(JSON.parse(localStorage.getItem(CLE_UTILISATEUR) ?? 'null')).toEqual(SESSION_ATTENDUE);
  });

  it('inscription : envoie le contrat exact du backend et ouvre la session', () => {
    service
      .inscription({
        nom: 'Diop',
        prenom: 'Awa',
        email: 'awa.diop@example.sn',
        telephone: '770000000',
        motDePasse: 'secret1',
        role: 'PRODUCTEUR',
        filiere: 'MARAICHAGE',
      })
      .subscribe();

    const requete = http.expectOne(`${API_AUTH}/inscription`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({
      nom: 'Diop',
      prenom: 'Awa',
      email: 'awa.diop@example.sn',
      telephone: '770000000',
      motDePasse: 'secret1',
      role: 'PRODUCTEUR',
      filiere: 'MARAICHAGE',
    });

    requete.flush(REPONSE_CONNEXION);

    expect(service.estConnecte()).toBe(true);
    expect(localStorage.getItem(CLE_JETON)).toBe('jeton-de-test');
  });

  it('erreur 401 : propage le message du backend sans enregistrer de session', () => {
    let statut = 0;

    service.connexion({ email: 'awa.diop@example.sn', motDePasse: 'mauvais' }).subscribe({
      error: (erreur: HttpErrorResponse) => {
        statut = erreur.status;
      },
    });

    http
      .expectOne(`${API_AUTH}/connexion`)
      .flush(
        { statut: 401, message: 'Email ou mot de passe incorrect.', timestamp: '2026-01-01T10:00:00' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(statut).toBe(401);
    expect(service.estConnecte()).toBe(false);
    expect(service.jeton()).toBeNull();
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).toBeNull();
  });

  it('déconnexion : supprime le jeton et la session, en mémoire comme dans le stockage', () => {
    localStorage.setItem(CLE_JETON, 'jeton-de-test');
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ATTENDUE));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const serviceRecharge = TestBed.inject(AuthService);
    expect(serviceRecharge.estConnecte()).toBe(true);

    serviceRecharge.deconnexion();

    expect(serviceRecharge.estConnecte()).toBe(false);
    expect(serviceRecharge.jeton()).toBeNull();
    expect(serviceRecharge.session()).toBeNull();
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).toBeNull();
    http = TestBed.inject(HttpTestingController);
  });

  /** Recrée le service à partir de ce que contient le stockage local. */
  function serviceRecharge(): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  it('mettreAJourIdentite : rafraîchit le nom affiché, jamais le rôle, l’identifiant ni le jeton', () => {
    localStorage.setItem(CLE_JETON, 'jeton-de-test');
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ATTENDUE));

    const recharge = serviceRecharge();
    recharge.mettreAJourIdentite({ nom: 'Fall', prenom: 'Moussa', email: 'moussa.fall@example.sn' });

    expect(recharge.session()).toEqual({
      utilisateurId: 7,
      nom: 'Fall',
      prenom: 'Moussa',
      email: 'moussa.fall@example.sn',
      role: 'PRODUCTEUR',
    });
    expect(recharge.role()).toBe('PRODUCTEUR');
    expect(JSON.parse(localStorage.getItem(CLE_UTILISATEUR) ?? 'null')).toEqual(recharge.session());
    expect(recharge.jeton()).toBe('jeton-de-test');
    expect(localStorage.getItem(CLE_JETON)).toBe('jeton-de-test');
    // La session de référence n'est pas modifiée : l'objet renvoyé est une copie.
    expect(SESSION_ATTENDUE.nom).toBe('Diop');
  });

  it('mettreAJourIdentite sans session : n’invente aucune connexion locale', () => {
    service.mettreAJourIdentite({ nom: 'Fall', prenom: 'Moussa', email: 'moussa@example.sn' });

    expect(service.estConnecte()).toBe(false);
    expect(service.session()).toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).toBeNull();
  });

  it('récupération du jeton : restitue le jeton stocké et signale un jeton expiré', () => {
    localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ATTENDUE));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const serviceRecharge = TestBed.inject(AuthService);

    expect(serviceRecharge.jeton()).not.toBeNull();
    expect(serviceRecharge.sessionValide()).toBe(true);

    localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) - 60));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const serviceExpire = TestBed.inject(AuthService);
    expect(serviceExpire.sessionValide()).toBe(false);
    expect(serviceExpire.jeton()).toBeNull();
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
    http = TestBed.inject(HttpTestingController);
  });
});
