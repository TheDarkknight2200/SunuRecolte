import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PrixMarcheRequest, PrixMarcheResponse } from '../modeles/domaine.modeles';
import { erreursParChamp, messageErreurApi } from '../utilitaires/erreurs-api';
import { PrixMarcheService } from './prix-marche.service';

const API = 'http://localhost:8080/api';
const PRIX = `${API}/prix-marche`;

const LIGNE: PrixMarcheResponse = {
  id: 3,
  produit: 'Mande de 1er choix',
  unite: 'kg',
  prixMoyen: 350,
  marcheReference: 'Marché de Thiaroye',
  dateMiseAJour: '2026-09-20T11:05:00',
};

const REQUETE: PrixMarcheRequest = {
  produit: 'Mande de 1er choix',
  unite: 'kg',
  prixMoyen: 350,
  marcheReference: 'Marché de Thiaroye',
};

describe('PrixMarcheService', () => {
  let service: PrixMarcheService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrixMarcheService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lister : GET /api/prix-marche sur l’URL centralisée, sans aucun paramètre', () => {
    let recues: PrixMarcheResponse[] = [];
    service.lister().subscribe((prix) => (recues = prix));

    const requete = http.expectOne(PRIX);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(PRIX);
    expect(requete.request.params.keys()).toEqual([]);

    requete.flush([LIGNE]);
    expect(recues).toEqual([LIGNE]);
  });

  it('lister : l’ordre rendu par le serveur (produit croissant) est conservé tel quel', () => {
    let recues: PrixMarcheResponse[] = [];
    service.lister().subscribe((prix) => (recues = prix));

    http.expectOne(PRIX).flush([
      { ...LIGNE, id: 1, produit: 'Carotte' },
      { ...LIGNE, id: 8, produit: 'Mangue' },
      { ...LIGNE, id: 4, produit: 'Tomate' },
    ]);

    expect(recues.map((prix) => prix.produit)).toEqual(['Carotte', 'Mangue', 'Tomate']);
    expect(recues.map((prix) => prix.id)).toEqual([1, 8, 4]);
  });

  it('findById : GET /api/prix-marche/{id}', () => {
    let recu: PrixMarcheResponse | undefined;
    service.findById(3).subscribe((prix) => (recu = prix));

    const requete = http.expectOne(`${PRIX}/3`);
    expect(requete.request.method).toBe('GET');
    requete.flush(LIGNE);

    expect(recu).toEqual(LIGNE);
  });

  it('findById : une ligne inconnue reste une 404 avec le message du backend', () => {
    let erreurRecue: unknown;
    service.findById(999_999).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${PRIX}/999999`)
      .flush(
        { statut: 404, message: "PrixMarche introuvable avec l'id : 999999", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );

    expect((erreurRecue as HttpErrorResponse).status).toBe(404);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "PrixMarche introuvable avec l'id : 999999",
    );
  });

  it('creer : POST /api/prix-marche avec le contrat d’écriture, réponse 201', () => {
    let recu: PrixMarcheResponse | undefined;
    service.creer(REQUETE).subscribe((prix) => (recu = prix));

    const requete = http.expectOne(PRIX);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(REQUETE);

    requete.flush(LIGNE, { status: 201, statusText: 'Created' });
    expect(recu).toEqual(LIGNE);
  });

  it('modifier : PUT /api/prix-marche/{id}, l’identifiant n’est jamais dans le corps', () => {
    let recu: PrixMarcheResponse | undefined;
    service.modifier(3, { ...REQUETE, prixMoyen: 400 }).subscribe((prix) => (recu = prix));

    const requete = http.expectOne(`${PRIX}/3`);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.urlWithParams).toBe(`${PRIX}/3`);
    const corps = requete.request.body as Record<string, unknown>;
    expect(corps['id']).toBeUndefined();
    expect(corps).toEqual({ ...REQUETE, prixMoyen: 400 });

    requete.flush({ ...LIGNE, prixMoyen: 400 });
    expect(recu?.prixMoyen).toBe(400);
  });

  it('les deux écritures n’envoient jamais `dateMiseAJour` : c’est l’entité qui le pose', () => {
    service.creer(REQUETE).subscribe();
    const creation = http.expectOne(PRIX);
    expect(Object.keys(creation.request.body as Record<string, unknown>).sort()).toEqual([
      'marcheReference',
      'prixMoyen',
      'produit',
      'unite',
    ]);
    creation.flush(LIGNE, { status: 201, statusText: 'Created' });

    service.modifier(3, REQUETE).subscribe();
    const modification = http.expectOne(`${PRIX}/3`);
    expect((modification.request.body as Record<string, unknown>)['dateMiseAJour']).toBeUndefined();
    modification.flush(LIGNE);
  });

  it('une ligne sans marché de référence est envoyée en `null`, jamais en chaîne vide', () => {
    service.creer({ ...REQUETE, marcheReference: null }).subscribe();

    const requete = http.expectOne(PRIX);
    expect(requete.request.body).toEqual({ ...REQUETE, marcheReference: null });
    requete.flush({ ...LIGNE, marcheReference: null }, { status: 201, statusText: 'Created' });
  });

  it('supprimer : DELETE /api/prix-marche/{id} et réponse 204 sans corps', () => {
    let terminez = false;
    service.supprimer(3).subscribe({ next: () => (terminez = true) });

    const requete = http.expectOne(`${PRIX}/3`);
    expect(requete.request.method).toBe('DELETE');
    requete.flush(null, { status: 204, statusText: 'No Content' });

    expect(terminez).toBe(true);
  });

  it('creer : un 400 avec erreurs par champ remonte les messages du DTO', () => {
    let erreurRecue: unknown;
    service
      .creer({ ...REQUETE, produit: '', prixMoyen: -5 })
      .subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(PRIX)
      .flush(
        {
          statut: 400,
          message: 'Données invalides',
          erreurs: {
            produit: 'Le produit est obligatoire',
            prixMoyen: 'Le prix moyen doit être positif',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(erreursParChamp(erreurRecue)).toEqual({
      produit: 'Le produit est obligatoire',
      prixMoyen: 'Le prix moyen doit être positif',
    });
  });

  it('les trois écritures propagent un 403 sans le transformer en 401', () => {
    const refus = {
      statut: 403,
      message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
      timestamp: 'x',
    };

    let statutCreer = 0;
    service.creer(REQUETE).subscribe({ error: (erreur: HttpErrorResponse) => (statutCreer = erreur.status) });
    http.expectOne(PRIX).flush(refus, { status: 403, statusText: 'Forbidden' });

    let statutModifier = 0;
    service
      .modifier(3, REQUETE)
      .subscribe({ error: (erreur: HttpErrorResponse) => (statutModifier = erreur.status) });
    http.expectOne(`${PRIX}/3`).flush(refus, { status: 403, statusText: 'Forbidden' });

    let statutSupprimer = 0;
    service
      .supprimer(3)
      .subscribe({ error: (erreur: HttpErrorResponse) => (statutSupprimer = erreur.status) });
    http.expectOne(`${PRIX}/3`).flush(refus, { status: 403, statusText: 'Forbidden' });

    expect([statutCreer, statutModifier, statutSupprimer]).toEqual([403, 403, 403]);
  });
});
