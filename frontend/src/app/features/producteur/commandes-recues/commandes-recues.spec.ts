import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CommandeResponse } from '../../../core/modeles/domaine.modeles';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CommandesRecues } from './commandes-recues';

const URL_COMMANDES = 'http://localhost:8080/api/commandes';

/**
 * Les deux phrases de `CommandeService.verifierPaiementAvantConfirmation`, apostrophe droite
 * comme dans la source Java. Elles sont recopiées ici et non importées de l'utilitaire : un
 * test qui vérifierait une fonction contre elle-même ne prouverait rien.
 */
const MESSAGE_CONFIRMEE = "Une commande en livraison doit être payée avant d'être confirmée.";
const MESSAGE_PRETE = "Une commande en livraison doit être payée avant d'être marquée prête.";

const SESSION: SessionUtilisateur = {
  utilisateurId: 4,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
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
    lignes: [ligne(900)],
    /** Le serveur rend `null` tant qu'aucun paiement n'existe : la fixture fait de même. */
    statutPaiement: null,
    moyenPaiement: null,
    ...surcharge,
  };
}

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

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('CommandesRecues — commandes reçues du producteur', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CommandesRecues>;
  let racine: HTMLElement;

  function ouvrir(avecSession = false): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (avecSession) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommandesRecues);
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

  /** Clique l'action de la carte `id` : la requête PATCH est ensuite libre. */
  function demander(id: number): TestRequest {
    element<HTMLButtonElement>(racine, `#commande-${id}-etape`).click();
    fixture.detectChanges();
    return http.expectOne(`${URL_COMMANDES}/${id}/statut`);
  }

  /** La notice globale émise par l'écran : le refus de transition n'a plus de bannière. */
  function notice(): ReturnType<ToastService['notice']> {
    return TestBed.inject(ToastService).notice();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/commandes à l’ouverture, sans aucun identifiant de producteur', () => {
    ouvrir();

    const requete = demandeListe();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_COMMANDES);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.urlWithParams).not.toContain('producteurId');
    requete.flush([]);
  });

  it('affiche l’état de chargement tant que la liste n’est pas revenue', () => {
    ouvrir();

    const etat = element(racine, '.etat');
    expect(etat.getAttribute('aria-busy')).toBe('true');
    expect(texteDe(etat)).toContain('Chargement des commandes reçues');
    expect(elements(racine, '.commandes-recues__carte')).toHaveLength(0);
    demandeListe().flush([]);
  });

  it('rend une carte par commande reçue, dans l’ordre renvoyé par le serveur', () => {
    ouvrir();
    charger([commande(512), commande(511), commande(509)]);

    const titres = elements(racine, '.commandes-recues__carte .carte__titre').map(texteDe);
    expect(titres).toEqual(['Commande n° 512', 'Commande n° 511', 'Commande n° 509']);
  });

  it('affiche l’acheteur, la date, la réception et le total calculés par le serveur', () => {
    ouvrir();
    charger([commande(512, { statut: 'CONFIRMEE', modeReception: 'LIVRAISON', total: 12345 })]);

    const carte = element(racine, '.commandes-recues__carte');
    expect(texteDe(carte)).toContain('Moussa Fall');
    expect(texteDe(carte)).toContain('20/09/2026 à 14:05');
    expect(texteDe(carte)).toContain('Confirmée');
    expect(texteDe(carte)).toContain('Livraison');
    expect(texteDe(element(carte, '.commandes-recues__total'))).toBe('12 345 FCFA');
  });

  it('rend les lignes de la commande : produit, quantité, prix unitaire et sous-total', () => {
    ouvrir();
    charger([
      commande(512, {
        lignes: [ligne(900), ligne(901, { produit: 'Oignon', quantite: 5, prixUnitaire: 300, sousTotal: 1500 })],
      }),
    ]);

    const lignes = elements(racine, '.commandes-recues__ligne');
    expect(lignes).toHaveLength(2);
    expect(texteDe(lignes[0])).toContain('Tomate');
    expect(texteDe(lignes[0])).toContain('10 kg');
    expect(texteDe(lignes[0])).toContain('450 FCFA / kg');
    expect(texteDe(lignes[0])).toContain('4 500 FCFA');
    expect(texteDe(lignes[1])).toContain('Oignon');
    expect(texteDe(lignes[1])).toContain('1 500 FCFA');
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

  it('en retrait, explique le retrait sans inventer d’adresse', () => {
    ouvrir();
    charger([commande(512)]);

    const carte = element(racine, '.commandes-recues__carte');
    expect(texteDe(element(carte, '.commandes-recues__notice'))).toContain(
      'Aucune adresse de livraison n’a été enregistrée.',
    );
    expect(texteDe(carte)).not.toContain('Adresse de livraison');
  });

  it('en livraison, affiche adresse, téléphone et instructions, une valeur absente rendue par —', () => {
    ouvrir();
    charger([
      commande(512, {
        modeReception: 'LIVRAISON',
        adresseLivraison: 'Ouakam, près du marché',
        telephoneLivraison: '770001122',
        instructionsLivraison: null,
      }),
    ]);

    const champs = elements(racine, '.commandes-recues__champs dd').map(texteDe);
    expect(champs).toContain('Ouakam, près du marché');
    expect(champs).toContain('770001122');
    expect(champs).toContain('—');
  });

  it.each([
    ['EN_ATTENTE', 'Confirmer la commande'],
    ['CONFIRMEE', 'Marquer comme prête'],
    ['PRETE', 'Marquer comme livrée'],
  ] as const)('%s offre une seule action : %s', (statut, libelle) => {
    ouvrir();
    charger([commande(512, { statut })]);

    const actions = elements<HTMLButtonElement>(racine, '.commandes-recues__actions button');
    expect(actions).toHaveLength(1);
    expect(texteDe(actions[0])).toBe(libelle);
    expect(actions[0].disabled).toBe(false);
    expect(actions[0].getAttribute('aria-label')).toBe(`${libelle} — commande n° 512`);
  });

  it.each(['LIVREE', 'ANNULEE'] as const)('%s est terminal : aucune action affichée', (statut) => {
    ouvrir();
    charger([commande(512, { statut })]);

    expect(elements(racine, '.commandes-recues__actions button')).toHaveLength(0);
    expect(elements(racine, '.commandes-recues__carte button')).toHaveLength(0);
  });

  // === Paiement rendu par le serveur et règle « livraison payée avant confirmation » ===

  it('rend sur la carte le paiement envoyé par le serveur : moyen et statut', () => {
    ouvrir();
    charger([
      commande(512, {
        modeReception: 'LIVRAISON',
        statutPaiement: 'REUSSI',
        moyenPaiement: 'ORANGE_MONEY',
      }),
    ]);

    expect(elements(racine, '.commandes-recues__champs dd').map(texteDe)).toContain(
      'Orange Money — Réussi',
    );
  });

  it('rend « Aucun paiement » quand le serveur n’en envoie aucun, jamais un statut inventé', () => {
    ouvrir();
    charger([commande(512)]);

    const carte = element(racine, '.commandes-recues__carte');
    expect(texteDe(element(carte, '.commandes-recues__champs'))).toContain('Aucun paiement');
    expect(texteDe(carte)).not.toContain('Réussi');
  });

  it('REMBOURSE se lit « Remboursé (simulé) » : la simulation reste nommée', () => {
    ouvrir();
    charger([
      commande(512, {
        statut: 'ANNULEE',
        modeReception: 'LIVRAISON',
        statutPaiement: 'REMBOURSE',
        moyenPaiement: 'WAVE',
      }),
    ]);

    expect(elements(racine, '.commandes-recues__champs dd').map(texteDe)).toContain(
      'Wave — Remboursé (simulé)',
    );
  });

  it.each([
    ['EN_ATTENTE', 'Confirmer la commande', MESSAGE_CONFIRMEE],
    ['CONFIRMEE', 'Marquer comme prête', MESSAGE_PRETE],
  ] as const)(
    'livraison sans paiement : %s neutralise « %s » sans la faire disparaître',
    (statut, libelle, attendu) => {
      ouvrir();
      charger([commande(512, { statut, modeReception: 'LIVRAISON' })]);

      const bouton = element<HTMLButtonElement>(racine, '#commande-512-etape');
      expect(texteDe(bouton)).toBe(libelle);
      expect(bouton.getAttribute('aria-disabled')).toBe('true');
      // `aria-disabled` et non `disabled` : l'action reste au clavier, seul son effet est retiré.
      expect(bouton.disabled).toBe(false);
      expect(bouton.getAttribute('aria-describedby')).toBe('commande-512-paiement-requis');

      const motif = element(racine, '#commande-512-paiement-requis');
      expect(motif.getAttribute('role')).toBe('status');
      expect(texteDe(motif)).toBe(attendu);
    },
  );

  it.each(['EN_ATTENTE', 'ECHOUE', 'ANNULE', 'REMBOURSE'] as const)(
    'un paiement %s ne débloque pas la confirmation d’une livraison',
    (statutPaiement) => {
      ouvrir();
      charger([
        commande(512, { modeReception: 'LIVRAISON', statutPaiement, moyenPaiement: 'WAVE' }),
      ]);

      expect(element<HTMLButtonElement>(racine, '#commande-512-etape').getAttribute('aria-disabled')).toBe(
        'true',
      );
    },
  );

  it('le clic sur une action neutralisée n’émet aucune requête', () => {
    ouvrir();
    charger([commande(512, { modeReception: 'LIVRAISON' })]);

    element<HTMLButtonElement>(racine, '#commande-512-etape').click();
    fixture.detectChanges();

    expect(http.match(() => true)).toHaveLength(0);
  });

  it('une livraison payée retrouve son action pleine : ni aria-disabled, ni motif, PATCH normal', () => {
    ouvrir();
    charger([
      commande(512, { modeReception: 'LIVRAISON', statutPaiement: 'REUSSI', moyenPaiement: 'WAVE' }),
    ]);

    const bouton = element<HTMLButtonElement>(racine, '#commande-512-etape');
    expect(bouton.getAttribute('aria-disabled')).toBeNull();
    expect(bouton.getAttribute('aria-describedby')).toBeNull();
    expect(racine.querySelector('#commande-512-paiement-requis')).toBeNull();

    const requete = demander(512);
    expect(requete.request.body).toEqual({ statut: 'CONFIRMEE' });
    requete.flush(
      commande(512, {
        statut: 'CONFIRMEE',
        modeReception: 'LIVRAISON',
        statutPaiement: 'REUSSI',
        moyenPaiement: 'WAVE',
      }),
    );
  });

  it('en retrait, la règle ne change rien : aucune mention de blocage et l’action est envoyée', () => {
    ouvrir();
    charger([commande(512)]);

    const bouton = element<HTMLButtonElement>(racine, '#commande-512-etape');
    expect(bouton.getAttribute('aria-disabled')).toBeNull();
    expect(racine.querySelector('#commande-512-paiement-requis')).toBeNull();

    const requete = demander(512);
    expect(requete.request.urlWithParams).toBe(`${URL_COMMANDES}/512/statut`);
    requete.flush(commande(512, { statut: 'CONFIRMEE' }));
  });

  it('vue périmée : un 400 de refus de paiement du serveur va dans la notice, avec les mêmes mots', () => {
    ouvrir();
    charger([
      commande(512, { modeReception: 'LIVRAISON', statutPaiement: 'REUSSI', moyenPaiement: 'WAVE' }),
    ]);

    const requete = demander(512);
    requete.flush(
      { statut: 400, message: MESSAGE_CONFIRMEE, timestamp: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(notice()?.type).toBe('erreur');
    expect(notice()?.message).toBe(MESSAGE_CONFIRMEE);
    expect(texteDe(element(racine, '.badge'))).toBe('En attente');
    expect(racine.querySelector('.message--erreur')).toBeNull();
  });

  it('« Confirmer la commande » envoie PATCH /api/commandes/{id}/statut avec pour seul corps le statut', () => {
    ouvrir();
    charger([commande(512)]);

    const requete = demander(512);
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.urlWithParams).toBe(`${URL_COMMANDES}/512/statut`);
    expect(requete.request.body).toEqual({ statut: 'CONFIRMEE' });
    requete.flush(commande(512, { statut: 'CONFIRMEE' }));
  });

  it.each([
    ['EN_ATTENTE', 'CONFIRMEE'],
    ['CONFIRMEE', 'PRETE'],
    ['PRETE', 'LIVREE'],
  ] as const)('%s vers %s : le statut rendu est celui de la réponse du serveur', (depuis, vers) => {
    ouvrir();
    charger([commande(512, { statut: depuis })]);

    const requete = demander(512);
    expect(requete.request.body).toEqual({ statut: vers });
    requete.flush(commande(512, { statut: vers, total: 9000 }));
    fixture.detectChanges();

    const carte = element(racine, '.commandes-recues__carte');
    expect(texteDe(element(carte, '.badge'))).toBe(
      vers === 'CONFIRMEE' ? 'Confirmée' : vers === 'PRETE' ? 'Prête' : 'Livrée',
    );
    expect(texteDe(carte)).toContain('9 000 FCFA');
    expect(texteDe(element(racine, '.message--succes p'))).toBe(
      `La commande n° 512 est désormais « ${texteDe(element(carte, '.badge'))} ».`,
    );
  });

  it('une commande passée à LIVREE n’offre plus aucune action et son message reçoit le focus', () => {
    ouvrir();
    charger([commande(512, { statut: 'PRETE' })]);

    const requete = demander(512);
    requete.flush(commande(512, { statut: 'LIVREE' }));
    fixture.detectChanges();

    expect(elements(racine, '.commandes-recues__carte button')).toHaveLength(0);
    const succes = element(racine, '.message--succes');
    expect(succes.getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(succes);
  });

  it('deux clics sur la même action ne produisent qu’une requête, le bouton étant désactivé', () => {
    ouvrir();
    charger([commande(512)]);

    const url = `${URL_COMMANDES}/512/statut`;
    const requete = demander(512);
    const bouton = element<HTMLButtonElement>(racine, '#commande-512-etape');
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-busy')).toBe('true');
    expect(texteDe(bouton)).toBe('…');

    bouton.click();
    fixture.detectChanges();
    // La première requête a déjà été consommée par `expectOne` : rien de neuf sur cette URL.
    http.expectNone(url);

    requete.flush(commande(512, { statut: 'CONFIRMEE' }));
  });

  it('400 « Transition de statut interdite » : le message du serveur s’affiche, le statut reste affiché', () => {
    ouvrir();
    charger([commande(512, { statut: 'PRETE' })]);

    const requete = demander(512);
    requete.flush(
      { statut: 400, message: 'Transition de statut interdite : PRETE vers CONFIRMEE.', timestamp: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const carte = element(racine, '.commandes-recues__carte');
    expect(notice()?.type).toBe('erreur');
    expect(notice()?.message).toBe('Transition de statut interdite : PRETE vers CONFIRMEE.');
    expect(carte.querySelector('.message--erreur')).toBeNull();
    expect(texteDe(element(carte, '.badge'))).toBe('Prête');
    expect(element<HTMLButtonElement>(racine, '#commande-512-etape').disabled).toBe(false);
  });

  it('400 « déjà au statut » : aucune réécriture locale du statut', () => {
    ouvrir();
    charger([commande(512)]);

    const requete = demander(512);
    requete.flush(
      { statut: 400, message: 'La commande est déjà au statut CONFIRMEE.', timestamp: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(notice()?.message).toContain('déjà au statut CONFIRMEE');
    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(texteDe(element(racine, '.badge'))).toBe('En attente');
    expect(racine.querySelector('.message--succes')).toBeNull();
  });

  it('un 403 reste un refus affiché : aucune purge de session, aucune liste inventée', () => {
    ouvrir(true);

    const requete = demandeListe();
    requete.flush(
      { statut: 403, message: 'Accès refusé : vous n’avez pas les droits nécessaires.', timestamp: 'x' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
    expect(elements(racine, '.commandes-recues__carte')).toHaveLength(0);
  });

  it('une erreur sur le PATCH bloque seulement la carte concernée et laisse l’action possible', () => {
    ouvrir();
    charger([commande(512), commande(511)]);

    const requete = demander(512);
    requete.error(new ProgressEvent('error'), { status: 0, statusText: 'Connexion coupée' });
    fixture.detectChanges();

    const carte = elements(racine, '.commandes-recues__carte')[0];
    expect(notice()?.message).toContain('serveur est injoignable');
    expect(carte.querySelector('.message--erreur')).toBeNull();
    expect(elements(racine, '.commandes-recues__carte')).toHaveLength(2);
    expect(element<HTMLButtonElement>(racine, '#commande-512-etape').disabled).toBe(false);
  });

  it('confie le refus de transition à la notice : aucune bannière dans la carte', () => {
    ouvrir();
    charger([commande(512, { statut: 'PRETE' })]);

    const espion = vi.spyOn(TestBed.inject(ToastService), 'afficher');
    demander(512).flush(
      { statut: 400, message: 'Transition de statut interdite : PRETE vers CONFIRMEE.', timestamp: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(espion).toHaveBeenCalledWith(
      'Transition de statut interdite : PRETE vers CONFIRMEE.',
      'erreur',
    );
    const carte = element(racine, '.commandes-recues__carte');
    expect(carte.querySelector('.message--erreur')).toBeNull();
  });

  it('propose le catalogue… et les récoltes quand aucune commande n’est reçue', () => {
    ouvrir();
    charger([]);

    const etat = element(racine, '.etat');
    expect(texteDe(etat)).toContain('Aucune commande reçue pour le moment.');
    const lien = element<HTMLAnchorElement>(etat, 'a');
    expect(texteDe(lien)).toBe('Voir mes récoltes');
    expect(lien.getAttribute('href')).toBe('/producteur/recoltes');
  });

  it('une erreur de liste s’affiche avec « Réessayer », qui relance exactement une requête', () => {
    ouvrir();
    demandeListe().flush(
      { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain('Une erreur interne est survenue.');
    element<HTMLButtonElement>(racine, '#commandes-recues-reessayer').click();
    fixture.detectChanges();

    const relance = demandeListe();
    expect(relance.request.urlWithParams).toBe(URL_COMMANDES);
    relance.flush([commande(512)]);
    fixture.detectChanges();

    expect(elements(racine, '.commandes-recues__carte')).toHaveLength(1);
  });

  /**
   * Reciblé au LOT P2b : l'écran parle désormais du paiement, puisque l'API l'envoie. Ce qui
   * reste interdit est l'invention — une référence, un prestataire, un paiement passé — et
   * l'annulation, qui n'est pas une action du producteur ici.
   */
  it('ne propose aucune annulation et ne parle que du paiement envoyé par le serveur', () => {
    ouvrir();
    charger([commande(512), commande(511, { statut: 'CONFIRMEE' }), commande(510, { statut: 'PRETE' })]);

    const boutons = elements<HTMLButtonElement>(racine, '.commandes-recues__carte button');
    expect(boutons).toHaveLength(3);
    for (const bouton of boutons) {
      expect(texteDe(bouton)).not.toContain('Annuler');
    }

    // Ces trois commandes sont en retrait et sans paiement : le seul mot autorisé est le constat.
    const texte = texteDe(racine).toLowerCase();
    expect(texte).toContain('aucun paiement');
    for (const terme of ['annul', 'payé', 'transaction', 'wave', 'orange money', 'simu-']) {
      expect(texte).not.toContain(terme);
    }
  });

  it('ne touche ni aux notifications ni aux récoltes : le serveur seul avertit l’acheteur', () => {
    ouvrir();
    charger([commande(512)]);

    const requete = demander(512);
    requete.flush(commande(512, { statut: 'CONFIRMEE' }));

    expect(http.match((r) => r.url.startsWith('http://localhost:8080/api/notifications'))).toHaveLength(0);
    expect(http.match((r) => r.url.startsWith('http://localhost:8080/api/recoltes'))).toHaveLength(0);
  });

  it('n’émet aucun second GET après l’ouverture : aucun minuteur, aucun polling', () => {
    ouvrir();
    charger([commande(512)]);

    // La requête d’ouverture a été consommée par `charger` : aucune autre n’est en attente.
    expect(http.match(() => true)).toHaveLength(0);
  });

  describe('liste à jour — bouton « Actualiser » et retour de l’onglet', () => {
    /** Le bouton vit dans la barre de tête, jamais dans une carte. */
    function boutonActualiser(): HTMLButtonElement {
      return element<HTMLButtonElement>(racine, '#commandes-recues-actualiser');
    }

    function reglerVisibilite(etat: 'visible' | 'hidden'): void {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => etat,
      });
    }

    /**
     * L'unique lecture de liste en vol. `match` **extrait** la requête du contrôleur : la
     * renvoyer est le seul moyen de la flush après avoir compté combien il y en avait.
     */
    function uneLectureEnVol(): TestRequest {
      const enVol = http.match(URL_COMMANDES);
      expect(enVol).toHaveLength(1);
      const requete = enVol[0];
      if (requete === undefined) {
        throw new Error('Aucune lecture de liste en vol.');
      }
      return requete;
    }

    // L'override est propre à ce describe : il ne doit pas survivre au-delà de son test.
    afterEach(() => {
      delete (document as { visibilityState?: unknown }).visibilityState;
    });

    it('rend un seul bouton « Actualiser » en tête, hors des cartes et sans le désactiver', () => {
      ouvrir();
      charger([commande(512)]);

      const bouton = boutonActualiser();
      expect(elements(racine, '#commandes-recues-actualiser')).toHaveLength(1);
      expect(texteDe(bouton)).toBe('Actualiser');
      expect(bouton.classList.contains('bouton--secondaire')).toBe(true);
      expect(bouton.closest('.commandes-recues__carte')).toBeNull();
    });

    it('relance une lecture qui remplace la liste : un paiement débloque « Confirmer »', () => {
      ouvrir();
      charger([commande(512, { modeReception: 'LIVRAISON' })]);
      expect(
        element<HTMLButtonElement>(racine, '#commande-512-etape').getAttribute('aria-disabled'),
      ).toBe('true');

      boutonActualiser().click();
      fixture.detectChanges();

      const relance = demandeListe();
      expect(relance.request.method).toBe('GET');
      expect(relance.request.urlWithParams).toBe(URL_COMMANDES);
      relance.flush([
        commande(512, {
          modeReception: 'LIVRAISON',
          statutPaiement: 'REUSSI',
          moyenPaiement: 'WAVE',
        }),
      ]);
      fixture.detectChanges();

      expect(
        element<HTMLButtonElement>(racine, '#commande-512-etape').getAttribute('aria-disabled'),
      ).toBeNull();
      expect(elements(racine, '.commandes-recues__champs dd').map(texteDe)).toContain(
        'Wave — Réussi',
      );
    });

    it('pendant l’actualisation la liste reste affichée et le bouton garde son libellé', () => {
      ouvrir();
      charger([commande(512)]);

      boutonActualiser().click();
      fixture.detectChanges();

      expect(elements(racine, '.commandes-recues__carte')).toHaveLength(1);
      expect(racine.querySelector('.etat')).toBeNull();
      expect(texteDe(boutonActualiser())).toBe('Actualiser');
      expect(boutonActualiser().getAttribute('aria-busy')).toBe('true');
      expect(boutonActualiser().getAttribute('aria-disabled')).toBe('true');
      // `aria-disabled` et non `disabled` : le bouton reste atteignable au clavier (§39).
      expect(boutonActualiser().disabled).toBe(false);

      demandeListe().flush([commande(512)]);
      fixture.detectChanges();

      expect(boutonActualiser().getAttribute('aria-busy')).toBeNull();
      expect(boutonActualiser().getAttribute('aria-disabled')).toBeNull();
    });

    it('un échec d’actualisation garde la liste et montre l’erreur du serveur', () => {
      ouvrir();
      charger([commande(512), commande(511)]);

      boutonActualiser().click();
      fixture.detectChanges();
      demandeListe().flush(
        { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Une erreur interne est survenue.',
      );
      expect(elements(racine, '.commandes-recues__carte')).toHaveLength(2);
      expect(boutonActualiser().getAttribute('aria-busy')).toBeNull();
    });

    it('deux clics sur « Actualiser » n’émettent qu’une requête', () => {
      ouvrir();
      charger([commande(512)]);

      boutonActualiser().click();
      boutonActualiser().click();
      fixture.detectChanges();

      uneLectureEnVol().flush([commande(512)]);
    });

    it('neutralisé pendant un PATCH : l’actualisation attend l’action de la carte', () => {
      ouvrir();
      charger([commande(512)]);

      const patch = demander(512);
      expect(boutonActualiser().getAttribute('aria-disabled')).toBe('true');

      boutonActualiser().click();
      fixture.detectChanges();

      expect(http.match(URL_COMMANDES)).toHaveLength(0);
      patch.flush(commande(512, { statut: 'CONFIRMEE' }));
    });

    it('l’onglet qui redevient visible relance une seule lecture', () => {
      ouvrir();
      charger([commande(512)]);

      reglerVisibilite('visible');
      document.dispatchEvent(new Event('visibilitychange'));

      uneLectureEnVol().flush([commande(512)]);
    });

    it('l’onglet qui se masque n’émet aucune requête', () => {
      ouvrir();
      charger([commande(512)]);

      reglerVisibilite('hidden');
      document.dispatchEvent(new Event('visibilitychange'));

      expect(http.match(URL_COMMANDES)).toHaveLength(0);
    });

    it('un retour d’onglet pendant une lecture en cours ne doublonne pas', () => {
      ouvrir();
      charger([commande(512)]);

      boutonActualiser().click();
      reglerVisibilite('visible');
      document.dispatchEvent(new Event('visibilitychange'));

      uneLectureEnVol().flush([commande(512)]);
    });

    it('l’écran détruit, l’écouteur est retiré : plus aucune requête au retour de l’onglet', () => {
      ouvrir();
      charger([commande(512)]);

      fixture.destroy();
      reglerVisibilite('visible');
      document.dispatchEvent(new Event('visibilitychange'));

      expect(http.match(URL_COMMANDES)).toHaveLength(0);
    });

    it('l’actualisation ne déplace pas le focus et n’écrase pas le message de succès', () => {
      ouvrir();
      charger([commande(512, { statut: 'PRETE' })]);

      demander(512).flush(commande(512, { statut: 'LIVREE' }));
      fixture.detectChanges();

      const succes = element(racine, '.message--succes');
      expect(document.activeElement).toBe(succes);

      boutonActualiser().click();
      fixture.detectChanges();
      demandeListe().flush([commande(512, { statut: 'LIVREE' })]);
      fixture.detectChanges();

      const apres = element(racine, '.message--succes');
      expect(texteDe(apres)).toBe(texteDe(succes));
      expect(document.activeElement).toBe(apres);
    });
  });

  describe('structure de page', () => {
    /**
     * Filet écrit avant tout restylage : un état est bien rendu s’il partage le parent de
     * l’en-tête. La assertion reste vraie quel que soit ce parent — c’est lui qui est testé
     * ailleurs, pas son nom.
     */
    function memeParentQueLEntete(selecteur: string): void {
      expect(element(racine, selecteur).parentElement).toBe(
        element(racine, '.commandes-recues__entete').parentElement,
      );
    }

    function parentDe(selecteur: string): Element | null {
      return element(racine, selecteur).parentElement;
    }

    it('n’a qu’un seul h1, porté par l’en-tête de page', () => {
      ouvrir();
      charger([commande(512)]);

      const titres = elements(racine, 'h1');
      expect(titres).toHaveLength(1);
      expect(texteDe(titres[0])).toBe('Commandes reçues');
      expect(titres[0].closest('.commandes-recues__entete')).not.toBeNull();
    });

    it('rend le chargement et la liste dans le parent de l’en-tête', () => {
      ouvrir();

      memeParentQueLEntete('.etat');
      charger([commande(512)]);
      memeParentQueLEntete('.commandes-recues__liste');
    });

    it('rend l’erreur puis la liste vide dans le parent de l’en-tête', () => {
      ouvrir();
      demandeListe().flush(
        { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      fixture.detectChanges();

      memeParentQueLEntete('.message--erreur');
      element<HTMLButtonElement>(racine, '#commandes-recues-reessayer').click();
      fixture.detectChanges();
      demandeListe().flush([]);
      fixture.detectChanges();

      memeParentQueLEntete('.etat');
      expect(texteDe(element(racine, '.etat'))).toContain('Aucune commande reçue pour le moment.');
    });

    it('place toute la colonne de page dans un .conteneur unique (§20)', () => {
      ouvrir();
      expect(racine.querySelectorAll('.conteneur')).toHaveLength(1);

      const conteneur = element<HTMLElement>(racine, '.conteneur');
      expect(conteneur.parentElement).toBe(element(racine, 'section.commandes-recues'));
      expect(conteneur.querySelector('h1')).not.toBeNull();
      expect(parentDe('.etat')).toBe(conteneur);

      charger([commande(512)]);
      expect(parentDe('.commandes-recues__liste')).toBe(conteneur);
      // Les cartes restent sous la liste : le conteneur englobe la page, pas chaque commande.
      expect(parentDe('.commandes-recues__carte')).toBe(element(racine, '.commandes-recues__liste'));
    });
  });
});

/**
 * La protection des routes est vérifiée sur la table réelle ; le refus des autres rôles
 * est couvert par authGuard.spec et roleGuard.spec. `loadComponent` n'est jamais appelé
 * ici (un appel empoisonne les autres fichiers de tests).
 */
describe('routes de « Commandes reçues »', () => {
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

  it('producteur/commandes exige authGuard puis roleGuard pour PRODUCTEUR uniquement', () => {
    const protegee = route('producteur/commandes');

    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(protegee.title).toBe('SunuRecolte — Commandes reçues');
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('laisse l’espace acheteur et ses écrans tels qu’ils sont', () => {
    expect(route('acheteur/commandes').data).toEqual({ roles: ['ACHETEUR'] });
    expect(route('acheteur/commandes/:id').data).toEqual({ roles: ['ACHETEUR'] });
    expect(route('acheteur/paiement/:id').data).toEqual({ roles: ['ACHETEUR'] });
    expect(route('acheteur')).toEqual({
      path: 'acheteur',
      pathMatch: 'full',
      redirectTo: 'acheteur/commandes',
    });
  });

  it('laisse /producteur sur « Mes récoltes » et les écrans de récolte inchangés', () => {
    expect(route('producteur')).toEqual({
      path: 'producteur',
      pathMatch: 'full',
      redirectTo: 'producteur/recoltes',
    });
    expect(route('producteur/recoltes').data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(route('producteur/recoltes/nouvelle').data).toEqual({ roles: ['PRODUCTEUR'] });
  });

  it('laisse l’écran de notifications transverse sans roleGuard', () => {
    const protegee = route('notifications');
    expect(protegee.canActivate).toEqual([authGuard]);
    expect(protegee.data).toBeUndefined();
  });
});
