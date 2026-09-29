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
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CommandeResponse, PaiementResponse } from '../../../core/modeles/domaine.modeles';
import { MoyenPaiement, MOYENS_PAIEMENT, StatutCommande } from '../../../core/modeles/referentiels';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { CLE_PANIER } from '../../../core/services/panier.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { Paiement } from './paiement';

const API = 'http://localhost:8080/api';
const COMMANDE = `${API}/commandes/512`;
const PAIEMENTS = `${API}/paiements`;
const PAIEMENT_PAR_COMMANDE = `${API}/paiements/commande/512`;

const SESSION: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Fall',
  prenom: 'Moussa',
  email: 'moussa.fall@example.sn',
  role: 'ACHETEUR',
};

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
    lignes: [
      {
        id: 900,
        recolteId: 41,
        produit: 'Tomate',
        unite: 'kg',
        quantite: 10,
        prixUnitaire: 450,
        sousTotal: 4500,
      },
    ],
    ...surcharge,
  };
}

/**
 * Fixture de paiement : `EN_ATTENTE` et référence `SIMU-…`, c'est-à-dire ce que le
 * backend produit réellement. Aucun numéro financier véritable n'apparaît ici.
 */
function paiement(surcharge: Partial<PaiementResponse> = {}): PaiementResponse {
  return {
    id: 77,
    commandeId: 512,
    referenceTransaction: 'SIMU-fiche-558',
    montant: 4500,
    moyenPaiement: 'WAVE',
    statut: 'EN_ATTENTE',
    dateCreation: '2026-09-21T09:17:42',
    dateConfirmation: null,
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
  // Les glyphes Material Symbols sont des caractères de zone à usage privé : ils ne
  // sont pas du texte et sont retirés avant comparaison.
  return (noeud.textContent ?? '')
    .replace(/[\uE000-\uF8FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('Paiement — écran de paiement simulé', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Paiement>;
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
    fixture = TestBed.createComponent(Paiement);
    fixture.detectChanges();
    parametres.next(convertToParamMap(id === null ? {} : { id }));
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function demande(url: string, methode = 'GET'): TestRequest {
    return http.expectOne((requete) => requete.url === url && requete.method === methode);
  }

  /** Première lecture : la commande visée par la route. */
  function lireCommande(corps: CommandeResponse): void {
    demande(COMMANDE).flush(corps);
    fixture.detectChanges();
  }

  /** Second lecture : le pré-contrôle. 404 = aucun paiement enregistré. */
  function lirePaiement(corps: PaiementResponse | null): void {
    const requete = demande(PAIEMENT_PAR_COMMANDE);
    if (corps === null) {
      requete.flush(
        { statut: 404, message: 'Aucun paiement n’existe pour la commande : 512', timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
    } else {
      requete.flush(corps);
    }
    fixture.detectChanges();
  }

  function sansPaiement(corps: CommandeResponse = commande()): void {
    ouvrir();
    lireCommande(corps);
    lirePaiement(null);
  }

  function erreurHttp(status: number, message: string, url = COMMANDE): void {
    demande(url).flush(
      { statut: status, message, timestamp: 'x' },
      { status, statusText: 'erreur' },
    );
    fixture.detectChanges();
  }

  /**
   * `formControlName` transforme `[value]` en entrée du RadioControlValueAccessor : le
   * moyen n'est pas écrit dans le DOM. Les radios sont donc repérés par leur ordre,
   * celui de `MOYENS_PAIEMENT`, et la valeur transmise est vérifiée sur le corps du POST.
   */
  function radio(moyen: MoyenPaiement): HTMLInputElement {
    const trouve = elements<HTMLInputElement>(
      racine,
      'input[formcontrolname="moyenPaiement"]',
    )[MOYENS_PAIEMENT.indexOf(moyen)];
    if (!trouve) {
      throw new Error(`Radio du moyen introuvable : ${moyen}`);
    }
    return trouve;
  }

  function choisir(moyen: MoyenPaiement): void {
    radio(moyen).click();
    fixture.detectChanges();
  }

  function soumettre(): void {
    element(racine, 'form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  function simulation(moyen: MoyenPaiement = 'WAVE'): TestRequest {
    choisir(moyen);
    soumettre();
    return demande(PAIEMENTS, 'POST');
  }

  /** Un clic puis la réponse du serveur, rendue immédiatement. */
  function reponseServeur(corps: PaiementResponse, moyen: MoyenPaiement = 'WAVE'): void {
    simulation(moyen).flush(corps);
    fixture.detectChanges();
  }

  /** Un clic puis le refus du serveur, rendu avec son message. */
  function refusServeur(status: number, message: string): void {
    simulation().flush(
      { statut: status, message, timestamp: 'x' },
      { status, statusText: 'Erreur' },
    );
    fixture.detectChanges();
  }

  /** Le texte de l'alerte, hors bouton « Réessayer » qui la suit. */
  function texteAlerte(): string {
    return texteDe(element(racine, '.message--erreur p'));
  }

  /** Valeur d'un champ de la fiche du paiement (le second `dl` de l'écran). */
  function valeurFiche(libelle: string): string {
    const champs = elements(racine, '.paiement__champs')[1];
    if (champs === undefined) {
      throw new Error('Fiche du paiement absente.');
    }
    const entree = elements<HTMLDivElement>(champs, 'div').find(
      (ligne) => texteDe(element(ligne, 'dt')) === libelle,
    );
    if (entree === undefined) {
      throw new Error(`Champ de la fiche introuvable : ${libelle}`);
    }
    return texteDe(element(entree, 'dd'));
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  // === Ouverture : la commande d'abord, le pré-contrôle ensuite ===

  it('lit la commande puis le paiement existant, dans cet ordre, sans aucun paramètre', () => {
    ouvrir();

    const lectureCommande = demande(COMMANDE);
    expect(lectureCommande.request.method).toBe('GET');
    expect(lectureCommande.request.urlWithParams).toBe(COMMANDE);
    expect(lectureCommande.request.params.keys()).toEqual([]);
    expect(lectureCommande.request.body).toBeNull();
    lectureCommande.flush(commande());

    const lecturePaiement = demande(PAIEMENT_PAR_COMMANDE);
    expect(lecturePaiement.request.method).toBe('GET');
    expect(lecturePaiement.request.urlWithParams).toBe(PAIEMENT_PAR_COMMANDE);
    expect(lecturePaiement.request.params.keys()).toEqual([]);
    expect(lecturePaiement.request.urlWithParams).not.toContain('acheteurId');
    lecturePaiement.flush(
      { statut: 404, message: 'Aucun paiement n’existe pour la commande : 512', timestamp: 'x' },
      { status: 404, statusText: 'Not Found' },
    );
  });

  it('reste en chargement tant que le pré-contrôle n’a pas répondu', () => {
    ouvrir();
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement de la commande');
    expect(racine.querySelector('form')).toBeNull();

    lireCommande(commande());
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement de la commande');
    lirePaiement(null);
    expect(racine.querySelector('.etat')).toBeNull();
  });

  it('un 404 du pré-contrôle est une information normale : le formulaire est proposé', () => {
    sansPaiement();

    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(element<HTMLButtonElement>(racine, '#paiement-simuler').disabled).toBe(false);
  });

  it('un identifiant mal formé est présenté comme introuvable, sans aucune requête', () => {
    ouvrir('abc');

    expect(texteDe(element(racine, '.etat'))).toContain('Commande introuvable.');
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('commande inexistante : introuvable, et le pré-contrôle n’est jamais envoyé', () => {
    ouvrir();
    erreurHttp(404, 'La commande demandée n’existe pas.');

    expect(texteDe(element(racine, '.etat'))).toContain('Commande introuvable.');
    expect(http.match((requete) => requete.url.startsWith(PAIEMENTS))).toHaveLength(0);
  });

  it('commande payée par un autre acheteur : 403 affiché, session conservée, aucun formulaire', () => {
    ouvrir('512', true);
    const jeton = localStorage.getItem(CLE_JETON);

    erreurHttp(
      403,
      'Accès refusé : vous n’êtes pas le propriétaire de cette commande.',
    );

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Accès refusé : vous n’êtes pas le propriétaire de cette commande.',
    );
    expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
    expect(racine.querySelector('form')).toBeNull();
  });

  it('un 401 reste le message du serveur : l’écran ne purge rien lui-même', () => {
    ouvrir();
    erreurHttp(401, 'Authentification requise : fournissez un jeton JWT valide.');

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Authentification requise : fournissez un jeton JWT valide.',
    );
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
    expect(racine.querySelector('form')).toBeNull();
  });

  it('une erreur sans message lisible retombe sur un texte générique, jamais une trace technique', () => {
    ouvrir();
    demande(COMMANDE).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(texteAlerte()).toBe('Impossible de charger cette commande.');
    const texte = texteDe(racine).toLowerCase();
    for (const trace of ['error', 'exception', 'stack', 'http']) {
      expect(texte).not.toContain(trace);
    }
  });

  it('le pré-contrôle en erreur 500 bloque la soumission : rien n’est deviné', () => {
    ouvrir();
    lireCommande(commande());
    erreurHttp(500, 'Le serveur est momentanément indisponible.', PAIEMENT_PAR_COMMANDE);

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le serveur est momentanément indisponible.',
    );
    expect(racine.querySelector('form')).toBeNull();
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });

  it('commande injoignable : un seul message, aucun paiement enregistré affiché', () => {
    ouvrir();
    demande(COMMANDE).error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });
    fixture.detectChanges();

    expect(texteAlerte()).toBe(
      'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
    );
    expect(racine.querySelector('form')).toBeNull();
  });

  it('« Réessayer » relit la commande puis le paiement', () => {
    ouvrir();
    erreurHttp(500, 'Le serveur est momentanément indisponible.');

    cliquer('#paiement-reessayer');
    expect(demande(COMMANDE).request.method).toBe('GET');
  });

  // === La mention de simulation n’est jamais conditionnelle ===

  it('affichée pendant le chargement', () => {
    ouvrir();

    expect(texteDe(element(racine, '.paiement__simulation'))).toBe(
      'Paiement simulé — aucune transaction réelle n’est effectuée.',
    );
    demande(COMMANDE).flush(
      { statut: 404, message: 'La commande demandée n’existe pas.', timestamp: 'x' },
      { status: 404, statusText: 'Not Found' },
    );
  });

  it('affichée sur une commande introuvable', () => {
    ouvrir('abc');

    expect(texteDe(element(racine, '.paiement__simulation'))).toContain(
      'aucune transaction réelle',
    );
  });

  it('affichée sur un refus', () => {
    ouvrir();
    erreurHttp(403, 'Accès refusé.');

    expect(texteDe(element(racine, '.paiement__simulation'))).toContain(
      'aucune transaction réelle',
    );
  });

  it('affichée avec le formulaire et avec la fiche d’un paiement enregistré', () => {
    sansPaiement();
    expect(texteDe(element(racine, '.paiement__simulation'))).toContain('aucune transaction réelle');

    ouvrir();
    lireCommande(commande());
    lirePaiement(paiement());
    expect(texteDe(element(racine, '.paiement__simulation'))).toContain('aucune transaction réelle');
  });

  // === Montants : l'autorité est la commande du serveur ===

  it('affiche le total renvoyé par la commande, formaté', () => {
    sansPaiement(commande({ total: 15300 }));

    expect(texteDe(element(racine, '.paiement__total'))).toBe('15 300 FCFA');
    expect(texteDe(element(racine, 'h1'))).toBe('Paiement simulé — commande n° 512');
    expect(texteDe(racine)).toContain(
      'Montant calculé par le serveur lors de la commande',
    );
  });

  it('ne lit jamais le panier local : un panier concurrent ne change ni montant ni requête', () => {
    ouvrir();
    localStorage.setItem(
      CLE_PANIER,
      JSON.stringify([{ recolteId: 41, produit: 'Tomate', quantite: 99, prixUnitaire: 9999 }]),
    );
    lireCommande(commande({ total: 4500 }));
    lirePaiement(null);

    const texte = texteDe(racine);
    expect(texte).toContain('4 500 FCFA');
    expect(texte).not.toContain('999 ');
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });

  // === Le moyen de paiement ===

  it('propose exactement Wave et Orange Money, en radios d’un même groupe', () => {
    sansPaiement();

    const radios = elements<HTMLInputElement>(racine, 'input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios.every((entree) => entree.getAttribute('name') === 'moyenPaiement')).toBe(true);
    expect(elements(racine, '.paiement__option-nom').map(texteDe)).toEqual([
      'Wave',
      'Orange Money',
    ]);

    // Le moyen réellement transmis est vérifié ici, et non sur un attribut `value` que
    // le RadioControlValueAccessor n'écrit pas dans le DOM.
    const requete = simulation('ORANGE_MONEY');
    expect(requete.request.body).toEqual({ commandeId: 512, moyenPaiement: 'ORANGE_MONEY' });
    expect(radio('ORANGE_MONEY').checked).toBe(true);
    requete.flush(paiement({ moyenPaiement: 'ORANGE_MONEY' }));
  });

  it('regroupe le choix dans un fieldset annoncé par sa légende', () => {
    sansPaiement();

    const groupe = element(racine, 'fieldset');
    expect(texteDe(element(groupe, 'legend'))).toBe('Moyen de paiement');
    expect(texteDe(groupe)).toContain('Aucun débit n’est effectué.');
  });

  it('n’accepte aucun champ sensible : ni carte, ni CVV, ni compte, ni mot de passe, ni OTP', () => {
    sansPaiement();

    expect(elements<HTMLInputElement>(racine, 'input').every((entree) => entree.type === 'radio')).toBe(
      true,
    );
    expect(racine.querySelector('input[type="password"]')).toBeNull();
    expect(racine.querySelector('input[type="number"], input[type="tel"]')).toBeNull();
    expect(racine.querySelector('select, textarea')).toBeNull();

    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['carte', 'cvv', 'iban', 'compte bancaire', 'mot de passe', 'otp']) {
      expect(texte).not.toContain(terme);
    }
  });

  it('marque le choix retenu autrement que par la couleur', () => {
    sansPaiement();
    expect(racine.querySelector('.paiement__option--choisi')).toBeNull();

    choisir('ORANGE_MONEY');
    expect(texteDe(element(racine, '.paiement__option--choisi'))).toContain('Orange Money');
    expect(radio('ORANGE_MONEY').checked).toBe(true);
    expect(radio('WAVE').checked).toBe(false);
  });

  // === Soumission ===

  it('sans choix, aucune requête n’est envoyée et l’écran demande un moyen', () => {
    sansPaiement();
    soumettre();

    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
    expect(texteDe(element(racine, '#paiement-moyen-erreur'))).toBe(
      'Choisissez un moyen de paiement pour continuer.',
    );
    expect(element(racine, '#paiement-moyen-erreur').getAttribute('role')).toBe('alert');
    expect(element(racine, 'fieldset').getAttribute('aria-describedby')).toBe(
      'paiement-moyen-erreur',
    );
  });

  // Défaut relevé en QA navigateur : le message survivait au choix et l'écran paraissait cassé.
  it('un choix après un refus efface le message, sans envoyer de requête', () => {
    sansPaiement();
    soumettre();
    expect(racine.querySelector('#paiement-moyen-erreur')).not.toBeNull();

    choisir('WAVE');

    expect(racine.querySelector('#paiement-moyen-erreur')).toBeNull();
    expect(element(racine, 'fieldset').getAttribute('aria-describedby')).toBeNull();
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });

  it('envoie exactement PaiementRequest : commandeId et moyenPaiement, rien d’autre', () => {
    sansPaiement();
    const requete = simulation('ORANGE_MONEY');

    expect(requete.request.urlWithParams).toBe(PAIEMENTS);
    expect(requete.request.body).toEqual({
      commandeId: 512,
      moyenPaiement: 'ORANGE_MONEY',
    });
    expect(Object.keys(requete.request.body as Record<string, unknown>).sort()).toEqual([
      'commandeId',
      'moyenPaiement',
    ]);
    requete.flush(paiement({ moyenPaiement: 'ORANGE_MONEY' }));
  });

  it('ne transmet ni acheteur, ni montant, ni total : le serveur les calcule', () => {
    sansPaiement();
    const requete = simulation();

    expect(JSON.stringify(requete.request.body)).not.toMatch(
      /acheteur|montant|total|carte|otp|reference/i,
    );
    requete.flush(paiement());
  });

  it('utilise l’identifiant renvoyé par le serveur, pas celui de l’URL', () => {
    ouvrir();
    lireCommande(commande({ id: 913 }));

    const requete = demande(`${API}/paiements/commande/913`);
    expect(requete.request.method).toBe('GET');
    requete.flush(
      { statut: 404, message: 'Aucun paiement n’existe pour la commande : 913', timestamp: 'x' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    choisir('WAVE');
    soumettre();
    const simulationRequise = demande(PAIEMENTS, 'POST');
    expect(simulationRequise.request.body).toEqual({
      commandeId: 913,
      moyenPaiement: 'WAVE',
    });
    simulationRequise.flush(paiement({ commandeId: 913, id: 78 }));
  });

  it('deux clics consécutifs ne produisent qu’une seule simulation', () => {
    sansPaiement();
    choisir('WAVE');
    const bouton = element<HTMLButtonElement>(racine, '#paiement-simuler');

    bouton.click();
    fixture.detectChanges();
    expect(bouton.disabled).toBe(true);
    expect(texteDe(bouton)).toBe('Enregistrement…');
    expect(bouton.getAttribute('aria-busy')).toBe('true');
    bouton.click();
    fixture.detectChanges();

    const requetes = http.match((requete) => requete.method === 'POST');
    expect(requetes).toHaveLength(1);
    requetes[0].flush(paiement());
  });

  it('un échec rend le bouton actif, sans seconde requête automatique', () => {
    sansPaiement();
    refusServeur(400, 'Un paiement existe déjà pour cette commande.');

    expect(element<HTMLButtonElement>(racine, '#paiement-simuler').disabled).toBe(false);
    expect(http.match((seconde) => seconde.method === 'POST')).toHaveLength(0);
  });

  // === Résultat : uniquement ce que renvoie le serveur ===

  it('EN_ATTENTE : la phrase de simulation, jamais un paiement réussi', () => {
    sansPaiement();
    reponseServeur(paiement());

    expect(texteDe(element(racine, '#paiement-resultat-titre'))).toBe(
      'Simulation enregistrée — paiement en attente.',
    );
    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['payé', 'réussi', 'confirmé', 'vous avez payé', 'transaction réussie']) {
      expect(texte).not.toContain(terme);
    }
  });

  it('présente le statut renvoyé tel quel : un ANNULE serveur n’est pas adouci', () => {
    sansPaiement();
    reponseServeur(paiement({ statut: 'ANNULE' }));

    expect(texteDe(element(racine, '#paiement-resultat-titre'))).toBe(
      'Paiement annulé : la commande a été annulée.',
    );
    expect(valeurFiche('Statut du paiement')).toBe('Annulé');
    expect(texteDe(racine)).not.toContain('Réussi');
  });

  it('conserve toutes les valeurs de PaiementResponse, y compris le moyen choisi', () => {
    sansPaiement();
    reponseServeur(
      paiement({ montant: 15300, moyenPaiement: 'ORANGE_MONEY', referenceTransaction: 'SIMU-x' }),
      'ORANGE_MONEY',
    );

    expect(valeurFiche('Moyen')).toBe('Orange Money');
    expect(valeurFiche('Montant')).toBe('15 300 FCFA');
    expect(valeurFiche('Référence de simulation')).toBe('SIMU-x');
    expect(valeurFiche('Date de la demande')).toBe('21/09/2026 à 09:17');
  });

  it('une confirmation absente est un signe, jamais « null » ni case vide', () => {
    sansPaiement();
    reponseServeur(paiement());

    expect(valeurFiche('Date de confirmation')).toBe('—');
    expect(texteDe(racine)).not.toMatch(/null/i);
  });

  it('la référence SIMU- est annoncée comme référence de simulation', () => {
    sansPaiement();
    reponseServeur(paiement());

    expect(texteDe(racine)).toContain('Référence de simulation');
    expect(texteDe(element(racine, '.paiement__notice'))).toContain(
      'Elle ne correspond à aucune transaction bancaire ni mobile.',
    );
  });

  it('le résultat est annoncé aux lecteurs d’écran et le focus y est posé', () => {
    sansPaiement();
    reponseServeur(paiement());

    const zones = elements(racine, '[role="status"]');
    expect(zones).toHaveLength(1);
    expect(zones[0].getAttribute('aria-labelledby')).toBe('paiement-resultat-titre');
    expect(document.activeElement?.id).toBe('paiement-resultat-titre');
  });

  it('après l’enregistrement, plus aucun formulaire : une seconde simulation est impossible', () => {
    sansPaiement();
    reponseServeur(paiement());

    expect(racine.querySelector('form')).toBeNull();
    expect(racine.querySelector('#paiement-simuler')).toBeNull();
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });

  it('un paiement déjà enregistré est présenté sans formulaire ni POST', () => {
    ouvrir();
    lireCommande(commande());
    lirePaiement(paiement({ statut: 'EN_ATTENTE' }));

    expect(racine.querySelector('form')).toBeNull();
    expect(texteDe(element(racine, '#paiement-resultat-titre'))).toBe(
      'Simulation enregistrée — paiement en attente.',
    );
    expect(elements(racine, '[role="status"]')).toHaveLength(0);
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });

  it.each([
    'Un paiement existe déjà pour cette commande.',
    "Impossible d'initier un paiement pour une commande annulée.",
    'Cette commande est déjà livrée.',
  ])('400 serveur « %s » est repris mot pour mot', (message) => {
    sansPaiement();
    refusServeur(400, message);

    expect(texteDe(element(racine, '.message--erreur'))).toContain(message);
    expect(racine.querySelector('#paiement-resultat-titre')).toBeNull();
    expect(element<HTMLButtonElement>(racine, '#paiement-simuler').disabled).toBe(false);
  });

  it('un 403 sur la simulation reste un refus, sans déconnexion', () => {
    ouvrir('512', true);
    const jeton = localStorage.getItem(CLE_JETON);
    lireCommande(commande());
    lirePaiement(null);

    refusServeur(403, 'Accès refusé pour cette commande.');

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Accès refusé pour cette commande.',
    );
    expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
  });

  // === Reflet strict des statuts acceptés par le backend ===

  it.each([
    ['EN_ATTENTE', true],
    ['CONFIRMEE', true],
    ['PRETE', true],
    ['LIVREE', false],
    ['ANNULEE', false],
  ] as const)('%s : formulaire %s', (statut: StatutCommande, attendu: boolean) => {
    sansPaiement(commande({ statut }));

    expect(racine.querySelector('#paiement-simuler') !== null).toBe(attendu);
  });

  it('une commande annulée ou livrée explique le refus sans inventer de statut', () => {
    sansPaiement(commande({ statut: 'ANNULEE' }));
    expect(texteDe(element(racine, '.paiement__notice--refus'))).toBe(
      'Le paiement n’est pas disponible : cette commande est annulée.',
    );

    ouvrir();
    lireCommande(commande({ statut: 'LIVREE' }));
    lirePaiement(null);
    expect(texteDe(element(racine, '.paiement__notice--refus'))).toBe(
      'Le paiement n’est pas disponible : cette commande est déjà livrée.',
    );
    expect(texteDe(racine)).toContain('Livrée');
  });

  // === Aucun appel vers un prestataire de paiement ===

  it('toutes les requêtes visent l’API de l’application, et fetch reste inutilisé', () => {
    const fetchOriginal = (globalThis as { fetch?: unknown }).fetch;
    const fetchSimule = vi.fn();
    (globalThis as { fetch?: unknown }).fetch = fetchSimule;
    try {
      ouvrir();
      const lectureCommande = demande(COMMANDE);
      lectureCommande.flush(commande());
      const lecturePaiement = demande(PAIEMENT_PAR_COMMANDE);
      lecturePaiement.flush(
        { statut: 404, message: 'Aucun paiement n’existe pour la commande : 512', timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();
      const simulationRequise = simulation();
      simulationRequise.flush(paiement());

      // Les trois seules requêtes de l'écran, toutes sur la même origine que l'API.
      const urls = [lectureCommande, lecturePaiement, simulationRequise].map(
        (requete) => requete.request.url,
      );
      expect(urls).toEqual([COMMANDE, PAIEMENT_PAR_COMMANDE, PAIEMENTS]);
      expect(http.match(() => true)).toHaveLength(0);
      expect(fetchSimule).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch?: unknown }).fetch = fetchOriginal;
    }
  });

  it('aucune référence à un prestataire de paiement externe à l’écran', () => {
    sansPaiement();
    reponseServeur(paiement());

    const texte = texteDe(racine).toLowerCase();
    for (const terme of ['api.wave.com', 'wave.com', 'orange-money', 'paypal', 'stripe', 'sdk']) {
      expect(texte).not.toContain(terme);
    }
    expect(http.match(() => true)).toHaveLength(0);
  });

  // === Navigation de sortie ===

  it('ramène à la commande concernée et à la liste, sans effet de bord', () => {
    sansPaiement();

    expect(element<HTMLAnchorElement>(racine, '#lien-retour-commande').getAttribute('href')).toBe(
      '/acheteur/commandes/512',
    );
    expect(texteDe(racine)).toContain('Mes commandes');
    expect(http.match((requete) => requete.method === 'POST')).toHaveLength(0);
  });
});

/**
 * La protection de la route est vérifiée sur la table réelle ; le refus des autres rôles
 * est couvert par authGuard.spec et roleGuard.spec.
 */
describe('route de paiement', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
    title?: string;
    loadComponent?: () => Promise<unknown>;
  }

  function route(): RouteProtegee {
    const trouvee = routes.find((entree) => entree.path === 'acheteur/paiement/:id');
    if (!trouvee) {
      throw new Error('Route introuvable : acheteur/paiement/:id');
    }
    return trouvee as unknown as RouteProtegee;
  }

  it('exige authGuard puis roleGuard pour ACHETEUR uniquement', () => {
    expect(route().canActivate?.[0]).toBe(authGuard);
    expect(route().canActivate?.[1]).toBe(roleGuard);
    expect(route().data).toEqual({ roles: ['ACHETEUR'] });
    expect(typeof route().loadComponent).toBe('function');
  });

  it('porte un titre de page distinct et charge le composant à la demande', () => {
    expect(route().title).toBe('SunuRecolte — Paiement simulé');
    expect(typeof route().loadComponent).toBe('function');
  });
});
