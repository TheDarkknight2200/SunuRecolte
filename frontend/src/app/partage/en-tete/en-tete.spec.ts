import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation, Router } from '@angular/router';
import { SessionUtilisateur } from '../../core/modeles/auth.modeles';
import { NotificationResponse } from '../../core/modeles/domaine.modeles';
import { Role } from '../../core/modeles/referentiels';
import { authInterceptor } from '../../core/intercepteurs/auth.interceptor';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CLE_PANIER, LignePanier, PanierService } from '../../core/services/panier.service';
import { EnTete } from './en-tete';

const API = 'http://localhost:8080/api';
const URL_NOTIFICATIONS = `${API}/notifications`;

function session(role: Role): SessionUtilisateur {
  return {
    utilisateurId: 9,
    nom: 'Fall',
    prenom: 'Moussa',
    email: 'moussa.fall@example.sn',
    role,
  };
}

/** Ligne valide telle qu'elle serait relue depuis `localStorage` par le service. */
function ligne(recolteId: number): LignePanier {
  return {
    recolteId,
    quantite: 10,
    produit: `Récolte ${recolteId}`,
    prixUnitaire: 12500,
    unite: 'kg',
    nomProducteur: 'Diop',
    quantiteDisponible: 500,
    statut: 'DISPONIBLE',
  };
}

function lignes(count: number): LignePanier[] {
  return Array.from({ length: count }, (_, index) => ligne(index + 1));
}

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '9', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function notification(id: number, lu: boolean): NotificationResponse {
  return {
    id,
    utilisateurId: 9,
    titre: lu ? 'Suivi de commande' : 'Nouvelle commande',
    message: lu
      ? 'Le statut de votre commande n° 1123 est désormais : CONFIRMEE.'
      : 'Vous avez reçu la commande n° 1123 de la part de Moussa Fall.',
    lu,
    dateCreation: '2026-09-28T14:05:09',
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

/** Les glyphes Material Symbols sont des points de code à usage privé : retirés avant comparaison. */
function sansIcone(valeur: string): string {
  return valeur
    .replace(/[\u{E000}-\u{F8FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('EnTete — indicateur de panier', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EnTete>;
  let racine: HTMLElement;

  /** Monte l'en-tête sans répondre au `GET /api/notifications` éventuellement émis. */
  function demarrer(role?: Role, contenu: readonly LignePanier[] = []): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) + 3600));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session(role)));
    }
    if (contenu.length > 0) {
      localStorage.setItem(CLE_PANIER, JSON.stringify(contenu));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnTete);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  /**
   * La session, le panier et les notifications sont lus au démarrage des services : ils sont
   * posés avant le rendu. Par défaut la liste de notifications arrive vide, pour que chaque
   * test reparte d'un badge absent plutôt que d'une requête laissée en attente.
   */
  function ouvrir(
    role?: Role,
    contenu: readonly LignePanier[] = [],
    liste: NotificationResponse[] = [],
  ): void {
    demarrer(role, contenu);
    if (role) {
      demandeNotifications().flush(liste);
      fixture.detectChanges();
    }
  }

  function demandeNotifications(): TestRequest {
    return http.expectOne(URL_NOTIFICATIONS);
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('compte les lignes du panier d’un acheteur, en direct', () => {
    ouvrir('ACHETEUR', [ligne(1)]);

    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('1');

    TestBed.inject(PanierService).retirer(1);
    fixture.detectChanges();
    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('0');
  });

  it('n’affiche aucun indicateur pour un producteur, un administrateur ou une visite anonyme', () => {
    ouvrir('ACHETEUR', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).not.toBeNull();

    ouvrir('PRODUCTEUR', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();

    ouvrir('ADMIN', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();

    ouvrir(undefined, [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();
    expect(http.match(() => true)).toEqual([]);
  });

  /**
   * Le lien « Mes commandes » est l'entrée de la consultation des commandes : il ne
   * doit apparaître que pour un acheteur, et mener à la liste réelle et non à un
   * espace vide.
   */
  it('ne propose « Mes commandes » qu’à un acheteur, vers la liste de ses commandes', () => {
    const liensEspace = () =>
      elements<HTMLAnchorElement>(racine, '.entete__navigation a')
        .map((lien) => ({
          libelle: sansIcone(texteDe(lien)),
          href: lien.getAttribute('href'),
        }))
        .filter((lien) => lien.libelle === 'Mes commandes');

    ouvrir('ACHETEUR');
    expect(liensEspace()).toEqual([{ libelle: 'Mes commandes', href: '/acheteur/commandes' }]);

    ouvrir('PRODUCTEUR');
    expect(liensEspace()).toEqual([]);

    ouvrir('ADMIN');
    expect(liensEspace()).toEqual([]);

    ouvrir();
    expect(liensEspace()).toEqual([]);
  });

  it('plafonne le compteur à 99+ et relie le panier à sa page', () => {
    ouvrir('ACHETEUR', lignes(100));

    const lien = element<HTMLAnchorElement>(racine, '.entete__panier');
    expect(lien.tagName).toBe('A');
    expect(lien.getAttribute('href')).toBe('/acheteur/panier');
    expect(texteDe(lien)).toContain('Panier');
    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('99+');

    const liens = elements<HTMLAnchorElement>(racine, '.entete__navigation a').map((lien) =>
      sansIcone(texteDe(lien)),
    );
    expect(liens).toEqual(['Catalogue', 'Tableau de bord', 'Mes commandes', 'Panier 99+']);
  });

  it('garde le compteur dans un badge non cliquable (§10.7)', () => {
    ouvrir('ACHETEUR', [ligne(1)]);

    const compteur = element(racine, '.entete__panier-compteur');
    expect(compteur.tagName).toBe('SPAN');
    expect(compteur.getAttribute('href')).toBeNull();
    expect(racine.querySelector('a.badge')).toBeNull();
  });
});

describe('EnTete — compteur de notifications non lues (§29)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EnTete>;
  let racine: HTMLElement;

  function demarrer(role?: Role): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) + 3600));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session(role)));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnTete);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function ouvrir(role: Role, liste: NotificationResponse[]): void {
    demarrer(role);
    demandeNotifications().flush(liste);
    fixture.detectChanges();
  }

  function demandeNotifications(): TestRequest {
    return http.expectOne(URL_NOTIFICATIONS);
  }

  function badge(): HTMLElement | null {
    return racine.querySelector('.entete__notifications-compteur');
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('ne demande jamais /api/notifications à un visiteur anonyme', () => {
    demarrer();

    expect(http.match(() => true)).toEqual([]);
    expect(racine.querySelector('.entete__notifications')).toBeNull();
  });

  it('ne demande jamais /api/notifications quand le jeton local est expiré', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) - 3600));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session('ACHETEUR')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnTete);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;

    // Un appel ici répondrait 401, purgerait la session et relancerait une redirection.
    expect(http.match(() => true)).toEqual([]);
  });

  it('demande GET /api/notifications une seule fois pour un compte authentifié', () => {
    demarrer('PRODUCTEUR');

    const requete = demandeNotifications();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_NOTIFICATIONS);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.urlWithParams).not.toContain('utilisateurId');
    requete.flush([notification(1, false)]);
    fixture.detectChanges();

    expect(http.match(() => true)).toEqual([]);
  });

  it('affiche le compteur pour un compte authentifié et calcule les non-lues', () => {
    ouvrir('ACHETEUR', [notification(1, false), notification(2, true), notification(3, false)]);

    expect(texteDe(element(racine, '.entete__notifications-compteur'))).toBe('2');
  });

  it('masque le compteur quand aucune notification n’est non lue', () => {
    ouvrir('ACHETEUR', [notification(1, true), notification(2, true)]);

    expect(badge()).toBeNull();
    expect(racine.querySelector('.entete__notifications')).not.toBeNull();
  });

  it('masque le compteur quand le compte n’a aucune notification', () => {
    ouvrir('PRODUCTEUR', []);

    expect(badge()).toBeNull();
  });

  it('plafonne le compteur à 99+', () => {
    const cent = Array.from({ length: 100 }, (_, index) => notification(index + 1, false));

    ouvrir('ACHETEUR', cent);

    expect(texteDe(element(racine, '.entete__notifications'))).toContain('99+');
  });

  /** Le compteur est une information, jamais une navigation (§29, §10.5). */
  it('reste un badge non cliquable, hors des quatre liens de navigation', () => {
    ouvrir('ACHETEUR', [notification(1, false)]);

    const zone = element(racine, '.entete__notifications');
    expect(zone.tagName).toBe('SPAN');
    expect(badge()?.tagName).toBe('SPAN');
    expect(zone.getAttribute('href')).toBeNull();
    expect(racine.querySelector('a .entete__notifications')).toBeNull();
    expect(racine.querySelector('a.badge')).toBeNull();
    expect(
      elements<HTMLAnchorElement>(racine, '.entete__navigation a').map((lien) =>
        sansIcone(texteDe(lien)),
      ),
    ).toEqual(['Catalogue', 'Tableau de bord', 'Mes commandes', 'Panier 0']);
  });

  /** §10.5 : l'entrée du profil vit dans l'espace producteur, jamais dans l'en-tête. */
  it('n’ajoute aucun lien « Profil » à la navigation de l’en-tête pour un producteur', () => {
    ouvrir('PRODUCTEUR', []);

    const liens = elements<HTMLAnchorElement>(racine, '.entete__navigation a');
    expect(liens.map((lien) => sansIcone(texteDe(lien)))).toEqual([
      'Catalogue',
      'Tableau de bord',
      'Mes récoltes',
    ]);
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/recoltes',
      '/tableau-de-bord',
      '/producteur',
    ]);
    expect(liens.length).toBeLessThanOrEqual(4);
  });

  it('annonce les changements de nombre sans interrompre la navigation', () => {
    ouvrir('ACHETEUR', [notification(1, false)]);

    expect(element(racine, '.entete__notifications').getAttribute('aria-live')).toBe('polite');
  });

  /**
   * L'en-tête et l'écran partagent le même service : le badge doit suivre un marquage lu
   * sans qu'aucune navigation n'ait lieu et sans recharger la liste.
   */
  it('se met à jour quand l’écran marque une notification comme lue', () => {
    ouvrir('ACHETEUR', [notification(1, false), notification(2, false)]);
    expect(texteDe(element(racine, '.entete__notifications'))).toContain('2');

    TestBed.inject(NotificationService)
      .marquerLue(1)
      .subscribe();

    const marquage = http.expectOne(`${URL_NOTIFICATIONS}/1/lue`);
    expect(marquage.request.method).toBe('PUT');
    marquage.flush(notification(1, true));
    fixture.detectChanges();

    expect(texteDe(element(racine, '.entete__notifications'))).toContain('1');
    expect(http.match(() => true)).toEqual([]);
  });

  it('n’anticipe pas le compteur pendant l’appel de marquage', () => {
    ouvrir('ACHETEUR', [notification(1, false)]);

    TestBed.inject(NotificationService)
      .marquerLue(1)
      .subscribe();
    fixture.detectChanges();

    expect(texteDe(element(racine, '.entete__notifications'))).toContain('1');

    http.expectOne(`${URL_NOTIFICATIONS}/1/lue`).flush(notification(1, true));
    fixture.detectChanges();
    expect(badge()).toBeNull();
  });

  it('cache le compteur quand le chargement échoue, sans déconnecter', () => {
    demarrer('PRODUCTEUR');

    demandeNotifications().flush(
      { message: 'Accès refusé : vous n’avez pas les droits nécessaires pour cette ressource.' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(badge()).toBeNull();
    expect(TestBed.inject(AuthService).session()).not.toBeNull();
  });

  it('n’hérite jamais du compteur d’un compte précédent après une déconnexion', () => {
    ouvrir('ACHETEUR', [notification(1, false)]);
    expect(texteDe(element(racine, '.entete__notifications'))).toContain('1');

    TestBed.inject(AuthService).deconnexion();
    fixture.detectChanges();

    expect(badge()).toBeNull();
    expect(http.match(() => true)).toEqual([]);
  });
});

/** Sonde de test : une page fille de « /producteur », sans appel HTTP. */
@Component({ selector: 'app-sonde-profil', template: '<p>Profil</p>' })
class SondeProfil {}

/**
 * Le lien d'espace pointe vers « /producteur » : une page producteur de plus reste sous le
 * même préfixe, §10.5 n'a donc pas à être redéclaré pour elle.
 */
describe('EnTete — lien d’espace actif depuis une page producteur', () => {
  it('conserve aria-current sur « Mes récoltes » quand l’écran affiché est /producteur/profil', async () => {
    localStorage.clear();
    localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) + 3600));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session('PRODUCTEUR')));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'producteur/profil', component: SondeProfil }],
          withDisabledInitialNavigation(),
        ),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const controle = TestBed.inject(HttpTestingController);

    // L'en-tête est monté AVANT la navigation : RouterLinkActive ne réagit qu'aux
    // événements du routeur, une navigation antérieure à l'enregistrement des liens serait perdue.
    const montage = TestBed.createComponent(EnTete);
    montage.detectChanges();
    controle.expectOne(URL_NOTIFICATIONS).flush([]);

    await TestBed.inject(Router).navigate(['/producteur/profil']);
    montage.detectChanges();
    const tete = montage.nativeElement as HTMLElement;

    const lienEspace = element<HTMLAnchorElement>(tete, '.entete__lien[href="/producteur"]');
    expect(lienEspace.getAttribute('aria-current')).toBe('page');
    expect(lienEspace.classList.contains('entete__lien--actif')).toBe(true);
    expect(
      element<HTMLAnchorElement>(tete, '.entete__lien[href="/recoltes"]').getAttribute('aria-current'),
    ).toBeNull();

    controle.verify();
    localStorage.clear();
  });
});
