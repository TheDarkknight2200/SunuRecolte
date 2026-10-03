import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import { ActivatedRoute, provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionUtilisateur } from '../../core/modeles/auth.modeles';
import { UtilisateurResponse } from '../../core/modeles/domaine.modeles';
import { authInterceptor } from '../../core/intercepteurs/auth.interceptor';
import { CLE_JETON, CLE_UTILISATEUR } from '../../core/services/auth.service';
import { TableauDeBord } from './tableau-de-bord';

const API = 'http://localhost:8080/api';
const PROFIL_URL = `${API}/utilisateurs/9`;

/** L'identifiant demandé vient de la session, jamais d'une saisie du client. */
const SESSION: SessionUtilisateur = {
  utilisateurId: 9,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

function profil(partiels: Partial<UtilisateurResponse> = {}): UtilisateurResponse {
  return {
    id: 9,
    nom: 'Diop',
    prenom: 'Awa',
    email: 'awa.diop@example.sn',
    telephone: '770000000',
    role: 'PRODUCTEUR',
    dateCreation: '2026-09-20T08:15:00',
    actif: true,
    ...partiels,
  };
}

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '9', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function elements<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T[] {
  return Array.from(racine.querySelectorAll<T>(selecteur));
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('TableauDeBord', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<TableauDeBord>;
  let racine: HTMLElement;

  /**
   * Ouvre l'écran. `questions` porte les paramètres d'arrivée (dont `compteCree`) ;
   * `session` à `null` simule une session locale purgée.
   */
  function ouvrir(
    questions: Record<string, string> = {},
    session: SessionUtilisateur | null = SESSION,
  ): void {
    localStorage.clear();
    if (session !== null) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session));
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(questions) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TableauDeBord);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  /** L'unique requête de l'écran, Flushée avec le profil du serveur. */
  function chargerProfil(contenu: UtilisateurResponse = profil()): void {
    http.expectOne(PROFIL_URL).flush(contenu);
    fixture.detectChanges();
  }

  /** Jusqu'au bout : ouverture, réponse, rendu. */
  function ouvrirEtCharger(
    questions: Record<string, string> = {},
    contenu: UtilisateurResponse = profil(),
  ): void {
    ouvrir(questions);
    chargerProfil(contenu);
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('chargement du profil', () => {
    it('demande le profil du compte connecté, identifiant lu dans la session', () => {
      ouvrir();

      expect(http.expectOne(PROFIL_URL).request.method).toBe('GET');
      http.expectNone(`${API}/utilisateurs/1`);
    });

    it('rend l’état de chargement, sans carte, tant que la réponse n’est pas arrivée', () => {
      ouvrir();

      expect(texteDe(element(racine, '.etat'))).toBe('Chargement…');
      expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
      expect(racine.querySelector('.tableau-de-bord__carte')).toBeNull();

      // La requête reste ouverte pendant tout le test : on la solde sans nouveau rendu.
      http.expectOne(PROFIL_URL).flush(profil());
    });

    it('ne demande rien au serveur quand la session locale est absente', () => {
      ouvrir({}, null);

      http.expectNone(PROFIL_URL);
      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        "Votre session n'est plus valide. Reconnectez-vous.",
      );
      expect(racine.querySelector('.tableau-de-bord__carte')).toBeNull();
    });
  });

  describe('structure de l’écran', () => {
    it('loge la carte dans un unique conteneur centré, sur la carte globale', () => {
      ouvrirEtCharger();

      expect(elements(racine, '.tableau-de-bord > .conteneur')).toHaveLength(1);
      expect(racine.querySelector('.conteneur > .tableau-de-bord__carte')).not.toBeNull();
      expect(element(racine, '.tableau-de-bord__carte').classList.contains('carte')).toBe(true);
    });

    it('porte un seul titre d’écran et un seul titre de carte', () => {
      ouvrirEtCharger();

      expect(elements(racine, 'h1').map(texteDe)).toEqual(['Tableau de bord']);
      expect(elements(racine, '.tableau-de-bord h2').map(texteDe)).toEqual(['Mon profil']);
    });

    it('rend les états dans le même conteneur que la carte', () => {
      ouvrir();

      expect(racine.querySelector('.conteneur > .etat')).not.toBeNull();
      expect(racine.querySelector('.conteneur > .message--erreur')).toBeNull();

      http.expectOne(PROFIL_URL).flush(profil());
    });
  });

  describe('carte « Mon profil »', () => {
    it('rend les cinq champs de l’identité avec leurs libellés', () => {
      ouvrirEtCharger();

      const termes = elements<HTMLElement>(racine, '.tableau-de-bord__identite dt').map(texteDe);
      expect(termes).toEqual(['Nom', 'Adresse email', 'Téléphone', 'Rôle', 'Compte actif']);
      const valeurs = elements<HTMLElement>(racine, '.tableau-de-bord__identite dd').map(texteDe);
      expect(valeurs).toEqual(['Awa Diop', 'awa.diop@example.sn', '770000000', 'Producteur', 'Oui']);
    });

    it('lit le rôle depuis le profil du serveur, pas depuis la session', () => {
      ouvrirEtCharger({}, profil({ role: 'ACHETEUR' }));

      expect(texteDe(element(racine, '.tableau-de-bord__identite .badge'))).toBe('Acheteur');
    });

    it('annonce un compte inactif', () => {
      ouvrirEtCharger({}, profil({ actif: false }));

      const valeurs = elements<HTMLElement>(racine, '.tableau-de-bord__identite dd').map(texteDe);
      expect(valeurs[4]).toBe('Non');
    });

    it('propose l’espace du rôle courant et les notifications', () => {
      ouvrirEtCharger();

      const liens = elements<HTMLAnchorElement>(racine, '.tableau-de-bord__lien a');
      expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
        '/producteur',
        '/notifications',
      ]);
      expect(texteDe(liens[0])).toBe('Accéder à mon espace');
      expect(liens[1].getAttribute('id')).toBe('lien-notifications');
    });

    it('oriente l’acheteur vers ses commandes', () => {
      ouvrirEtCharger({}, profil({ role: 'ACHETEUR' }));

      expect(element<HTMLAnchorElement>(racine, '.tableau-de-bord__lien a').getAttribute('href')).toBe(
        '/acheteur/commandes',
      );
    });

    it('oriente l’administrateur vers son espace', () => {
      ouvrirEtCharger({}, profil({ role: 'ADMIN' }));

      expect(element<HTMLAnchorElement>(racine, '.tableau-de-bord__lien a').getAttribute('href')).toBe(
        '/admin',
      );
      expect(texteDe(element(racine, '.tableau-de-bord__identite .badge'))).toBe('Administrateur');
    });
  });

  describe('bannière d’arrivée', () => {
    it('confirme la création du compte seulement avec le paramètre compteCree', () => {
      ouvrirEtCharger({ compteCree: '1' });

      const banniere = element(racine, '.message--succes');
      expect(banniere.getAttribute('role')).toBe('status');
      expect(texteDe(banniere)).toContain('Votre compte a été créé et vous êtes connecté.');
    });

    it('n’affiche aucune confirmation sans ce paramètre', () => {
      ouvrirEtCharger();

      expect(racine.querySelector('.message--succes')).toBeNull();
    });
  });

  describe('erreur', () => {
    it('reprend le message du serveur', () => {
      ouvrir();
      http.expectOne(PROFIL_URL).flush(
        { statut: 404, message: 'Utilisateur introuvable.' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain('Utilisateur introuvable.');
      expect(element(racine, '.message--erreur').getAttribute('role')).toBe('alert');
    });

    it('retombe sur un texte générique quand le serveur ne motive pas', () => {
      ouvrir();
      http.expectOne(PROFIL_URL).flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        "Le profil n'a pas pu être chargé.",
      );
      expect(racine.querySelector('.tableau-de-bord__carte')).toBeNull();
    });

    it('« Réessayer » relance la même requête et finit par afficher la carte', () => {
      ouvrir();
      http.expectOne(PROFIL_URL).flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      element<HTMLButtonElement>(racine, '.message--erreur button').click();
      fixture.detectChanges();
      http.expectOne(PROFIL_URL).flush(profil());
      fixture.detectChanges();

      expect(texteDe(element(racine, '.carte__titre'))).toBe('Mon profil');
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });
  });
});
