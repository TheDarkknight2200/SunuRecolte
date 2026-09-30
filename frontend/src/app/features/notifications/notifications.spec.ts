import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { NotificationResponse } from '../../core/modeles/domaine.modeles';
import { authInterceptor } from '../../core/intercepteurs/auth.interceptor';
import { Notifications } from './notifications';

const API = 'http://localhost:8080/api';
const URL_NOTIFICATIONS = `${API}/notifications`;

function notification(id: number, lu: boolean, surcharge: Partial<NotificationResponse> = {}): NotificationResponse {
  return {
    id,
    utilisateurId: 9,
    titre: lu ? 'Suivi de commande' : 'Nouvelle commande',
    message: lu
      ? 'Le statut de votre commande n° 1123 est désormais : CONFIRMEE.'
      : 'Vous avez reçu la commande n° 1123 de la part de Moussa Fall.',
    lu,
    dateCreation: '2026-09-28T14:05:09',
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

describe('Notifications — écran transversal /notifications', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Notifications>;
  let racine: HTMLElement;

  function ouvrir(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Notifications);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function demandeListe(): TestRequest {
    return http.expectOne(URL_NOTIFICATIONS);
  }

  function charger(liste: NotificationResponse[]): void {
    demandeListe().flush(liste);
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /** Toutes les notifications rendues, dans l'ordre du serveur. */
  function cartes(): HTMLElement[] {
    return elements(racine, '.notifications__carte');
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/notifications à l’ouverture, sans aucun paramètre', () => {
    ouvrir();

    const requete = demandeListe();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_NOTIFICATIONS);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.urlWithParams).not.toMatch(/utilisateur/i);
    requete.flush([]);
  });

  it('affiche l’état de chargement tant que la liste n’est pas revenue', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des notifications…');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    // Rien d'une liste ni d'un faux état vide pendant le chargement.
    expect(racine.querySelector('.etat__titre')).toBeNull();
    expect(cartes()).toHaveLength(0);
    demandeListe().flush([notification(1, false)]);
  });

  it('rend la liste du serveur dans son ordre, avec titre, message et état', () => {
    ouvrir();
    charger([notification(7, true), notification(4, false)]);

    expect(cartes()).toHaveLength(2);
    expect(texteDe(element(racine, '.notifications__carte .carte__titre'))).toBe('Suivi de commande');
    expect(texteDe(element(cartes()[1] as HTMLElement, '.notifications__message'))).toContain(
      'Vous avez reçu la commande n° 1123',
    );
  });

  it('affiche l’état vide avec une action vers le tableau de bord', () => {
    ouvrir();
    charger([]);

    expect(texteDe(element(racine, '.etat__titre'))).toBe('Vous n’avez aucune notification.');
    const lien = element<HTMLAnchorElement>(racine, '.etat a');
    expect(lien.getAttribute('href')).toBe('/tableau-de-bord');
    expect(cartes()).toHaveLength(0);
  });

  it('affiche le message du backend en cas d’erreur, avec un bouton Réessayer', () => {
    ouvrir();
    // Message réellement produit par `ControleAcces.accesRefuse()`.
    demandeListe().flush(
      { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource." },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
    expect(racine.querySelector('#notifications-reessayer')).not.toBeNull();
    expect(racine.querySelector('.etat__titre')).toBeNull();
  });

  it('recharge après une erreur via Réessayer et retrouve la liste', () => {
    ouvrir();
    demandeListe().flush(
      { message: 'Une erreur interne est survenue. Veuillez réessayer.' },
      { status: 500, statusText: 'Error' },
    );
    fixture.detectChanges();
    expect(racine.querySelector('.message--erreur')).not.toBeNull();

    cliquer('#notifications-reessayer');
    const seconde = demandeListe();
    expect(seconde.request.method).toBe('GET');
    seconde.flush([notification(1, false)]);
    fixture.detectChanges();

    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(cartes()).toHaveLength(1);
  });

  it('rend un texte d’erreur générique quand le backend n’en fournit pas', () => {
    ouvrir();
    demandeListe().error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
    );
  });

  it('signale une notification non lue par le texte obligatoire « Non lue »', () => {
    ouvrir();
    charger([notification(1, false)]);

    const carte = cartes()[0] as HTMLElement;
    expect(texteDe(carte)).toContain('Non lue');
    expect(element(carte, '.badge').getAttribute('class')).toContain('badge--avertissement');
  });

  it('n’affiche jamais « Non lue » pour une notification déjà lue', () => {
    ouvrir();
    charger([notification(2, true)]);

    const carte = cartes()[0] as HTMLElement;
    expect(texteDe(carte)).not.toContain('Non lue');
    expect(texteDe(carte)).toContain('Lue');
  });

  it('propose « Marquer comme lue » sur une notification non lue seulement', () => {
    ouvrir();
    charger([notification(1, false), notification(2, true)]);

    expect(racine.querySelector('#notifications-marquer-1')).not.toBeNull();
    expect(racine.querySelector('#notifications-marquer-2')).toBeNull();
    expect(elements(racine, '.notifications__carte button')).toHaveLength(1);
  });

  it('envoie exactement une requête PUT pour deux clics sur « Marquer comme lue »', () => {
    ouvrir();
    charger([notification(1, false)]);

    const bouton = element<HTMLButtonElement>(racine, '#notifications-marquer-1');
    bouton.click();
    bouton.click();
    fixture.detectChanges();

    // `match` consomme la requête trouvée : une seule, remise ici pour être dénouée.
    const marquages = http.match((requete) => requete.method === 'PUT');
    expect(marquages).toHaveLength(1);
    expect(marquages[0]?.request.urlWithParams).toBe(`${URL_NOTIFICATIONS}/1/lue`);

    marquages[0]?.flush(notification(1, true));
    fixture.detectChanges();
    expect(racine.querySelector('#notifications-marquer-1')).toBeNull();
  });

  it('désactive le bouton et expose aria-busy pendant le marquage', () => {
    ouvrir();
    charger([notification(1, false)]);

    cliquer('#notifications-marquer-1');

    const requete = http.expectOne(`${URL_NOTIFICATIONS}/1/lue`);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.body).toBeNull();
    const bouton = element<HTMLButtonElement>(racine, '#notifications-marquer-1');
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-busy')).toBe('true');

    requete.flush(notification(1, true));
    fixture.detectChanges();
  });

  it('rend l’état lu à partir de la réponse du serveur, jamais avant', () => {
    ouvrir();
    charger([notification(1, false)]);

    cliquer('#notifications-marquer-1');
    const carte = cartes()[0] as HTMLElement;
    // La réponse n'est pas encore arrivée : la notification reste explicitement non lue.
    expect(texteDe(carte)).toContain('Non lue');

    http
      .expectOne(`${URL_NOTIFICATIONS}/1/lue`)
      .flush({ ...notification(1, true), titre: 'Suivi de commande' });
    fixture.detectChanges();

    const apres = cartes()[0] as HTMLElement;
    expect(texteDe(apres)).not.toContain('Non lue');
    expect(texteDe(apres)).toContain('Suivi de commande');
    expect(racine.querySelector('#notifications-marquer-1')).toBeNull();
  });

  it('conserve l’état précédent et permet de réessayer quand le PUT échoue', () => {
    ouvrir();
    charger([notification(1, false), notification(2, false)]);

    cliquer('#notifications-marquer-1');
    http
      .expectOne(`${URL_NOTIFICATIONS}/1/lue`)
      .flush({ message: 'Une erreur interne est survenue. Veuillez réessayer.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Une erreur interne est survenue. Veuillez réessayer.');
    expect(texteDe(cartes()[0] as HTMLElement)).toContain('Non lue');
    const bouton = element<HTMLButtonElement>(racine, '#notifications-marquer-1');
    expect(bouton.disabled).toBe(false);
    expect(bouton.getAttribute('aria-busy')).toBe('false');

    bouton.click();
    http
      .expectOne(`${URL_NOTIFICATIONS}/1/lue`)
      .flush(notification(1, true));
    fixture.detectChanges();
    expect(racine.querySelector('#notifications-marquer-1')).toBeNull();
  });

  it('formate la date de création en jour/mois/année heure', () => {
    ouvrir();
    charger([notification(1, false, { dateCreation: '2026-09-28T14:05:09' })]);

    expect(texteDe(element(cartes()[0] as HTMLElement, '.notifications__champs dd'))).toBe(
      '28/09/2026 à 14:05',
    );
  });

  it('cliquer sur une notification ne la marque pas comme lue', () => {
    ouvrir();
    charger([notification(1, false)]);

    const carte = cartes()[0] as HTMLElement;
    carte.click();
    element<HTMLParagraphElement>(carte, '.notifications__message').click();
    fixture.detectChanges();

    expect(http.match((requete) => requete.method === 'PUT')).toHaveLength(0);
    expect(texteDe(carte)).toContain('Non lue');
  });

  it('le bouton Actualiser relance explicitement la lecture', () => {
    ouvrir();
    charger([notification(1, false)]);

    expect(element<HTMLButtonElement>(racine, '#notifications-actualiser').disabled).toBe(false);

    cliquer('#notifications-actualiser');
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des notifications…');
    expect(element<HTMLButtonElement>(racine, '#notifications-actualiser').disabled).toBe(true);
    expect(element(racine, '#notifications-actualiser').getAttribute('aria-busy')).toBe('true');

    const requete = demandeListe();
    expect(requete.request.method).toBe('GET');
    requete.flush([notification(1, true)]);
    fixture.detectChanges();

    expect(racine.querySelector('#notifications-marquer-1')).toBeNull();
  });

  it('donne le focus au titre de la page après une actualisation demandée', () => {
    ouvrir();
    charger([notification(1, false)]);
    expect(document.activeElement?.nodeName).not.toBe('H1');

    cliquer('#notifications-actualiser');
    demandeListe().flush([notification(1, false)]);
    fixture.detectChanges();

    const titre = element(racine, 'h1');
    expect(titre.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(titre);
  });

  it('ne vole pas le focus au premier chargement automatique', () => {
    ouvrir();
    charger([notification(1, false)]);

    expect(document.activeElement?.nodeName).not.toBe('H1');
  });

  it('n’ouvre aucun minuteur : la liste ne se recharge jamais toute seule', () => {
    vi.useFakeTimers();
    try {
      ouvrir();
      demandeListe().flush([notification(1, false)]);
      fixture.detectChanges();

      vi.advanceTimersByTime(30 * 60 * 1000);
      fixture.detectChanges();

      // Aucune nouvelle requête pendant 30 minutes : ni setInterval, ni polling, ni EventSource.
      expect(http.match(() => true)).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne nomme aucun identifiant d’utilisateur dans les appels passés depuis la page', () => {
    ouvrir();
    charger([notification(1, false)]);

    cliquer('#notifications-marquer-1');
    const marquage = http.expectOne(`${URL_NOTIFICATIONS}/1/lue`);
    expect(marquage.request.urlWithParams).toBe(`${URL_NOTIFICATIONS}/1/lue`);
    expect(marquage.request.params.keys()).toEqual([]);
    expect(marquage.request.serializeBody()).toBeNull();
    marquage.flush(notification(1, true));
    fixture.detectChanges();
  });

  it('garde un seul titre de niveau 1 et des boutons nommés', () => {
    ouvrir();
    charger([notification(1, false), notification(2, false)]);

    expect(elements(racine, 'h1')).toHaveLength(1);
    expect(elements<HTMLButtonElement>(racine, 'button:not(:disabled)')).toHaveLength(3);
    expect(element(racine, '#notifications-marquer-1').getAttribute('aria-label')).toBe(
      'Marquer comme lue la notification : Nouvelle commande',
    );
  });

  /**
   * §20 : le contenu est contraint par `.conteneur` (centré, `--largeur-contenu`), comme sur les
   * écrans alignés. Vérifié dans les quatre états réellement rendus, pas seulement la liste :
   * un état posé hors du conteneur se remettrait à étirer la page sur toute la fenêtre.
   */
  it('contraint son contenu dans .conteneur dans chacun des quatre états rendus', () => {
    ouvrir();

    const conteneur = element(racine, '.conteneur');
    expect(conteneur.parentElement?.tagName).toBe('SECTION');
    expect(elements(racine, '.conteneur')).toHaveLength(1);
    expect(conteneur.contains(element(racine, 'h1'))).toBe(true);
    expect(conteneur.contains(element(racine, '#notifications-actualiser'))).toBe(true);

    // 1. chargement
    expect(conteneur.contains(element(racine, '.etat'))).toBe(true);

    // 2. vide, avec son lien d'action
    charger([]);
    expect(conteneur.contains(element(racine, '.etat__titre'))).toBe(true);
    expect(conteneur.contains(element(racine, '.etat a'))).toBe(true);

    // 3. liste, avec le bouton de marquage d'une ligne
    cliquer('#notifications-actualiser');
    charger([notification(1, false)]);
    expect(conteneur.contains(element(racine, '.notifications__liste'))).toBe(true);
    expect(conteneur.contains(element(racine, '#notifications-marquer-1'))).toBe(true);

    // 4. erreur, avec son bouton Réessayer
    cliquer('#notifications-actualiser');
    demandeListe().flush(
      { message: 'Le serveur est injoignable. Réessayez.' },
      { status: 500, statusText: 'Error' },
    );
    fixture.detectChanges();
    expect(conteneur.contains(element(racine, '.message--erreur'))).toBe(true);
    expect(conteneur.contains(element(racine, '#notifications-reessayer'))).toBe(true);
  });
});

/**
 * La protection de la route est vérifiée sur la table réelle ; le refus d'un visiteur non
 * connecté est couvert par authGuard.spec.
 */
describe('route /notifications', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
    title?: string;
    loadComponent?: unknown;
  }

  function route(path: string): RouteProtegee {
    const trouvee = routes.find((entree) => entree.path === path);
    if (!trouvee) {
      throw new Error(`Route introuvable : ${path}`);
    }
    return trouvee as unknown as RouteProtegee;
  }

  it('protège /notifications par authGuard seul, sans roleGuard ni rôle requis', () => {
    const protegee = route('notifications');

    expect(protegee.canActivate).toEqual([authGuard]);
    expect(protegee.canActivate).not.toContain(roleGuard);
    expect(protegee.data).toBeUndefined();
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('donne un titre de page à l’écran de notifications', () => {
    expect(route('notifications').title).toBe('SunuRecolte — Notifications');
  });

  it('laisse le tableau de bord et les espaces par rôle inchangés', () => {
    expect(route('tableau-de-bord').canActivate).toEqual([authGuard]);
    expect(route('acheteur/commandes').canActivate).toEqual([authGuard, roleGuard]);
    expect(route('producteur/recoltes').data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(route('admin').data).toEqual({ roles: ['ADMIN'] });
  });
});
