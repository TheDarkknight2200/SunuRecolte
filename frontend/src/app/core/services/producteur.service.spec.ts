import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ModifierProfilProducteurRequest, ProducteurResponse } from '../modeles/domaine.modeles';
import { erreursParChamp, messageErreurApi } from '../utilitaires/erreurs-api';
import { ProducteurService } from './producteur.service';

const URL_MOI = 'http://localhost:8080/api/producteurs/moi';

const PRODUCTEUR: ProducteurResponse = {
  id: 4,
  utilisateurId: 9,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  telephone: '770000000',
  localisationExploitation: 'Rufisque',
  filiere: 'MARAICHAGE',
  description: null,
};

/** Contrat complet de PUT /api/producteurs/moi : les sept champs, jamais moins. */
const REQUETE: ModifierProfilProducteurRequest = {
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa.diop@example.sn',
  telephone: '770000000',
  localisationExploitation: 'Rufisque',
  filiere: 'MARAICHAGE',
  description: 'Marché de Rufisque',
};

describe('ProducteurService', () => {
  let service: ProducteurService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProducteurService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('demande GET /api/producteurs/moi sans aucun paramètre', () => {
    let recu: ProducteurResponse | undefined;
    service.moi().subscribe((profil) => (recu = profil));

    const requete = http.expectOne(URL_MOI);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_MOI);
    expect(requete.request.params.keys()).toEqual([]);

    requete.flush(PRODUCTEUR);
    expect(recu).toEqual(PRODUCTEUR);
  });

  it('conserve l’identifiant du producteur connecté, seule source du producteurId', () => {
    let recu: ProducteurResponse | undefined;
    service.moi().subscribe((profil) => (recu = profil));

    http.expectOne(URL_MOI).flush({ ...PRODUCTEUR, id: 1285, localisationExploitation: null });

    expect(recu?.id).toBe(1285);
    expect(recu?.utilisateurId).toBe(9);
    expect(recu?.localisationExploitation).toBeNull();
  });

  it('propage une erreur 401 avec le message du backend', () => {
    let profil: ProducteurResponse | undefined;
    let erreurRecue: { status: number; error: { message: string } } | undefined;

    service.moi().subscribe({
      next: (valeur) => (profil = valeur),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_MOI)
      .flush(
        { message: 'Authentification requise : fournissez un jeton JWT valide.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(profil).toBeUndefined();
    expect(erreurRecue?.status).toBe(401);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Authentification requise : fournissez un jeton JWT valide.',
    );
  });

  it('envoie PUT /api/producteurs/moi, sans aucun identifiant dans l’URL ni le corps', () => {
    let reponse: ProducteurResponse | undefined;
    service.modifierMonProfil(REQUETE).subscribe((profil) => (reponse = profil));

    const demande = http.expectOne(URL_MOI);
    expect(demande.request.method).toBe('PUT');
    expect(demande.request.urlWithParams).toBe(URL_MOI);
    expect(demande.request.params.keys()).toEqual([]);
    const corps = demande.request.body as Record<string, unknown>;
    expect(corps['id']).toBeUndefined();
    expect(corps['utilisateurId']).toBeUndefined();

    demande.flush({ ...REQUETE, ...PRODUCTEUR, description: 'Marché de Rufisque' });
    expect(reponse?.id).toBe(4);
    expect(reponse?.description).toBe('Marché de Rufisque');
  });

  it('porte les sept champs à chaque PUT, même ceux qui n’ont pas changé', () => {
    service.modifierMonProfil({ ...REQUETE, filiere: 'ELEVAGE' }).subscribe();

    const demande = http.expectOne(URL_MOI);
    const corps = demande.request.body as ModifierProfilProducteurRequest;
    expect(Object.keys(corps).sort()).toEqual([
      'description',
      'email',
      'filiere',
      'localisationExploitation',
      'nom',
      'prenom',
      'telephone',
    ]);
    expect(corps).toEqual({ ...REQUETE, filiere: 'ELEVAGE' });
    demande.flush({ ...PRODUCTEUR, filiere: 'ELEVAGE' });
  });

  it('envoie null et non une chaîne vide quand un champ facultatif est vidé', () => {
    service
      .modifierMonProfil({ ...REQUETE, localisationExploitation: null, description: null })
      .subscribe();

    const demande = http.expectOne(URL_MOI);
    expect(demande.request.body).toEqual({
      ...REQUETE,
      localisationExploitation: null,
      description: null,
    });
    demande.flush({ ...PRODUCTEUR, localisationExploitation: null });
  });

  it('propage un 400 avec les erreurs par champ du backend', () => {
    let erreurRecue: unknown;
    service.modifierMonProfil(REQUETE).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(URL_MOI)
      .flush(
        {
          statut: 400,
          message: 'Données invalides',
          erreurs: { filiere: 'La filière est obligatoire' },
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(erreursParChamp(erreurRecue)).toEqual({ filiere: 'La filière est obligatoire' });
  });

  it('propage le refus d’un email déjà pris : un 400 sans erreurs par champ', () => {
    let erreurRecue: unknown;
    service.modifierMonProfil(REQUETE).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(URL_MOI)
      .flush(
        { statut: 400, message: 'Un compte existe déjà avec cette adresse email.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(erreursParChamp(erreurRecue)).toEqual({});
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Un compte existe déjà avec cette adresse email.',
    );
  });

  it('propage un 403 avec le message du backend, sans le transformer', () => {
    let erreurRecue: unknown;
    service.modifierMonProfil(REQUETE).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(URL_MOI)
      .flush(
        { statut: 403, message: 'Accès refusé : vous n’avez pas les droits nécessaires.' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      'Accès refusé : vous n’avez pas les droits nécessaires.',
    );
  });
});
