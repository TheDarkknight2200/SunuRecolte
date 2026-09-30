import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { RecoltesAdmin } from './recoltes-admin';

const API = 'http://localhost:8080/api';
const RECOLTES = `${API}/recoltes`;

const SESSION_ADMIN: SessionUtilisateur = {
  utilisateurId: 1,
  nom: 'Sow',
  prenom: 'Fatou',
  email: 'admin@sunurecolte.sn',
  role: 'ADMIN',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '1', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function recolte(id: number, surcharge: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id,
    producteurId: 7,
    nomProducteur: 'Moussa Fall',
    localisationProducteur: 'Thiès',
    produit: 'Tomate',
    description: 'Tomates de saison.',
    quantiteDisponible: 350,
    quantiteMin: 5,
    quantiteMax: 200,
    unite: 'kg',
    prixUnitaire: 450,
    imageUrl: null,
    localisation: 'Dakar',
    dateDisponibilite: '2026-06-01',
    statut: 'DISPONIBLE',
    dateCreation: '2026-05-12T08:30:00',
    ...surcharge,
  };
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

describe('RecoltesAdmin (modération)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<RecoltesAdmin>;
  let racine: HTMLElement;

  function ouvrir(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecoltesAdmin);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function listeEnAttente() {
    return http.expectOne(RECOLTES);
  }

  function charger(recoltes: RecolteResponse[]): void {
    listeEnAttente().flush(recoltes);
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/recoltes sans aucun paramètre', () => {
    ouvrir();

    const requete = listeEnAttente();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(RECOLTES);
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush([]);
  });

  it('n’appelle jamais un endpoint personnel : la liste vient du catalogue public', () => {
    ouvrir();

    const demandes = http.match(() => true);
    expect(demandes).toHaveLength(1);
    for (const url of ['mes-recoltes', '/producteurs/moi', '/acheteurs/moi']) {
      expect(demandes[0].request.url).not.toContain(url);
    }
    demandes[0].flush([]);
  });

  it('affiche l’état de chargement, jamais l’état vide pendant la requête', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des récoltes…');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Aucune récolte publiée');
    expect(racine.querySelector('.recoltes-admin__liste')).toBeNull();

    charger([]);
  });

  it('rend la récolte telle que renvoyée par le serveur, dates et montants formatés', () => {
    ouvrir();
    charger([recolte(12)]);

    const carte = element<HTMLElement>(racine, '.recoltes-admin__ligne');
    expect(texteDe(element(racine, 'h1'))).toBe('Récoltes');
    expect(texteDe(element(racine, '.cellule-double__titre'))).toBe('Tomate');
    expect(texteDe(carte)).toContain('Moussa Fall');
    expect(texteDe(carte)).toContain('350 kg');
    expect(texteDe(carte)).toContain('450 FCFA / kg');
    expect(texteDe(carte)).toContain('12/05/2026 à 08:30');
    expect(texteDe(carte)).toContain('Disponible');
    expect(texteDe(element(racine, '.recoltes-admin__meta'))).toContain('01/06/2026');
    expect(texteDe(element(racine, '.recoltes-admin__meta'))).toContain('Dakar');
    expect(texteDe(carte)).not.toContain('null');
    expect(texteDe(carte)).not.toContain('undefined');
  });

  it('compte les récoltes dans l’introduction, au singulier comme au pluriel', () => {
    ouvrir();
    charger([recolte(12)]);
    expect(texteDe(element(racine, '.recoltes-admin__intro'))).toContain('1 récolte publiée');

    cliquer('#recoltes-actualiser');
    charger([recolte(12), recolte(13)]);
    expect(texteDe(element(racine, '.recoltes-admin__intro'))).toContain('2 récoltes publiées');
  });

  it('propose uniquement l’autre statut du domaine, jamais un statut inventé', () => {
    ouvrir();
    charger([recolte(12), recolte(13, { produit: 'Oignon', statut: 'EPUISEE' })]);

    const [disponible, epuisee] = elements<HTMLElement>(racine, '.recoltes-admin__ligne');
    const boutonDisponible = element<HTMLButtonElement>(disponible, '#statut-12');
    const boutonEpuisee = element<HTMLButtonElement>(epuisee, '#statut-13');

    expect(texteDe(boutonDisponible)).toBe('Marquer comme épuisée');
    expect(boutonDisponible.getAttribute('aria-label')).toBe('Marquer comme épuisée — Tomate');
    expect(texteDe(boutonEpuisee)).toBe('Marquer comme disponible');
    expect(boutonEpuisee.getAttribute('aria-label')).toBe('Marquer comme disponible — Oignon');

    expect(texteDe(elements<HTMLElement>(disponible, '.badge')[0])).toBe('Disponible');
    expect(elements<HTMLElement>(disponible, '.badge')[0].classList.contains('badge--succes')).toBe(
      true,
    );
    expect(texteDe(elements<HTMLElement>(epuisee, '.badge')[0])).toBe('Épuisée');
    expect(elements<HTMLElement>(epuisee, '.badge')[0].classList.contains('badge--erreur')).toBe(
      true,
    );
  });

  it('ne modère que le statut : aucune saisie, ni création, ni suppression de récolte', () => {
    ouvrir();
    charger([recolte(12)]);

    expect(racine.querySelector('input, textarea, select, form')).toBeNull();
    expect(texteDe(racine)).not.toMatch(/Supprimer|Créer une récolte|Nouvelle récolte/);
    expect(elements(racine, '.recoltes-admin__ligne button')).toHaveLength(1);
  });

  it('relie chaque carte à sa fiche publique, sans jamais passer par un endpoint personnel', () => {
    ouvrir();
    charger([recolte(12)]);

    const lien = element<HTMLAnchorElement>(racine, '.recoltes-admin__ligne .tableau__actions a');
    expect(lien.getAttribute('href')).toBe('/recoltes/12');
    expect(texteDe(lien)).toBe('Voir la fiche publique');
  });

  it('propose les notifications, seules données transverses de l’ADMIN, depuis l’écran', () => {
    ouvrir();
    charger([recolte(12)]);

    const lien = element<HTMLAnchorElement>(racine, '#lien-notifications-recoltes-admin');
    expect(lien.getAttribute('href')).toBe('/notifications');
    expect(texteDe(lien)).toBe('Notifications');
  });

  it('omet la ligne de méta quand la date et la localisation sont absentes', () => {
    ouvrir();
    charger([recolte(12, { dateDisponibilite: null, localisation: null })]);

    expect(racine.querySelector('.recoltes-admin__meta')).toBeNull();
  });

  it('invite à attendre une publication quand la liste est vide', () => {
    ouvrir();
    charger([]);

    expect(texteDe(element(racine, '.etat'))).toContain('Aucune récolte publiée.');
    expect(racine.querySelector('.recoltes-admin__liste')).toBeNull();
    expect(texteDe(element(racine, '.recoltes-admin__intro'))).toContain('0 récoltes publiées');
  });

  it('affiche l’erreur du backend avec Réessayer, sans état vide', () => {
    ouvrir();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service est temporairement indisponible.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le service est temporairement indisponible.',
    );
    expect(texteDe(racine)).not.toContain('Aucune récolte publiée');
  });

  it('Réessayer relance la liste et remplace le message par les récoltes', () => {
    ouvrir();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service a refusé la requête.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    cliquer('#erreur-reessayer');
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des récoltes…');
    charger([recolte(12)]);

    expect(elements(racine, '.recoltes-admin__ligne')).toHaveLength(1);
    expect(racine.querySelector('.message--erreur')).toBeNull();
  });

  it('un 403 sur la liste reste un refus : ni déconnexion ni purge du jeton', () => {
    const jeton = fabriquerJeton(dansUneHeure());
    localStorage.setItem(CLE_JETON, jeton);
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));
    ouvrir();

    listeEnAttente().flush(
      {
        statut: 403,
        message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
        timestamp: 'x',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(TestBed.inject(AuthService).estConnecte()).toBe(true);
    expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
    expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
  });

  describe('modération du statut', () => {
    beforeEach(() => {
      ouvrir();
      charger([recolte(12), recolte(13, { produit: 'Oignon', statut: 'EPUISEE' })]);
    });

    it('envoie PATCH /{id}/statut avec un corps réduit au statut', () => {
      cliquer('#statut-12');

      const requete = http.expectOne(`${RECOLTES}/12/statut`);
      expect(requete.request.method).toBe('PATCH');
      expect(requete.request.params.keys().length).toBe(0);
      expect(requete.request.body).toEqual({ statut: 'EPUISEE' });

      requete.flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();
    });

    it('rend le focus au bouton de la ligne traitée après la réponse', () => {
      // Le bouton est `disabled` pendant le vol : sans restauration le navigateur retombe sur le
      // <body> et la navigation clavier repart du haut de page (défaut constaté en QA navigateur).
      cliquer('#statut-12');
      http.expectOne(`${RECOLTES}/12/statut`).flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();

      const actif = document.activeElement as HTMLButtonElement;
      expect(actif.getAttribute('id')).toBe('statut-12');
      expect(actif.disabled).toBe(false);
    });

    it('propose le chemin inverse sur une récolte épuisée', () => {
      cliquer('#statut-13');

      const requete = http.expectOne(`${RECOLTES}/13/statut`);
      expect(requete.request.body).toEqual({ statut: 'DISPONIBLE' });
      requete.flush(recolte(13, { statut: 'DISPONIBLE' }));
      fixture.detectChanges();
    });

    it('le statut affiché vient de la réponse du serveur, accompagné du message rendu', () => {
      cliquer('#statut-12');
      // Le serveur rend un produit renommé entre-temps : c'est lui qui a le dernier mot.
      http.expectOne(`${RECOLTES}/12/statut`).flush(
        recolte(12, { statut: 'EPUISEE', produit: 'Tomate de Thiès' }),
      );
      fixture.detectChanges();

      const carte = element<HTMLElement>(racine, '.recoltes-admin__ligne');
      expect(texteDe(element(carte, '.cellule-double__titre'))).toBe('Tomate de Thiès');
      expect(texteDe(elements<HTMLElement>(carte, '.badge')[0])).toBe('Épuisée');
      expect(texteDe(element(carte, '.message--succes'))).toBe(
        '« Tomate de Thiès » est désormais épuisée.',
      );
      expect(element(carte, '.message--succes').getAttribute('role')).toBe('status');
      expect(texteDe(element(carte, '#statut-12'))).toBe('Marquer comme disponible');
    });

    it('un seul PATCH pour deux clics : la carte se verrouille pendant l’envoi', () => {
      const bouton = element<HTMLButtonElement>(racine, '#statut-12');

      bouton.click();
      bouton.click();
      fixture.detectChanges();

      const demandes = http.match((requete) => requete.method === 'PATCH');
      expect(demandes).toHaveLength(1);
      expect(bouton.disabled).toBe(true);
      expect(bouton.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(bouton)).toBe('…');

      demandes[0].flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();
    });

    it('toutes les actions de statut et l’actualisation sont neutralisées pendant un appel', () => {
      cliquer('#statut-12');
      const requete = http.expectOne(`${RECOLTES}/12/statut`);

      expect(
        elements<HTMLButtonElement>(racine, '.recoltes-admin__ligne button').map((b) => b.disabled),
      ).toEqual([true, true]);
      expect(element<HTMLButtonElement>(racine, '#recoltes-actualiser').disabled).toBe(true);

      requete.flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();
      expect(element<HTMLButtonElement>(racine, '#recoltes-actualiser').disabled).toBe(false);
      expect(elements<HTMLButtonElement>(racine, '.recoltes-admin__ligne button').every((b) => !b.disabled)).toBe(true);
    });

    it('un 403 sur le PATCH conserve le statut affiché et la session', () => {
      const jeton = fabriquerJeton(dansUneHeure());
      localStorage.setItem(CLE_JETON, jeton);
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));

      cliquer('#statut-12');
      http.expectOne(`${RECOLTES}/12/statut`).flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
          timestamp: 'x',
        },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      const carte = element<HTMLElement>(racine, '.recoltes-admin__ligne');
      expect(texteDe(element(carte, '.message--erreur'))).toContain('Accès refusé');
      expect(element(carte, '.message--erreur').getAttribute('role')).toBe('alert');
      expect(texteDe(elements<HTMLElement>(carte, '.badge')[0])).toBe('Disponible');
      expect(racine.querySelector('.message--succes')).toBeNull();
      expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
    });

    it('un 404 sur une récolte retirée entre-temps : le message du backend est repris', () => {
      cliquer('#statut-12');
      http.expectOne(`${RECOLTES}/12/statut`).flush(
        { statut: 404, message: "Recolte introuvable avec l'id : 12", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.recoltes-admin__ligne .message--erreur'))).toContain(
        "Recolte introuvable avec l'id : 12",
      );
      expect(elements(racine, '.recoltes-admin__ligne')).toHaveLength(2);
    });

    it('un échec efface le message du succès précédent, et inversement', () => {
      cliquer('#statut-12');
      http.expectOne(`${RECOLTES}/12/statut`).flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();
      expect(element(racine, '.recoltes-admin__ligne .message--succes')).toBeTruthy();

      cliquer('#statut-13');
      http.expectOne(`${RECOLTES}/13/statut`).flush(
        { statut: 403, message: 'Accès refusé.', timestamp: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      const cartes = elements<HTMLElement>(racine, '.recoltes-admin__ligne');
      expect(cartes[0].querySelector('.message--succes')).toBeNull();
      expect(texteDe(element(cartes[1], '.message--erreur'))).toContain('Accès refusé');
    });

    it('Actualiser recharge la liste et pose le message de succès', () => {
      cliquer('#statut-12');
      http.expectOne(`${RECOLTES}/12/statut`).flush(recolte(12, { statut: 'EPUISEE' }));
      fixture.detectChanges();

      cliquer('#recoltes-actualiser');
      expect(texteDe(element(racine, '.etat'))).toContain('Chargement des récoltes…');
      charger([recolte(12)]);

      expect(racine.querySelector('.message--succes')).toBeNull();
      expect(elements(racine, '.recoltes-admin__ligne')).toHaveLength(1);
    });
  });
});
