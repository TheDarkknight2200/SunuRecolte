import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StatistiquesAdminResponse } from '../modeles/domaine.modeles';
import { StatistiquesAdminService } from './statistiques-admin.service';

const API = 'http://localhost:8080/api';
const URL = `${API}/admin/statistiques`;

/** Réponse type du backend : une semaine d'inscriptions, deux moyens de paiement, deux tops. */
const DONNEES: StatistiquesAdminResponse = {
  utilisateursTotal: 7,
  producteurs: 3,
  acheteurs: 4,
  recoltesActives: 5,
  commandesPeriode: 6,
  volumeAffaires: 18500,
  inscriptionsParSemaine: [
    { semaineDebut: '2026-09-28', producteurs: 1, acheteurs: 2 },
    { semaineDebut: '2026-10-05', producteurs: 2, acheteurs: 0 },
  ],
  repartitionParFiliere: [
    { nom: 'MARAICHAGE', nombre: 2 },
    { nom: 'ELEVAGE', nombre: 1 },
  ],
  repartitionParZone: [
    { nom: 'Thiès', nombre: 2 },
    { nom: 'Autres zones', nombre: 1 },
  ],
  topProducteurs: [
    { producteurId: 4, nom: 'Awa Diop', chiffreAffaires: 12000, nombreCommandes: 3 },
    { producteurId: 9, nom: 'Moussa Ndiaye', chiffreAffaires: 6500, nombreCommandes: 2 },
  ],
  topRecoltes: [
    { recolteId: 12, nom: 'Tomate', quantiteVendue: 233.5, unite: 'kg', revenu: 12000 },
  ],
  repartitionParMoyenPaiement: [
    { moyen: 'WAVE', nombre: 4, montant: 12000 },
    { moyen: 'ORANGE_MONEY', nombre: 2, montant: 6500 },
  ],
  nombreRembourses: 1,
};

describe('StatistiquesAdminService', () => {
  let service: StatistiquesAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatistiquesAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lister : GET /api/admin/statistiques sans paramètre quand aucune période n’est donnée', () => {
    let resultat: StatistiquesAdminResponse | undefined;

    service.lister().subscribe((donnees) => (resultat = donnees));

    const requete = http.expectOne((req) => req.url === URL && req.method === 'GET');
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush(DONNEES);

    expect(resultat).toEqual(DONNEES);
  });

  it('lister : envoie exactement la période, jamais un identifiant ni un filtre de compte', () => {
    service.lister('7j').subscribe();

    const requete = http.expectOne(`${URL}?periode=7j`);
    expect(requete.request.params.keys()).toEqual(['periode']);
    for (const parametre of ['id', 'producteurId', 'acheteurId', 'role', 'zone', 'email']) {
      expect(requete.request.params.has(parametre)).toBe(false);
    }
    requete.flush(DONNEES);
  });

  it.each(['7j', '30j', 'mois'])('lister : la période %s est transmise telle quelle', (periode) => {
    service.lister(periode as '7j' | '30j' | 'mois').subscribe();

    const requete = http.expectOne(`${URL}?periode=${periode}`);
    expect(requete.request.params.get('periode')).toBe(periode);
    requete.flush(DONNEES);
  });

  it('lister : la réponse du backend est rendue telle quelle, sans rien recalculer', () => {
    let recu: StatistiquesAdminResponse | undefined;

    service.lister('mois').subscribe((donnees) => (recu = donnees));

    http.expectOne(`${URL}?periode=mois`).flush(DONNEES);

    // Le service ne touche à rien : c'est bien l'objet rendu par `GET /api/admin/statistiques?periode=mois`.
    expect(recu).toBe(DONNEES);
  });

  it('lister : un 403 remonte tel quel, avec son message de backend', () => {
    let statutRecu = 0;
    let messageRecu = '';

    service.lister().subscribe({
      error: (erreur: HttpErrorResponse) => {
        statutRecu = erreur.status;
        messageRecu = erreur.error.message;
      },
    });

    http.expectOne(URL).flush(
      {
        statut: 403,
        message: 'Accès refusé : vous n’avez pas les droits nécessaires.',
        timestamp: '2026-10-08T10:00:00',
      },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(statutRecu).toBe(403);
    expect(messageRecu).toBe('Accès refusé : vous n’avez pas les droits nécessaires.');
  });
});
