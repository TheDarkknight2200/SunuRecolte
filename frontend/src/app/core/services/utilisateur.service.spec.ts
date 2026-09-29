import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UtilisateurResponse } from '../modeles/domaine.modeles';
import { erreursParChamp, messageErreurApi } from '../utilitaires/erreurs-api';
import { UtilisateurService } from './utilisateur.service';

const API = 'http://localhost:8080/api';
const UTILISATEURS = `${API}/utilisateurs`;

const COMPTE: UtilisateurResponse = {
  id: 9,
  nom: 'Fall',
  prenom: 'Moussa',
  email: 'moussa.fall@example.sn',
  telephone: '771112233',
  role: 'PRODUCTEUR',
  dateCreation: '2026-05-12T08:30:00',
  actif: true,
};

describe('UtilisateurService', () => {
  let service: UtilisateurService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UtilisateurService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lister : GET /api/utilisateurs sans aucun paramètre quand aucun rôle n’est demandé', () => {
    let recus: UtilisateurResponse[] = [];
    service.lister().subscribe((comptes) => (recus = comptes));

    const requete = http.expectOne(UTILISATEURS);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(UTILISATEURS);
    expect(requete.request.params.keys()).toEqual([]);

    requete.flush([COMPTE]);
    expect(recus).toEqual([COMPTE]);
  });

  it('lister : le rôle est porté par `?role=`, jamais par un chemin ou un corps', () => {
    service.lister('ACHETEUR').subscribe();

    const requete = http.expectOne(`${UTILISATEURS}?role=ACHETEUR`);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.url).toBe(UTILISATEURS);
    expect(requete.request.params.get('role')).toBe('ACHETEUR');
    expect(requete.request.params.keys().length).toBe(1);
    requete.flush([]);
  });

  it('lister : le tri et le contenu viennent du serveur, rien n’est réordonné ici', () => {
    let recus: UtilisateurResponse[] = [];
    service.lister().subscribe((comptes) => (recus = comptes));

    http.expectOne(UTILISATEURS).flush([
      { ...COMPTE, id: 12, actif: false },
      { ...COMPTE, id: 3, role: 'ADMIN' },
      { ...COMPTE, id: 7, role: 'ACHETEUR' },
    ]);

    expect(recus.map((compte) => compte.id)).toEqual([12, 3, 7]);
    expect(recus[0].actif).toBe(false);
    expect(recus[1].role).toBe('ADMIN');
  });

  it('findById : GET /api/utilisateurs/{id}', () => {
    let recu: UtilisateurResponse | undefined;
    service.findById(9).subscribe((compte) => (recu = compte));

    const requete = http.expectOne(`${UTILISATEURS}/9`);
    expect(requete.request.method).toBe('GET');
    requete.flush(COMPTE);

    expect(recu).toEqual(COMPTE);
  });

  it('changerActif : PATCH /{id}/actif avec un corps réduit à `actif`', () => {
    let recu: UtilisateurResponse | undefined;
    service.changerActif(9, false).subscribe((compte) => (recu = compte));

    const requete = http.expectOne(`${UTILISATEURS}/9/actif`);
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.urlWithParams).toBe(`${UTILISATEURS}/9/actif`);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.body).toEqual({ actif: false });

    requete.flush({ ...COMPTE, actif: false });
    expect(recu?.actif).toBe(false);
    expect(recu?.id).toBe(9);
  });

  it('changerActif : la réactivation envoie explicitement `actif: true`', () => {
    service.changerActif(9, true).subscribe();

    const requete = http.expectOne(`${UTILISATEURS}/9/actif`);
    expect(requete.request.body).toEqual({ actif: true });
    requete.flush(COMPTE);
  });

  it('changerActif : le corps ne porte ni identifiant, ni rôle, ni mot de passe', () => {
    service.changerActif(9, false).subscribe();

    const corps = http.expectOne(`${UTILISATEURS}/9/actif`).request.body as Record<string, unknown>;
    expect(Object.keys(corps)).toEqual(['actif']);
    expect(corps['id']).toBeUndefined();
    expect(corps['role']).toBeUndefined();
    expect(corps['motDePasse']).toBeUndefined();
    expect(corps['password']).toBeUndefined();
  });

  it('lister : un 403 de non-ADMIN remonte tel quel, sans transformation', () => {
    let erreurRecue: unknown;
    service.lister().subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(UTILISATEURS)
      .flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
          timestamp: '2026-09-29T10:00:00',
        },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
  });

  it('changerActif : la modification de son propre compte est refusée en 400', () => {
    let erreurRecue: unknown;
    service.changerActif(1, false).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${UTILISATEURS}/1/actif`)
      .flush(
        {
          statut: 400,
          message: "Vous ne pouvez pas modifier l'état de votre propre compte.",
          timestamp: 'x',
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(erreursParChamp(erreurRecue)).toEqual({});
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Vous ne pouvez pas modifier l'état de votre propre compte.",
    );
  });

  it('changerActif : un compte inconnu reste une 404 avec le message du backend', () => {
    let erreurRecue: unknown;
    service.changerActif(999_999, false).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${UTILISATEURS}/999999/actif`)
      .flush(
        { statut: 404, message: "Utilisateur introuvable avec l'id : 999999", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Utilisateur introuvable avec l'id : 999999",
    );
  });
});
