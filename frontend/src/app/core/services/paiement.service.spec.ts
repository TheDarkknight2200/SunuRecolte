import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaiementRequest, PaiementResponse } from '../modeles/domaine.modeles';
import { messageErreurApi } from '../utilitaires/erreurs-api';
import { PaiementService } from './paiement.service';

const API = 'http://localhost:8080/api';
const URL_PAIEMENTS = `${API}/paiements`;
const URL_COMMANDE_511 = `${URL_PAIEMENTS}/commande/511`;

/**
 * Paiement tel que le renvoie `PaiementService.creer` côté Java : statut `EN_ATTENTE`,
 * référence de simulation, `dateConfirmation` jamais renseignée. Aucune donnée
 * financière réelle ici — montant fictif, référence fictive.
 */
const PAIEMENT: PaiementResponse = {
  id: 88,
  commandeId: 511,
  referenceTransaction: 'SIMU-fiche-test-558',
  montant: 4500,
  moyenPaiement: 'WAVE',
  statut: 'EN_ATTENTE',
  dateCreation: '2026-09-29T10:15:30',
  dateConfirmation: null,
};

describe('PaiementService', () => {
  let service: PaiementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaiementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('enregistre la simulation par POST /api/paiements, seule URL de l’application', () => {
    let recu: PaiementResponse | undefined;
    service
      .simuler({ commandeId: 511, moyenPaiement: 'WAVE' })
      .subscribe((paiement) => (recu = paiement));

    const requete = http.expectOne(URL_PAIEMENTS);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.urlWithParams).toBe(URL_PAIEMENTS);

    requete.flush(PAIEMENT);
    expect(recu).toEqual(PAIEMENT);
    // Aucune autre requête : ni API Wave, ni API Orange Money, aucun appel externe.
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('envoie exactement le corps du DTO Java, sans acheteurId ni montant', () => {
    const requete: PaiementRequest = { commandeId: 511, moyenPaiement: 'ORANGE_MONEY' };
    service.simuler(requete).subscribe();

    const envoyee = http.expectOne(URL_PAIEMENTS);
    expect(envoyee.request.body).toEqual({ commandeId: 511, moyenPaiement: 'ORANGE_MONEY' });
    expect(Object.keys(envoyee.request.body as Record<string, unknown>).sort()).toEqual([
      'commandeId',
      'moyenPaiement',
    ]);
    expect(JSON.stringify(envoyee.request.body)).not.toMatch(/acheteur|montant|total|carte|otp/i);

    envoyee.flush(PAIEMENT);
  });

  it('conserve le statut renvoyé par le serveur, y compris EN_ATTENTE et la référence de simulation', () => {
    let recu: PaiementResponse | undefined;
    service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe((v) => (recu = v));

    http
      .expectOne(URL_PAIEMENTS)
      .flush({ ...PAIEMENT, statut: 'EN_ATTENTE', dateConfirmation: null },
        { status: 201, statusText: 'Created' });

    expect(recu?.statut).toBe('EN_ATTENTE');
    expect(recu?.referenceTransaction).toBe('SIMU-fiche-test-558');
    expect(recu?.dateConfirmation).toBeNull();
  });

  it('reprend le montant du serveur sans le recalculer', () => {
    let recu: PaiementResponse | undefined;
    service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe((v) => (recu = v));

    http.expectOne(URL_PAIEMENTS).flush({ ...PAIEMENT, montant: 12345.67 });

    expect(recu?.montant).toBe(12345.67);
  });

  it('demande le paiement d’une commande par GET /api/paiements/commande/{id}, sans paramètre', () => {
    let recu: PaiementResponse | undefined;
    service.parCommande(511).subscribe((paiement) => (recu = paiement));

    const requete = http.expectOne(URL_COMMANDE_511);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_COMMANDE_511);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toBeNull();

    requete.flush(PAIEMENT);
    expect(recu?.commandeId).toBe(511);
  });

  it('traite le 404 « aucun paiement » comme une réponse du serveur, pas comme un succès vide', () => {
    let paiement: PaiementResponse | undefined;
    let erreurRecue: unknown;

    service.parCommande(511).subscribe({
      next: (valeur) => (paiement = valeur),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_COMMANDE_511)
      .flush({ message: 'Aucun paiement n’existe pour la commande : 511', statut: 404 },
        { status: 404, statusText: 'Not Found' });

    expect(paiement).toBeUndefined();
    expect(erreurRecue).toBeInstanceOf(HttpErrorResponse);
    expect((erreurRecue as HttpErrorResponse).status).toBe(404);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Aucun paiement n’existe pour la commande : 511',
    );
  });

  it('propage un 400 métier avec son message réel (commande annulée, déjà livrée, paiement existant)', () => {
    for (const message of [
      'Impossible d’initier un paiement pour une commande annulée.',
      'Cette commande est déjà livrée.',
      'Un paiement existe déjà pour cette commande.',
    ]) {
      let erreurRecue: unknown;
      service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe({
        error: (erreur) => (erreurRecue = erreur),
      });

      http.expectOne(URL_PAIEMENTS).flush({ message, statut: 400 },
        { status: 400, statusText: 'Bad Request' });

      expect(messageErreurApi(erreurRecue, 'défaut')).toBe(message);
    }
  });

  it('propage un refus 403 sans le transformer en erreur d’authentification', () => {
    let erreurRecue: unknown;
    service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe({
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_PAIEMENTS)
      .flush(
        { message: 'Accès refusé : vous n’avez pas les droits nécessaires pour cette ressource.' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect((erreurRecue as HttpErrorResponse).status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'défaut')).not.toContain('jeton');
  });

  it('propage une erreur 401 avec le message du backend (la session reste gérée par l’intercepteur)', () => {
    let erreurRecue: unknown;
    service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe({
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_PAIEMENTS)
      .flush({ message: 'Authentification requise : fournissez un jeton JWT valide.' },
        { status: 401, statusText: 'Unauthorized' });

    expect((erreurRecue as HttpErrorResponse).status).toBe(401);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Authentification requise : fournissez un jeton JWT valide.',
    );
  });

  it('signale une erreur réseau par un statut 0, sans inventer de paiement', () => {
    let paiement: PaiementResponse | undefined;
    let erreurRecue: unknown;

    service.simuler({ commandeId: 511, moyenPaiement: 'WAVE' }).subscribe({
      next: (valeur) => (paiement = valeur),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_PAIEMENTS)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(paiement).toBeUndefined();
    expect((erreurRecue as HttpErrorResponse).status).toBe(0);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
    );
  });
});
