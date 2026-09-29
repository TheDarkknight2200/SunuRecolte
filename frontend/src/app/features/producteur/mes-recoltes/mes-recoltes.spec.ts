import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { ProducteurResponse, RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { MesRecoltes } from './mes-recoltes';

const API = 'http://localhost:8080/api';
const MOI = `${API}/producteurs/moi`;
const MES_RECOLTES = `${API}/recoltes/mes-recoltes`;

function produit(id: number, surcharge: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id,
    producteurId: 4,
    nomProducteur: 'Awa Diop',
    localisationProducteur: 'Rufisque',
    produit: 'Tomate',
    description: null,
    quantiteDisponible: 500,
    quantiteMin: null,
    quantiteMax: null,
    unite: 'kg',
    prixUnitaire: 250,
    imageUrl: null,
    localisation: null,
    dateDisponibilite: null,
    statut: 'DISPONIBLE',
    dateCreation: '2026-03-01T09:00:00',
    ...surcharge,
  };
}

function profilProducteur(): ProducteurResponse {
  return {
    id: 4,
    utilisateurId: 4,
    nom: 'Diop',
    prenom: 'Awa',
    email: 'awa.diop@example.sn',
    telephone: '770000000',
    localisationExploitation: 'Rufisque',
    filiere: 'MARAICHAGE',
    description: null,
  };
}

const SESSION: SessionUtilisateur = {
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

function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('MesRecoltes', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<MesRecoltes>;
  let racine: HTMLElement;

  /** Ouvre la page : le constructeur demande le profil, jamais un identifiant client. */
  function ouvrir(questions: Record<string, string> = {}): void {
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
    fixture = TestBed.createComponent(MesRecoltes);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function profilFactice(): TestRequest {
    return http.expectOne(MOI);
  }

  function listeEnAttente(): TestRequest {
    return http.expectOne(MES_RECOLTES);
  }

  /** Les deux requêtes successives de l'ouverture, jusqu'à la liste affichée. */
  function charger(recoltes: RecolteResponse[]): void {
    profilFactice().flush(profilProducteur());
    fixture.detectChanges();
    listeEnAttente().flush(recoltes);
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /** Ouvre la modale de la première récolte de la liste. */
  function ouvrirModale(): void {
    element<HTMLButtonElement>(racine, '.mes-recoltes__carte button').click();
    fixture.detectChanges();
  }

  /** Tab et Shift+Tab sont écoutés sur le document par le piège de focus de la modale. */
  function presserTab(shift: boolean = false): void {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }),
    );
  }

  function escape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande le profil via /producteurs/moi puis la liste sans aucun identifiant client', () => {
    ouvrir();

    const profil = profilFactice();
    expect(profil.request.method).toBe('GET');
    expect(profil.request.urlWithParams).toBe(MOI);
    expect(profil.request.params.keys().length).toBe(0);
    profil.flush(profilProducteur());
    fixture.detectChanges();

    const liste = listeEnAttente();
    expect(liste.request.method).toBe('GET');
    expect(liste.request.urlWithParams).toBe(MES_RECOLTES);
    expect(liste.request.params.has('producteurId')).toBe(false);
    liste.flush([]);
  });

  it('affiche l’état de chargement et jamais l’état vide pendant la requête', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement de vos récoltes…');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Vous n’avez encore aucune récolte');
    expect(racine.querySelector('.mes-recoltes__liste')).toBeNull();

    charger([]);
  });

  it('rappelle l’identité réelle du producteur connecté et le nombre de récoltes', () => {
    ouvrir();
    charger([produit(1), produit(2)]);

    expect(texteDe(racine)).toContain('Espace producteur');
    expect(texteDe(element(racine, 'h1'))).toBe('Mes récoltes');
    expect(texteDe(racine)).toContain('Awa Diop — filière Maraîchage. 2 récoltes publiées.');
  });

  it('affiche les récoltes reçues avec statut, quantités et prix', () => {
    ouvrir();
    charger([
      produit(12, { produit: 'Niébe', quantiteDisponible: 80, prixUnitaire: 900, statut: 'EPUISEE' }),
      produit(7, { description: 'Variété Kent', quantiteMin: 5, quantiteMax: 50 }),
    ]);

    expect(elements<HTMLElement>(racine, '.mes-recoltes__carte .carte__titre').map(texteDe)).toEqual([
      'Niébe',
      'Tomate',
    ]);
    expect(texteDe(elements<HTMLElement>(racine, '.mes-recoltes__carte')[0])).toContain('Épuisée');
    expect(texteDe(elements<HTMLElement>(racine, '.mes-recoltes__carte')[0])).toContain('80 kg');
    expect(sansEspace(texteDe(elements<HTMLElement>(racine, '.mes-recoltes__carte')[0]))).toContain('900FCFA');

    const seconde = elements<HTMLElement>(racine, '.mes-recoltes__carte')[1];
    expect(texteDe(seconde)).toContain('Variété Kent');
    expect(texteDe(seconde)).toContain('Commande minimale');
    expect(texteDe(seconde)).toContain('Commande maximale');
    expect(texteDe(seconde)).toContain('Disponible');
  });

  it('passe sous silence les champs null plutôt que d’inventer une valeur', () => {
    ouvrir();
    charger([produit(1)]);

    const carte = element<HTMLElement>(racine, '.mes-recoltes__carte');
    expect(texteDe(carte)).not.toContain('Commande minimale');
    expect(texteDe(carte)).not.toContain('Disponible à partir du');
    expect(texteDe(carte)).not.toContain('null');
    expect(texteDe(carte)).not.toContain('undefined');
  });

  it('relie chaque récolte à sa modification et à sa fiche publique', () => {
    ouvrir();
    charger([produit(12)]);

    const hrefs = elements<HTMLAnchorElement>(racine, '.mes-recoltes__carte a').map((lien) =>
      sansEspace(lien.getAttribute('href') ?? ''),
    );
    expect(hrefs).toEqual(['/producteur/recoltes/12/modifier', '/recoltes/12']);
  });

  it('offre une entrée vers les commandes reçues sans déplacer « Publier une récolte »', () => {
    ouvrir();
    charger([produit(12)]);

    const liens = elements<HTMLAnchorElement>(racine, '.mes-recoltes__entete a');
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/producteur/recoltes/nouvelle',
      '/producteur/commandes',
    ]);
    expect(texteDe(liens[0])).toContain('Publier une récolte');
    expect(texteDe(liens[1])).toBe('Commandes reçues');
    // La première ancre de l'en-tête reste le déclencheur attendu par le rendu du focus.
    expect(element<HTMLAnchorElement>(racine, '.mes-recoltes__entete a').getAttribute('href')).toBe(
      '/producteur/recoltes/nouvelle',
    );
  });

  it('ne propose aucune saisie de quantité ni de prix dans la liste', () => {
    ouvrir();
    charger([produit(1), produit(2)]);

    expect(racine.querySelector('input')).toBeNull();
    expect(racine.querySelector('select')).toBeNull();
  });

  it('invite à publier une récolte quand la liste est vide', () => {
    ouvrir();
    charger([]);

    expect(texteDe(element(racine, '.etat'))).toContain('Vous n’avez encore aucune récolte.');
    expect(element<HTMLAnchorElement>(racine, '.etat a').getAttribute('href')).toBe(
      '/producteur/recoltes/nouvelle',
    );
  });

  it('annonce la publication depuis le formulaire', () => {
    ouvrir({ recolteCreee: '1' });
    charger([produit(1)]);

    const succes = element<HTMLElement>(racine, '.message--succes');
    expect(succes.getAttribute('role')).toBe('status');
    expect(texteDe(element(racine, '.message--succes p'))).toBe('Votre récolte a été publiée.');
  });

  it('annonce la modification depuis le formulaire', () => {
    ouvrir({ recolteModifiee: '1' });
    charger([]);

    expect(texteDe(element(racine, '.message--succes p'))).toBe('Votre récolte a été modifiée.');
  });

  it('affiche l’erreur du backend avec Réessayer, sans état vide', () => {
    ouvrir();
    profilFactice().flush(profilProducteur());
    fixture.detectChanges();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service est temporairement indisponible.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le service est temporairement indisponible.',
    );
    expect(texteDe(racine)).not.toContain('Vous n’avez encore aucune récolte');
    expect(racine.querySelector('.mes-recoltes__liste')).toBeNull();
  });

  it('Réessayer relance le profil puis la liste', () => {
    ouvrir();
    profilFactice().flush(profilProducteur());
    fixture.detectChanges();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service a refusé la requête.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    cliquer('#erreur-reessayer');

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement de vos récoltes…');
    const profil = profilFactice();
    expect(profil.request.urlWithParams).toBe(MOI);
    profil.flush(profilProducteur());
    fixture.detectChanges();
    const liste = listeEnAttente();
    expect(liste.request.params.has('producteurId')).toBe(false);
    liste.flush([produit(1)]);
    fixture.detectChanges();

    expect(elements(racine, '.mes-recoltes__carte')).toHaveLength(1);
    expect(racine.querySelector('.message--erreur')).toBeNull();
  });

  it('un refus d’accès sur la liste reste un refus : ni déconnexion ni purge', () => {
    localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
    ouvrir();

    profilFactice().flush(profilProducteur());
    fixture.detectChanges();
    listeEnAttente().flush(
      {
        statut: 403,
        message: 'Accès refusé : vous n’avez pas les droits nécessaires pour cette ressource.',
        timestamp: 'x',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
  });

  describe('suppression', () => {
    beforeEach(() => {
      ouvrir();
      charger([produit(12, { produit: 'Tomate' }), produit(7, { produit: 'Mangue' })]);
    });

    it('ne supprime jamais sans confirmation : la modale s’ouvre, aucune requête DELETE', () => {
      ouvrirModale();

      const modale = element(racine, '.mes-recoltes__modale');
      expect(modale.getAttribute('role')).toBe('dialog');
      expect(modale.getAttribute('aria-modal')).toBe('true');
      expect(modale.getAttribute('aria-labelledby')).toBe('suppression-titre');
      expect(texteDe(element(racine, '#suppression-titre'))).toContain(
        'Voulez-vous vraiment supprimer cette récolte ?',
      );
      expect(texteDe(modale)).toContain('Tomate');
      expect(texteDe(modale)).toContain('Cette action est définitive.');
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('chaque bouton de suppression nomme la récolte concernée', () => {
      const libelles = elements<HTMLButtonElement>(racine, '.mes-recoltes__carte button').map(
        (bouton) => bouton.getAttribute('aria-label'),
      );
      expect(libelles).toEqual(['Supprimer la récolte Tomate', 'Supprimer la récolte Mangue']);
    });

    it('Annuler ferme la modale et rend le focus au bouton déclencheur', () => {
      ouvrirModale();
      cliquer('#suppression-annuler');

      expect(racine.querySelector('.mes-recoltes__modale')).toBeNull();
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Supprimer la récolte Tomate');
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
      expect(elements(racine, '.mes-recoltes__carte')).toHaveLength(2);
    });

    it('Escape ferme la modale sans rien supprimer', () => {
      ouvrirModale();
      element(racine, '.mes-recoltes__fond').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      fixture.detectChanges();

      expect(racine.querySelector('.mes-recoltes__modale')).toBeNull();
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('Tab et Shift+Tab restent piégés dans la modale ouverte', () => {
      ouvrirModale();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-annuler');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-confirmer');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-annuler');

      presserTab(true);
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-confirmer');

      expect(element(racine, '.mes-recoltes__modale').contains(document.activeElement)).toBe(true);
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('Escape ferme la modale même quand le focus est sorti dans l’arrière-plan', () => {
      ouvrirModale();
      element<HTMLAnchorElement>(racine, '.mes-recoltes__entete a').focus();
      expect(element(racine, '.mes-recoltes__modale').contains(document.activeElement)).toBe(false);

      escape();

      expect(racine.querySelector('.mes-recoltes__modale')).toBeNull();
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Supprimer la récolte Tomate');
    });

    it('après une suppression confirmée, le focus reprend une cible encore présente', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${API}/recoltes/12`).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      const actif = document.activeElement as HTMLElement;
      expect(actif.tagName).toBe('A');
      expect(actif.isConnected).toBe(true);
      expect(texteDe(actif)).toContain('Publier une récolte');
    });

    it('confirmer envoie DELETE /api/recoltes/{id} avec l’identifiant de l’API', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');

      const requete = http.expectOne(`${API}/recoltes/12`);
      expect(requete.request.method).toBe('DELETE');
      expect(requete.request.params.keys().length).toBe(0);

      requete.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(
        elements<HTMLElement>(racine, '.mes-recoltes__carte .carte__titre').map(texteDe),
      ).toEqual(['Mangue']);
      expect(racine.querySelector('.mes-recoltes__modale')).toBeNull();
    });

    it('204 : le message de succès est annoncé après le retrait de la liste', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${API}/recoltes/12`).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      const succes = element<HTMLElement>(racine, '.message--succes');
      expect(succes.getAttribute('role')).toBe('status');
      expect(texteDe(element(racine, '.message--succes p'))).toBe(
        '« Tomate » a été supprimée du catalogue.',
      );
      expect(texteDe(racine)).toContain('1 récolte publiée');
    });

    it('la modale se verrouille pendant l’envoi : un seul DELETE pour deux clics', () => {
      ouvrirModale();
      const confirmer = element<HTMLButtonElement>(racine, '#suppression-confirmer');

      confirmer.click();
      confirmer.click();
      fixture.detectChanges();

      const suppressions = http.match((requete) => requete.method === 'DELETE');
      expect(suppressions).toHaveLength(1);
      expect(confirmer.disabled).toBe(true);
      expect(confirmer.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(confirmer)).toBe('…');
      expect(element<HTMLButtonElement>(racine, '#suppression-annuler').disabled).toBe(true);

      suppressions[0].flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
    });

    it('400 : la récolte utilisée reste affichée, le message du backend est montré', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');

      http.expectOne(`${API}/recoltes/12`).flush(
        {
          statut: 400,
          message: 'Cette récolte est utilisée dans une commande et ne peut pas être supprimée.',
          timestamp: 'x',
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      const modale = element(racine, '.mes-recoltes__modale');
      expect(texteDe(element(racine, '.mes-recoltes__modale .message--erreur'))).toContain(
        'Cette récolte est utilisée dans une commande et ne peut pas être supprimée.',
      );
      expect(modale.getAttribute('aria-modal')).toBe('true');
      expect(elements(racine, '.mes-recoltes__carte')).toHaveLength(2);
      expect(racine.querySelector('.message--succes')).toBeNull();
    });

    it('403 sur la suppression : refus affiché, session conservée', () => {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));

      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${API}/recoltes/12`).flush(
        { statut: 403, message: 'Accès refusé.', timestamp: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.mes-recoltes__modale .message--erreur'))).toContain(
        'Accès refusé',
      );
      expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
      expect(elements(racine, '.mes-recoltes__carte')).toHaveLength(2);
    });

    it('déplace le focus sur le bouton Annuler à l’ouverture de la modale', () => {
      ouvrirModale();

      expect(document.activeElement?.getAttribute('id')).toBe('suppression-annuler');
    });
  });
});

/**
 * Les gardes sont vérifiées sur la table de routes réelle : la protection de
 * l'espace producteur n'existe pas seulement dans le composant.
 */
describe('routes de l’espace producteur', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
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

  it.each([
    'producteur/recoltes',
    'producteur/recoltes/nouvelle',
    'producteur/recoltes/:id/modifier',
  ])('%s exige authGuard puis roleGuard pour PRODUCTEUR', (chemin) => {
    const protegee = route(chemin);
    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('redirecte /producteur, lien de l’en-tête et du tableau de bord, vers la liste', () => {
    expect(route('producteur')).toEqual({
      path: 'producteur',
      pathMatch: 'full',
      redirectTo: 'producteur/recoltes',
    });
  });

  it('laisse le catalogue public inchangé', () => {
    const catalogue = route('recoltes');
    expect(catalogue.canActivate).toBeUndefined();
    expect(catalogue.data).toBeUndefined();
  });
});
