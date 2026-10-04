import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CommandeResponse } from '../../../core/modeles/domaine.modeles';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { Commandes } from './commandes';

const URL_COMMANDES = 'http://localhost:8080/api/commandes';

const SESSION: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Fall',
  prenom: 'Moussa',
  email: 'moussa.fall@example.sn',
  role: 'ACHETEUR',
};

function ligne(id: number, recolteId: number, surcharge: Partial<CommandeResponse['lignes'][0]> = {}) {
  return {
    id,
    recolteId,
    produit: 'Tomate',
    unite: 'kg',
    quantite: 10,
    prixUnitaire: 450,
    sousTotal: 4500,
    ...surcharge,
  };
}

function commande(id: number, surcharge: Partial<CommandeResponse> = {}): CommandeResponse {
  return {
    id,
    acheteurId: 7,
    nomAcheteur: 'Moussa Fall',
    dateCreation: '2026-09-20T14:05:09',
    statut: 'EN_ATTENTE',
    total: 4500,
    modeReception: 'RETRAIT',
    adresseLivraison: null,
    telephoneLivraison: null,
    instructionsLivraison: null,
    lignes: [ligne(900, 41)],
    statutPaiement: null,
    moyenPaiement: null,
    ...surcharge,
  };
}

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '7', exp: expirationSecondes }))
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

describe('Commandes — liste « Mes commandes »', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Commandes>;
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
    fixture = TestBed.createComponent(Commandes);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function demandeListe(): TestRequest {
    return http.expectOne(URL_COMMANDES);
  }

  function charger(commandes: CommandeResponse[]): void {
    demandeListe().flush(commandes);
    fixture.detectChanges();
  }

  /** La valeur d'une entrée du `dl` de la première carte, repérée par son libellé. */
  function valeurChamp(libelle: string): string {
    const carte = element(racine, '.commandes__carte');
    for (const entree of elements(carte, '.commandes__champs > div')) {
      if (texteDe(element(entree, 'dt')) === libelle) {
        return texteDe(element(entree, 'dd'));
      }
    }
    throw new Error(`Entrée introuvable dans la carte : ${libelle}`);
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/commandes à l’ouverture, sans aucun paramètre', () => {
    ouvrir();

    const requete = demandeListe();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_COMMANDES);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.urlWithParams).not.toContain('acheteurId');
    requete.flush([]);
  });

  it('affiche l’état de chargement tant que la liste n’est pas revenue', () => {
    ouvrir();

    const etat = element(racine, '.etat');
    expect(etat.getAttribute('aria-busy')).toBe('true');
    expect(texteDe(etat)).toContain('Chargement de vos commandes');
    expect(elements(racine, '.commandes__carte')).toHaveLength(0);
    demandeListe().flush([]);
  });

  it('rend une carte par commande, dans l’ordre renvoyé par le serveur', () => {
    ouvrir();
    charger([commande(512), commande(511, { total: 12000 }), commande(509)]);

    expect(elements(racine, '.commandes__carte').map((carte) => texteDe(carte))).toHaveLength(3);
    expect(texteDe(element(racine, '.commandes__carte'))).toContain('Commande n° 512');
    expect(texteDe(elements(racine, '.commandes__carte')[1])).toContain('Commande n° 511');
  });

  it('affiche l’identifiant, la date, le statut, la réception, les lignes et le total du serveur', () => {
    ouvrir();
    charger([
      commande(512, {
        dateCreation: '2026-09-20T14:05:09',
        statut: 'CONFIRMEE',
        modeReception: 'LIVRAISON',
        total: 12345,
        lignes: [ligne(900, 41), ligne(901, 63)],
      }),
    ]);

    const carte = element(racine, '.commandes__carte');
    expect(texteDe(carte)).toContain('Commande n° 512');
    expect(texteDe(carte)).toContain('20/09/2026 à 14:05');
    expect(texteDe(carte)).toContain('Confirmée');
    expect(texteDe(carte)).toContain('Livraison');
    expect(texteDe(carte)).toContain('2 lignes');
    expect(texteDe(element(carte, '.commandes__total'))).toBe('12 345 FCFA');
  });

  it('relie chaque carte au détail de sa commande', () => {
    ouvrir();
    charger([commande(512), commande(511)]);

    const liens = elements<HTMLAnchorElement>(racine, '.commandes__carte .commandes__actions a');
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/acheteur/commandes/512',
      '/acheteur/commandes/511',
    ]);
    expect(texteDe(liens[0])).toContain('Voir le détail');
    expect(liens[0].getAttribute('aria-label')).toBe('Voir le détail de la commande n° 512');
  });

  it('donne à l’acheteur un accès nommé aux notifications depuis sa page d’atterrissage', () => {
    ouvrir();
    charger([commande(512)]);

    const lien = element<HTMLAnchorElement>(racine, '#lien-notifications-acheteur');
    expect(lien.getAttribute('href')).toBe('/notifications');
    expect(texteDe(lien)).toBe('Notifications');
    expect(lien.classList.contains('bouton--discret')).toBe(true);
  });

  it.each([
    ['EN_ATTENTE', 'En attente', 'badge--avertissement'],
    ['CONFIRMEE', 'Confirmée', 'badge--info'],
    ['PRETE', 'Prête', 'badge--primaire'],
    ['LIVREE', 'Livrée', 'badge--succes'],
    ['ANNULEE', 'Annulée', 'badge--erreur'],
  ] as const)('habille %s en %s : texte %s conservé', (statut, libelle, variante) => {
    ouvrir();
    charger([commande(512, { statut })]);

    const badge = element(racine, '.badge');
    expect(texteDe(badge)).toBe(libelle);
    expect(badge.classList.contains(variante)).toBe(true);
  });

  it('écrit « 1 ligne » au singulier', () => {
    ouvrir();
    charger([commande(512)]);

    expect(texteDe(element(racine, '.commandes__carte'))).toContain('1 ligne');
  });

  it('propose le catalogue quand l’acheteur n’a aucune commande', () => {
    ouvrir();
    charger([]);

    const etat = element(racine, '.etat');
    expect(texteDe(etat)).toContain('Vous n’avez pas encore de commande.');
    const lien = element<HTMLAnchorElement>(etat, 'a');
    expect(texteDe(lien)).toBe('Parcourir le catalogue');
    expect(lien.getAttribute('href')).toBe('/recoltes');
    expect(elements(racine, '.commandes__carte')).toHaveLength(0);
  });

  it('affiche le message du backend en cas d’échec, avec un seul bouton de reprise', () => {
    ouvrir();
    demandeListe().flush(
      { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    const message = element(racine, '.message--erreur');
    expect(message.getAttribute('role')).toBe('alert');
    expect(texteDe(message)).toContain('Une erreur interne est survenue.');
    expect(texteDe(element(racine, '#commandes-reessayer'))).toBe('Réessayer');
  });

  it('« Réessayer » relance exactement une nouvelle requête, sans paramètres', () => {
    ouvrir();
    demandeListe().flush({ message: 'Serveur indisponible.' }, { status: 500, statusText: 'error' });
    fixture.detectChanges();

    element<HTMLButtonElement>(racine, '#commandes-reessayer').click();
    fixture.detectChanges();

    const relance = demandeListe();
    expect(relance.request.method).toBe('GET');
    expect(relance.request.urlWithParams).toBe(URL_COMMANDES);
    relance.flush([commande(512)]);
    fixture.detectChanges();

    expect(elements(racine, '.commandes__carte')).toHaveLength(1);
  });

  it('un 403 reste un refus affiché : aucune purge de session, aucune liste inventée', () => {
    localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
    ouvrir();

    demandeListe().flush(
      { statut: 403, message: 'Accès refusé : vous n’avez pas les droits nécessaires.', timestamp: 'x' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
    expect(elements(racine, '.commandes__carte')).toHaveLength(0);
  });

  it('une panne réseau est annoncée comme telle, jamais comme une liste vide', () => {
    ouvrir();
    demandeListe().error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Connexion coupée',
    });
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('serveur est injoignable');
    expect(racine.querySelector('.etat')).toBeNull();
  });

  it('ne rend aucun vocabulaire de paiement inventé sur une commande livrée', () => {
    ouvrir();
    charger([commande(512, { statut: 'LIVREE' })]);

    /*
     * Reciblé au LOT P2c : `CommandeResponse` rend `statutPaiement` et `moyenPaiement`, la carte
     * doit donc nommer le paiement. Ce qui reste interdit est l'invention — une transaction,
     * un prestataire, un paiement passé — et le seul mot autorisé est le constat du serveur.
     */
    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['payé', 'transaction', 'wave', 'orange money', 'simu-']) {
      expect(texte).not.toContain(terme);
    }
    expect(texte).toContain('aucun paiement');
  });

  it('donne à chaque carte une entrée « Paiement », à la place du constat muet', () => {
    ouvrir();
    charger([commande(512)]);

    expect(elements(racine, '.commandes__champs dt').map(texteDe)).toEqual([
      'Date',
      'Réception',
      'Paiement',
      'Lignes',
      'Total',
    ]);
    expect(valeurChamp('Paiement')).toBe('Aucun paiement');
  });

  it('rend le moyen et le statut du paiement envoyé par le serveur', () => {
    ouvrir();
    charger([commande(512, { statutPaiement: 'REMBOURSE', moyenPaiement: 'WAVE' })]);

    expect(valeurChamp('Paiement')).toBe('Wave — Remboursé (simulé)');
  });

  it('ne rend jamais undefined dans le libellé de paiement', () => {
    ouvrir();
    charger([commande(512, { statutPaiement: 'REUSSI' })]);

    expect(valeurChamp('Paiement')).toBe('Réussi');
  });

  it('ne porte aucun message de règle de paiement dans la liste', () => {
    ouvrir();
    charger([commande(512, { modeReception: 'LIVRAISON', adresseLivraison: 'Rue 10, Dakar' })]);

    expect(racine.querySelector('.message--info')).toBeNull();
    expect(texteDe(racine)).not.toContain('le producteur pourra la confirmer');
  });

  /**
   * §20 : le contenu est contraint par `.conteneur` (centré, `--largeur-contenu`), la racine
   * `.commandes` restant ce qu'elle était. Les trois états atteignables dans une même monture sont
   * vérifiés ; l'état vide rend le même nœud `.etat` que celui contrôlé pendant le chargement.
   */
  it('contraint son contenu dans un seul .conteneur, sans toucher à la racine', () => {
    ouvrir();

    const page = element(racine, '.commandes');
    expect(page.tagName).toBe('SECTION');
    const conteneur = element(racine, '.conteneur');
    expect(elements(racine, '.conteneur')).toHaveLength(1);
    expect(conteneur.parentElement).toBe(page);

    // Le titre et l'accès transversal aux notifications sont déjà à l'intérieur.
    expect(conteneur.contains(element(racine, 'h1'))).toBe(true);
    expect(conteneur.contains(element(racine, '#lien-notifications-acheteur'))).toBe(true);

    // 1. chargement
    expect(conteneur.contains(element(racine, '.etat'))).toBe(true);

    // 2. erreur, avec son bouton de reprise
    demandeListe().flush(
      { message: 'Impossible de charger vos commandes.' },
      { status: 500, statusText: 'error' },
    );
    fixture.detectChanges();
    expect(conteneur.contains(element(racine, '.message--erreur'))).toBe(true);
    expect(conteneur.contains(element(racine, '#commandes-reessayer'))).toBe(true);

    // 3. liste, avec sa carte et le lien de détail de la commande
    element<HTMLButtonElement>(racine, '#commandes-reessayer').click();
    fixture.detectChanges();
    charger([commande(512)]);
    expect(conteneur.contains(element(racine, '.commandes__liste'))).toBe(true);
    expect(conteneur.contains(element(racine, '.commandes__carte'))).toBe(true);
    expect(conteneur.contains(element(racine, '.commandes__carte .commandes__actions a'))).toBe(true);
  });
});

/**
 * La protection des routes est vérifiée sur la table réelle ; le refus des autres rôles
 * est couvert par authGuard.spec et roleGuard.spec.
 */
describe('routes de « Mes commandes »', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
    title?: string;
    redirectTo?: string;
    pathMatch?: string;
    loadComponent?: unknown;
  }

  function route(path: string): RouteProtegee {
    const trouvee = routes.find((entree) => entree.path === path);
    if (!trouvee) {
      throw new Error(`Route introuvable : ${path}`);
    }
    return trouvee as unknown as RouteProtegee;
  }

  it.each(['acheteur/commandes', 'acheteur/commandes/:id'])(
    '%s exige authGuard puis roleGuard pour ACHETEUR uniquement',
    (chemin) => {
      const protegee = route(chemin);

      expect(protegee.canActivate?.[0]).toBe(authGuard);
      expect(protegee.canActivate?.[1]).toBe(roleGuard);
      expect(protegee.data).toEqual({ roles: ['ACHETEUR'] });
      expect(typeof protegee.loadComponent).toBe('function');
    },
  );

  it('donne un titre de page distinct à la liste et au détail', () => {
    expect(route('acheteur/commandes').title).toBe('SunuRecolte — Mes commandes');
    expect(route('acheteur/commandes/:id').title).toBe('SunuRecolte — Détail de la commande');
  });

  it('redirecte /acheteur, lien de l’en-tête après connexion, vers la liste', () => {
    expect(route('acheteur')).toEqual({
      path: 'acheteur',
      pathMatch: 'full',
      redirectTo: 'acheteur/commandes',
    });
  });

  it('laisse le tunnel de commande et le panier tels qu’ils sont', () => {
    expect(route('acheteur/commande').data).toEqual({ roles: ['ACHETEUR'] });
    expect(route('acheteur/panier').data).toEqual({ roles: ['ACHETEUR'] });
  });

  it('laisse le catalogue public inchangé', () => {
    const catalogue = route('recoltes');
    expect(catalogue.canActivate).toBeUndefined();
    expect(catalogue.data).toBeUndefined();
  });
});
