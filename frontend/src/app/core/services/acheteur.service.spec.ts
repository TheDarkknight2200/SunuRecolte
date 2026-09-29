import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AcheteurResponse } from '../modeles/domaine.modeles';
import { messageErreurApi } from '../utilitaires/erreurs-api';
import { AcheteurService } from './acheteur.service';

const URL_MOI = 'http://localhost:8080/api/acheteurs/moi';

const ACHETEUR: AcheteurResponse = {
  id: 7,
  utilisateurId: 12,
  nom: 'Fall',
  prenom: 'Mor',
  email: 'mor.fall@example.sn',
  telephone: '780000000',
  typeAcheteur: 'RESTAURATEUR',
};

describe('AcheteurService', () => {
  let service: AcheteurService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AcheteurService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('demande GET /api/acheteurs/moi sans paramètre ni corps', () => {
    let recu: AcheteurResponse | undefined;
    service.moi().subscribe((profil) => (recu = profil));

    const requete = http.expectOne(URL_MOI);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_MOI);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toBeNull();

    requete.flush(ACHETEUR);
    expect(recu).toEqual(ACHETEUR);
  });

  it('conserve l’identifiant de l’acheteur connecté, seule source du acheteurId', () => {
    let recu: AcheteurResponse | undefined;
    service.moi().subscribe((profil) => (recu = profil));

    http.expectOne(URL_MOI).flush({ ...ACHETEUR, id: 2048, utilisateurId: 512 });

    expect(recu?.id).toBe(2048);
    expect(recu?.utilisateurId).toBe(512);
  });

  it('renvoie le type d’acheteur tel que reçu, sans le déduire côté client', () => {
    let recu: AcheteurResponse | undefined;
    service.moi().subscribe((profil) => (recu = profil));

    http.expectOne(URL_MOI).flush({ ...ACHETEUR, typeAcheteur: 'COMMERCANT' });

    expect(recu?.typeAcheteur).toBe('COMMERCANT');
  });

  it('propage une erreur 401 avec le message du backend', () => {
    let profil: AcheteurResponse | undefined;
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

  it('propage une erreur 403 sans la transformer en erreur d’authentification', () => {
    let profil: AcheteurResponse | undefined;
    let erreurRecue: { status: number; error: { message: string } } | undefined;

    service.moi().subscribe({
      next: (valeur) => (profil = valeur),
      error: (erreur) => (erreurRecue = erreur),
    });

    http
      .expectOne(URL_MOI)
      .flush(
        { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource." },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(profil).toBeUndefined();
    expect(erreurRecue?.status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
  });
});
