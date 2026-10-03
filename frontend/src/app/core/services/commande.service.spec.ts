import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CommandeRequest, CommandeResponse } from '../modeles/domaine.modeles';
import { messageErreurApi } from '../utilitaires/erreurs-api';
import { CommandeService } from './commande.service';

const URL_COMMANDES = 'http://localhost:8080/api/commandes';

const REQUETE: CommandeRequest = {
  acheteurId: 7,
  modeReception: 'RETRAIT',
  adresseLivraison: null,
  telephoneLivraison: null,
  instructionsLivraison: null,
  lignes: [{ recolteId: 41, quantite: 2.5 }],
};

const REPONSE: CommandeResponse = {
  id: 512,
  acheteurId: 7,
  nomAcheteur: 'Mor Fall',
  dateCreation: '2026-09-28T14:05:09',
  statut: 'EN_ATTENTE',
  total: 1125,
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
      quantite: 2.5,
      prixUnitaire: 450,
      sousTotal: 1125,
    },
  ],
  statutPaiement: null,
  moyenPaiement: null,
};

describe('CommandeService', () => {
  let service: CommandeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommandeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envoie POST /api/commandes, sans paramètre d’url', () => {
    service.creer(REQUETE).subscribe();

    const requete = http.expectOne(URL_COMMANDES);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.urlWithParams).toBe(URL_COMMANDES);
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush(REPONSE);
  });

  it('n’envoie que les six champs du DTO : jamais de total, de prix ni de sous-total', () => {
    service.creer(REQUETE).subscribe();

    const requete = http.expectOne(URL_COMMANDES);
    const corps = requete.request.body as Record<string, unknown>;

    expect(Object.keys(corps).sort()).toEqual([
      'acheteurId',
      'adresseLivraison',
      'instructionsLivraison',
      'lignes',
      'modeReception',
      'telephoneLivraison',
    ]);
    expect(corps['total']).toBeUndefined();
    requete.flush(REPONSE);
  });

  it('transmet la requête reçue sans rien réécrire : le serveur reste seul à calculer', () => {
    const etendue: CommandeRequest = {
      ...REQUETE,
      lignes: [{ recolteId: 41, quantite: 2.5 }, { recolteId: 63, quantite: 10 }],
    };

    service.creer(etendue).subscribe();

    const envoyee = http.expectOne(URL_COMMANDES);
    expect(envoyee.request.body).toEqual(etendue);

    const corps = envoyee.request.body as CommandeRequest;
    expect(Object.keys(corps.lignes[0]).sort()).toEqual(['quantite', 'recolteId']);
    expect(corps.lignes.length).toBe(2);
    envoyee.flush(REPONSE);
  });

  it('conserve la réponse du serveur sans la retoucher : statut, total et lignes', () => {
    let recu: CommandeResponse | undefined;
    service.creer(REQUETE).subscribe((commande) => (recu = commande));

    http
      .expectOne(URL_COMMANDES)
      .flush({ ...REPONSE, total: 4500, statut: 'EN_ATTENTE', id: 777, lignes: [] });

    expect(recu?.id).toBe(777);
    expect(recu?.total).toBe(4500);
    expect(recu?.statut).toBe('EN_ATTENTE');
    expect(recu?.lignes).toEqual([]);
  });

  it('propage un 400 métier avec son message lisible', () => {
    let creee: CommandeResponse | undefined;
    let erreurRecue: { status: number; error: { message: string } } | undefined;

    service.creer(REQUETE).subscribe({
      next: (commande) => (creee = commande),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .flush(
        {
          message: 'Stock insuffisant pour « Tomate » : disponible 5.00, demandé 6.00.',
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(creee).toBeUndefined();
    expect(erreurRecue?.status).toBe(400);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Stock insuffisant pour « Tomate » : disponible 5.00, demandé 6.00.',
    );
  });

  it('propage un 403 sans le transformer en erreur d’authentification', () => {
    let creee: CommandeResponse | undefined;
    let erreurRecue: { status: number; error: { message: string } } | undefined;

    service.creer(REQUETE).subscribe({
      next: (commande) => (creee = commande),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .flush(
        { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource." },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(creee).toBeUndefined();
    expect(erreurRecue?.status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
  });

  it('propage un 404 de récolte introuvable', () => {
    let erreurRecue: { status: number } | undefined;

    service.creer(REQUETE).subscribe({
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .flush({ message: 'Recolte introuvable avec l’id : 41' }, { status: 404, statusText: 'Not Found' });

    expect(erreurRecue?.status).toBe(404);
  });

  it('propage une erreur inattendue sans inventer de succès', () => {
    let recu: CommandeResponse | undefined;
    let erreurRecue: { status: number } | undefined;

    service.creer(REQUETE).subscribe({
      next: (commande) => (recu = commande),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .flush(
        { message: 'Une erreur interne est survenue. Veuillez réessayer.' },
        { status: 500, statusText: 'Internal Server Error' },
      );

    expect(recu).toBeUndefined();
    expect(erreurRecue?.status).toBe(500);
  });

  it('lister : GET /api/commandes à l’url exacte, sans aucun paramètre', () => {
    let resultat: CommandeResponse[] | undefined;

    service.lister().subscribe((commandes) => (resultat = commandes));

    const requete = http.expectOne(URL_COMMANDES);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_COMMANDES);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toBeNull();
    requete.flush([REPONSE]);

    expect(resultat).toEqual([REPONSE]);
  });

  it('lister : n’envoie jamais acheteurId — l’identité vient du jeton, pas de l’url', () => {
    service.lister().subscribe();

    const requete = http.expectOne((req) => req.method === 'GET' && req.url === URL_COMMANDES);
    expect(requete.request.params.has('acheteurId')).toBe(false);
    expect(requete.request.urlWithParams).not.toContain('acheteurId');
    requete.flush([]);
  });

  it('lister : restitue l’ordre, les statuts et les totaux renvoyés par le serveur', () => {
    const seconde: CommandeResponse = { ...REPONSE, id: 513, statut: 'LIVREE', total: 8000 };
    let recues: CommandeResponse[] | undefined;

    service.lister().subscribe((commandes) => (recues = commandes));

    http.expectOne(URL_COMMANDES).flush([REPONSE, seconde]);

    expect(recues?.map((commande) => commande.id)).toEqual([512, 513]);
    expect(recues?.map((commande) => commande.statut)).toEqual(['EN_ATTENTE', 'LIVREE']);
    expect(recues?.map((commande) => commande.total)).toEqual([1125, 8000]);
  });

  it('lister : une liste vide est un succès vide, jamais une erreur', () => {
    let recues: CommandeResponse[] | undefined;
    let erreurRecue: unknown;

    service.lister().subscribe({
      next: (commandes) => (recues = commandes),
      error: (erreur) => (erreurRecue = erreur),
    });

    http.expectOne(URL_COMMANDES).flush([]);

    expect(erreurRecue).toBeUndefined();
    expect(recues).toEqual([]);
  });

  it('lister : propage un 403 sans le convertir en erreur d’authentification', () => {
    let resultat: CommandeResponse[] | undefined;
    let erreurRecue: unknown;

    service.lister().subscribe({
      next: (commandes) => (resultat = commandes),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .flush(
        { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource." },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(resultat).toBeUndefined();
    expect((erreurRecue as HttpErrorResponse).status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
  });

  it('lister : propage une panne réseau sans inventer de liste vide', () => {
    let resultat: CommandeResponse[] | undefined;
    let erreurRecue: unknown;

    service.lister().subscribe({
      next: (commandes) => (resultat = commandes),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDES)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Connexion coupée' });

    expect(resultat).toBeUndefined();
    expect((erreurRecue as HttpErrorResponse).status).toBe(0);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
    );
  });

  it('findById : GET /api/commandes/{id}, url construite à partir de l’identifiant', () => {
    let resultat: CommandeResponse | undefined;

    service.findById(512).subscribe((commande) => (resultat = commande));

    const requete = http.expectOne(`${URL_COMMANDES}/512`);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(`${URL_COMMANDES}/512`);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toBeNull();
    requete.flush(REPONSE);

    expect(resultat).toEqual(REPONSE);
  });

  it('findById : n’envoie jamais acheteurId, même pour un id porté par l’url', () => {
    service.findById(512).subscribe();

    const requete = http.expectOne(`${URL_COMMANDES}/512`);
    expect(requete.request.params.has('acheteurId')).toBe(false);
    expect(requete.request.urlWithParams).not.toContain('acheteurId');
    requete.flush(REPONSE);
  });

  it('findById : une commande inconnue reste une 404 avec le message du backend', () => {
    let resultat: CommandeResponse | undefined;
    let erreurRecue: unknown;

    service.findById(999_999).subscribe({
      next: (commande) => (resultat = commande),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(`${URL_COMMANDES}/999999`)
      .flush(
        { message: "Commande introuvable avec l'id : 999999" },
        { status: 404, statusText: 'Not Found' },
      );

    expect(resultat).toBeUndefined();
    expect((erreurRecue as HttpErrorResponse).status).toBe(404);
    expect(messageErreurApi(erreurRecue, 'Commande introuvable.')).toBe(
      "Commande introuvable avec l'id : 999999",
    );
  });

  it('changerStatut : PATCH /api/commandes/{id}/statut, corps réduit à la clé statut', () => {
    let resultat: CommandeResponse | undefined;

    service.changerStatut(512, 'ANNULEE').subscribe((commande) => (resultat = commande));

    const requete = http.expectOne(`${URL_COMMANDES}/512/statut`);
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.urlWithParams).toBe(`${URL_COMMANDES}/512/statut`);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toEqual({ statut: 'ANNULEE' });
    expect(Object.keys(requete.request.body as Record<string, unknown>)).toEqual(['statut']);
    requete.flush({ ...REPONSE, statut: 'ANNULEE' });

    expect(resultat?.statut).toBe('ANNULEE');
  });

  it('changerStatut : le corps ne porte qu’une clé — ni total, ni lignes, ni acheteurId', () => {
    service.changerStatut(512, 'ANNULEE').subscribe();

    const requete = http.expectOne(`${URL_COMMANDES}/512/statut`);
    const corps = requete.request.body as Record<string, unknown>;

    expect(Object.keys(corps)).toEqual(['statut']);
    expect(corps['acheteurId']).toBeUndefined();
    expect(corps['total']).toBeUndefined();
    expect(corps['lignes']).toBeUndefined();
    requete.flush({ ...REPONSE, statut: 'ANNULEE' });
  });

  it('changerStatut : renvoie la commande du serveur telle quelle, pas un statut de remplacement', () => {
    const annulee: CommandeResponse = {
      ...REPONSE,
      statut: 'ANNULEE',
      lignes: [
        REPONSE.lignes[0],
        {
          id: 901,
          recolteId: 63,
          produit: 'Niébé',
          unite: 'kg',
          quantite: 12,
          prixUnitaire: 900,
          sousTotal: 10800,
        },
      ],
    };
    let resultat: CommandeResponse | undefined;

    service.changerStatut(512, 'ANNULEE').subscribe((commande) => (resultat = commande));

    http.expectOne(`${URL_COMMANDES}/512/statut`).flush(annulee);

    expect(resultat).toEqual(annulee);
    expect(resultat?.total).toBe(1125);
    expect(resultat?.lignes.length).toBe(2);
  });

  it('changerStatut : une transition interdite reste un 400 avec son message', () => {
    let resultat: CommandeResponse | undefined;
    let erreurRecue: unknown;

    service.changerStatut(512, 'ANNULEE').subscribe({
      next: (commande) => (resultat = commande),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(`${URL_COMMANDES}/512/statut`)
      .flush(
        { message: 'Transition de statut interdite : LIVREE vers ANNULEE.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(resultat).toBeUndefined();
    expect((erreurRecue as HttpErrorResponse).status).toBe(400);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Transition de statut interdite : LIVREE vers ANNULEE.',
    );
  });

  it('changerStatut : un 403 est propagé sans déconnexion implicite', () => {
    let erreurRecue: unknown;

    service.changerStatut(512, 'ANNULEE').subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${URL_COMMANDES}/512/statut`)
      .flush(
        { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource." },
        { status: 403, statusText: 'Forbidden' },
      );

    expect((erreurRecue as HttpErrorResponse).status).toBe(403);
  });
});
