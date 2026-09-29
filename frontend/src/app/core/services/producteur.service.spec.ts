import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProducteurResponse } from '../modeles/domaine.modeles';
import { messageErreurApi } from '../utilitaires/erreurs-api';
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
});
