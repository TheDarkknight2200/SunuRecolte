import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { Subject } from 'rxjs';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CommandeResponse } from '../../../core/modeles/domaine.modeles';
import { StatutCommande } from '../../../core/modeles/referentiels';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { DetailCommande } from './detail-commande';

const API = 'http://localhost:8080/api';
const COMMANDE = `${API}/commandes/512`;

const SESSION: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Fall',
  prenom: 'Moussa',
  email: 'moussa.fall@example.sn',
  role: 'ACHETEUR',
};

function ligne(
  id: number,
  surcharge: Partial<CommandeResponse['lignes'][0]> = {},
): CommandeResponse['lignes'][0] {
  return {
    id,
    recolteId: 41,
    produit: 'Tomate',
    unite: 'kg',
    quantite: 10,
    prixUnitaire: 450,
    sousTotal: 4500,
    ...surcharge,
  };
}

function commande(surcharge: Partial<CommandeResponse> = {}): CommandeResponse {
  return {
    id: 512,
    acheteurId: 7,
    nomAcheteur: 'Moussa Fall',
    dateCreation: '2026-09-20T14:05:09',
    statut: 'EN_ATTENTE',
    total: 4500,
    modeReception: 'RETRAIT',
    adresseLivraison: null,
    telephoneLivraison: null,
    instructionsLivraison: null,
    lignes: [ligne(900)],
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

describe('DetailCommande — consultation', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<DetailCommande>;
  let racine: HTMLElement;
  let parametres: Subject<ParamMap>;

  function ouvrir(id: string | null = '512', avecSession = false): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (avecSession) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
    }
    parametres = new Subject<ParamMap>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: parametres.asObservable() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetailCommande);
    fixture.detectChanges();
    parametres.next(convertToParamMap(id === null ? {} : { id }));
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function demande(id = 512): TestRequest {
    return http.expectOne(`${API}/commandes/${id}`);
  }

  function repondre(corps: CommandeResponse, requete = demande()): void {
    requete.flush(corps);
    fixture.detectChanges();
  }

  function repondreErreur(status: number, message: string, requete = demande()): void {
    requete.flush({ statut: status, message, timestamp: 'x' }, { status, statusText: 'erreur' });
    fixture.detectChanges();
  }

  function changerIdentifiant(id: string): void {
    parametres.next(convertToParamMap({ id }));
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

  it('demande GET /api/commandes/{id} avec l’identifiant de la route, sans aucun paramètre', () => {
    ouvrir();

    const requete = demande();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(COMMANDE);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.urlWithParams).not.toContain('acheteurId');
    requete.flush(commande());
  });

  it('affiche l’état de chargement tant que la commande n’est pas revenue', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement de la commande');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    demande().flush(commande());
  });

  it('un identifiant mal formé est présenté comme introuvable, sans aucune requête', () => {
    ouvrir('abc');

    expect(texteDe(element(racine, '.etat'))).toContain('Commande introuvable.');
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('rend les valeurs du serveur : statut, date, acheteur, réception, lignes et total', () => {
    ouvrir();
    repondre(
      commande({
        statut: 'CONFIRMEE',
        dateCreation: '2026-09-20T14:05:09',
        total: 15300,
        lignes: [ligne(900), ligne(901, { produit: 'Niébé', quantite: 12, prixUnitaire: 900, sousTotal: 10800 })],
      }),
    );

    expect(texteDe(element(racine, 'h1'))).toContain('Commande n° 512');
    expect(elements(racine, 'h1')).toHaveLength(1);
    expect(texteDe(racine)).toContain('Confirmée');
    expect(texteDe(racine)).toContain('20/09/2026 à 14:05');
    expect(texteDe(racine)).toContain('Moussa Fall');
    expect(texteDe(racine)).toContain('Retrait');
    expect(elements(racine, '.detail-commande__ligne').map(texteDe)).toEqual([
      'Tomate 10 kg 450 FCFA / kg 4 500 FCFA',
      'Niébé 12 kg 900 FCFA / kg 10 800 FCFA',
    ]);
    expect(texteDe(element(racine, '.detail-commande__total-libelle'))).toBe('Total');
    expect(texteDe(element(racine, '.detail-commande__total-valeur'))).toBe('15 300 FCFA');
  });

  it('écrit « Total », jamais « Total indicatif » sur une commande enregistrée', () => {
    ouvrir();
    repondre(commande());

    expect(texteDe(element(racine, '.detail-commande__total-libelle'))).toBe('Total');
    expect(texteDe(racine)).not.toContain('indicatif');
  });

  it('explicite le retrait sans inventer d’adresse', () => {
    ouvrir();
    repondre(commande({ modeReception: 'RETRAIT' }));

    expect(texteDe(racine)).toContain('Retrait : vous récupérez la commande auprès du producteur.');
    expect(texteDe(racine)).not.toContain('Adresse de livraison');
  });

  it('affiche adresse, téléphone et instructions en livraison, et « — » quand une valeur absente', () => {
    ouvrir();
    repondre(
      commande({
        modeReception: 'LIVRAISON',
        adresseLivraison: 'Rue 10, Sacré-Cœur 3, Dakar',
        telephoneLivraison: '771234567',
        instructionsLivraison: null,
      }),
    );

    const valeurs = elements(racine, '.detail-commande__champs dd').map(texteDe);
    expect(valeurs).toContain('Rue 10, Sacré-Cœur 3, Dakar');
    expect(valeurs).toContain('771234567');
    expect(valeurs).toContain('—');
  });

  it('une commande inconnue du serveur est présentée comme introuvable', () => {
    ouvrir();
    repondreErreur(404, "Commande introuvable avec l'id : 512");

    expect(texteDe(element(racine, '.etat'))).toContain('Commande introuvable.');
    expect(element<HTMLAnchorElement>(racine, '.etat a').getAttribute('href')).toBe(
      '/acheteur/commandes',
    );
  });

  it('un 403 reste un refus affiché : aucune purge de session, aucune redirection', () => {
    ouvrir('512', true);
    repondreErreur(
      403,
      'Accès refusé : vous n’avez pas les droits nécessaires pour cette ressource.',
    );

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(racine.querySelector('.etat')).toBeNull();
  });

  it('une erreur de serveur propose une reprise qui relance exactement une requête', () => {
    ouvrir();
    repondreErreur(500, 'Une erreur interne est survenue. Veuillez réessayer.');

    cliquer('#commande-reessayer');
    const relance = demande();
    expect(relance.request.method).toBe('GET');
    relance.flush(commande());
    fixture.detectChanges();

    expect(elements(racine, '.detail-commande__ligne')).toHaveLength(1);
  });

  it('change de commande quand l’identifiant de la route change', () => {
    ouvrir();
    repondre(commande());

    changerIdentifiant('511');
    demande(511).flush(commande({ id: 511, statut: 'LIVREE', total: 9900 }));
    fixture.detectChanges();

    expect(texteDe(element(racine, 'h1'))).toContain('Commande n° 511');
    expect(texteDe(racine)).toContain('9 900 FCFA');
  });

  it('n’appelle ni paiement ni récolte : la page ne fait que lire la commande', () => {
    ouvrir();
    repondre(commande());

    expect(http.match((requete) => requete.url.startsWith(`${API}/paiements`))).toHaveLength(0);
    expect(http.match((requete) => requete.url.startsWith(`${API}/recoltes`))).toHaveLength(0);
    expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
  });

  it.each([
    ['EN_ATTENTE', true],
    ['CONFIRMEE', true],
    ['PRETE', false],
    ['LIVREE', false],
    ['ANNULEE', false],
  ] as const)('%s : bouton d’annulation %s', (statut, attendu) => {
    ouvrir();
    repondre(commande({ statut }));

    expect(racine.querySelector('#commande-annuler') !== null).toBe(attendu);
  });

  // L'accès au paiement est le reflet des trois statuts que le backend accepte ; proposer
  // le lien ne déclenche aucun appel, la vérification reste côté service paiement.
  it.each([
    ['EN_ATTENTE', true],
    ['CONFIRMEE', true],
    ['PRETE', true],
    ['LIVREE', false],
    ['ANNULEE', false],
  ] as const)('%s : accès au paiement %s', (statut, attendu) => {
    ouvrir();
    repondre(commande({ statut }));

    expect(racine.querySelector('#commande-payer') !== null).toBe(attendu);
  });

  it('le lien de paiement vise l’écran de paiement de cette commande, sans aucun appel', () => {
    ouvrir();
    repondre(commande({ statut: 'PRETE' }));

    const lien = element<HTMLAnchorElement>(racine, '#commande-payer');
    expect(texteDe(lien)).toBe('Payer la commande');
    expect(lien.getAttribute('href')).toBe('/acheteur/paiement/512');
    expect(http.match((requete) => requete.url.startsWith(`${API}/paiements`))).toHaveLength(0);
  });

  it('habille le statut avec le libellé et la variante attendus', () => {
    ouvrir();
    repondre(commande({ statut: 'PRETE' }));

    const badge = element(racine, '.badge');
    expect(texteDe(badge)).toBe('Prête');
    expect(badge.classList.contains('badge--primaire')).toBe(true);
  });

  it('ne montre aucun vocabulaire de paiement sur une commande livrée', () => {
    ouvrir();
    repondre(commande({ statut: 'LIVREE' }));

    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['payé', 'paiement', 'transaction', 'wave', 'orange money', 'simu-']) {
      expect(texte).not.toContain(terme);
    }
  });
});

describe('DetailCommande — annulation', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<DetailCommande>;
  let racine: HTMLElement;
  let parametres: Subject<ParamMap>;

  function ouvrir(statut: StatutCommande = 'CONFIRMEE', avecSession = false): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (avecSession) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
    }
    parametres = new Subject<ParamMap>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: parametres.asObservable() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetailCommande);
    fixture.detectChanges();
    parametres.next(convertToParamMap({ id: '512' }));
    fixture.detectChanges();
    http.expectOne(`${API}/commandes/512`).flush(commande({ statut }));
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function ouvrirModale(): void {
    element<HTMLButtonElement>(racine, '#commande-annuler').click();
    fixture.detectChanges();
  }

  function demandePatching(): TestRequest {
    return http.expectOne(`${API}/commandes/512/statut`);
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

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

  it('un premier clic ouvre la modale sans aucune requête', () => {
    ouvrir();
    ouvrirModale();

    const modale = element(racine, '.modale');
    expect(modale.getAttribute('role')).toBe('dialog');
    expect(modale.getAttribute('aria-modal')).toBe('true');
    expect(modale.getAttribute('aria-labelledby')).toBe('annulation-titre');
    expect(texteDe(element(racine, '#annulation-titre'))).toBe(
      'Voulez-vous vraiment annuler cette commande ?',
    );
    expect(texteDe(modale)).toContain('La commande n° 512 (4 500 FCFA) sera annulée.');
    expect(texteDe(modale)).toContain('Cette action est définitive.');
    expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
  });

  it('le bouton destructif nomme l’effet réel et le focus se pose sur la sortie', () => {
    ouvrir();
    ouvrirModale();

    expect(texteDe(element(racine, '#annulation-confirmer'))).toBe('Annuler la commande');
    expect(element(racine, '#annulation-confirmer').classList.contains('bouton--danger')).toBe(true);
    expect(document.activeElement?.getAttribute('id')).toBe('annulation-annuler');
  });

  it('Tab et Shift+Tab restent piégés dans la modale ouverte', () => {
    ouvrir();
    ouvrirModale();

    presserTab();
    expect(document.activeElement?.getAttribute('id')).toBe('annulation-confirmer');

    presserTab();
    expect(document.activeElement?.getAttribute('id')).toBe('annulation-annuler');

    presserTab(true);
    expect(document.activeElement?.getAttribute('id')).toBe('annulation-confirmer');

    expect(element(racine, '.modale').contains(document.activeElement)).toBe(true);
    expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
  });

  it('Escape ferme la modale même quand le focus est sorti dans l’arrière-plan', () => {
    ouvrir();
    ouvrirModale();
    element<HTMLAnchorElement>(racine, '#lien-retour').focus();
    expect(element(racine, '.modale').contains(document.activeElement)).toBe(false);

    escape();

    expect(racine.querySelector('.modale')).toBeNull();
    expect(document.activeElement?.getAttribute('id')).toBe('commande-annuler');
    expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
  });

  it('Garder la commande referme la modale et rend le focus au déclencheur', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-annuler');

    expect(racine.querySelector('.modale')).toBeNull();
    expect(document.activeElement?.getAttribute('id')).toBe('commande-annuler');
  });

  it('un clic sur le fond referme la modale', () => {
    ouvrir();
    ouvrirModale();

    element(racine, '.voile').click();
    fixture.detectChanges();

    expect(racine.querySelector('.modale')).toBeNull();
  });

  it('confirmer envoie exactement un PATCH /api/commandes/{id}/statut, corps réduit à statut', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-confirmer');

    const requete = demandePatching();
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.urlWithParams).toBe(`${API}/commandes/512/statut`);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toEqual({ statut: 'ANNULEE' });
    requete.flush(commande({ statut: 'ANNULEE' }));
  });

  it('deux clics sur « Annuler la commande » ne produisent qu’une seule requête', () => {
    ouvrir();
    ouvrirModale();

    const confirmer = element<HTMLButtonElement>(racine, '#annulation-confirmer');
    confirmer.click();
    confirmer.click();
    fixture.detectChanges();

    const patches = http.match((requete) => requete.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(confirmer.disabled).toBe(true);
    expect(confirmer.getAttribute('aria-busy')).toBe('true');
    expect(texteDe(confirmer)).toBe('…');
    expect(element<HTMLButtonElement>(racine, '#annulation-annuler').disabled).toBe(true);

    patches[0].flush(commande({ statut: 'ANNULEE' }));
    fixture.detectChanges();
  });

  it('la modale se referme sur la commande renvoyée par le serveur, statut Annulée affiché', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-confirmer');

    demandePatching().flush(
      commande({
        statut: 'ANNULEE',
        total: 4500,
        lignes: [ligne(900)],
      }),
    );
    fixture.detectChanges();

    const badge = element(racine, '.badge');
    expect(texteDe(badge)).toBe('Annulée');
    expect(badge.classList.contains('badge--erreur')).toBe(true);
    expect(racine.querySelector('.modale')).toBeNull();
    expect(racine.querySelector('#commande-annuler')).toBeNull();
    expect(elements(racine, '.detail-commande__ligne')).toHaveLength(1);
  });

  it('le succès est annoncé et le focus reprend une cible encore présente', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-confirmer');
    demandePatching().flush(commande({ statut: 'ANNULEE' }));
    fixture.detectChanges();

    const succes = element(racine, '.message--succes');
    expect(succes.getAttribute('role')).toBe('status');
    expect(texteDe(element(racine, '.message--succes p'))).toBe(
      'La commande n° 512 a été annulée.',
    );

    const actif = document.activeElement as HTMLElement;
    expect(actif.tagName).toBe('A');
    expect(actif.isConnected).toBe(true);
    expect(actif.getAttribute('id')).toBe('lien-retour');
  });

  it('400 : transition refusée, la commande garde son statut affiché et la modale reste ouverte', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-confirmer');

    demandePatching().flush(
      {
        statut: 400,
        message: 'Transition de statut interdite : LIVREE vers ANNULEE.',
        timestamp: 'x',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const modale = element(racine, '.modale');
    expect(modale.getAttribute('aria-modal')).toBe('true');
    expect(texteDe(element(racine, '.modale .message--erreur'))).toBe(
      'Transition de statut interdite : LIVREE vers ANNULEE.',
    );
    expect(element(racine, '.message--erreur').getAttribute('role')).toBe('alert');
    expect(texteDe(element(racine, '.badge'))).toBe('Confirmée');
    expect(racine.querySelector('.message--succes')).toBeNull();
    expect(element<HTMLButtonElement>(racine, '#annulation-confirmer').disabled).toBe(false);
  });

  it('403 : refus affiché, session conservée, aucune réécriture locale du statut', () => {
    ouvrir('EN_ATTENTE', true);
    ouvrirModale();
    cliquer('#annulation-confirmer');

    demandePatching().flush(
      { statut: 403, message: 'Accès refusé : vous n’avez pas les droits nécessaires.', timestamp: 'x' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.modale .message--erreur'))).toContain(
      'Accès refusé',
    );
    expect(texteDe(element(racine, '.badge'))).toBe('En attente');
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
  });

  it('une panne réseau est annoncée sans faire croire à une annulation', () => {
    ouvrir();
    ouvrirModale();
    cliquer('#annulation-confirmer');

    demandePatching().error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Connexion coupée',
    });
    fixture.detectChanges();

    expect(texteDe(element(racine, '.modale .message--erreur'))).toContain(
      'serveur est injoignable',
    );
    expect(texteDe(element(racine, '.badge'))).toBe('Confirmée');
    expect(racine.querySelector('.message--succes')).toBeNull();
  });

  it('l’annulation ne mentionne jamais un paiement', () => {
    ouvrir();
    ouvrirModale();
    const texteModale = texteDe(element(racine, '.modale')).toLowerCase();
    expect(texteModale).not.toContain('paiement');
    expect(texteModale).not.toContain('payé');

    cliquer('#annulation-confirmer');
    demandePatching().flush(commande({ statut: 'ANNULEE' }));
    fixture.detectChanges();

    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['payé', 'paiement', 'transaction', 'wave', 'orange money', 'simu-']) {
      expect(texte).not.toContain(terme);
    }
  });
});
