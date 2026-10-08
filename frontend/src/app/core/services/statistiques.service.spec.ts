import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StatistiquesProducteurResponse } from '../modeles/domaine.modeles';
import { StatistiquesService } from './statistiques.service';

const API = 'http://localhost:8080/api';
const STATISTIQUES_URL = `${API}/producteurs/moi/statistiques`;

/** Réponse type du backend : deux journées, une récolte en tête, un stock sous le seuil. */
const DONNEES: StatistiquesProducteurResponse = {
  chiffreAffaires: 1350,
  nombreCommandes: 2,
  panierMoyen: 675,
  tauxAnnulation: 50,
  repartitionStatuts: [
    { statut: 'EN_ATTENTE', nombre: 1 },
    { statut: 'ANNULEE', nombre: 1 },
  ],
  ventesParJour: [
    { date: '2026-10-07', montant: 1350 },
    { date: '2026-10-08', montant: 0 },
  ],
  topRecoltes: [
    { recolteId: 12, nom: 'Tomate', quantiteVendue: 60, unite: 'kg', revenu: 1350 },
  ],
  stockFaible: [
    { recolteId: 13, nom: 'Oignon', quantiteDisponible: 2, unite: 'kg', statut: 'DISPONIBLE' },
  ],
  commandesATraiter: 1,
};

describe('StatistiquesService', () => {
  let service: StatistiquesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatistiquesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lister : GET /api/producteurs/moi/statistiques sans paramètre quand aucune période n’est donnée', () => {
    let resultat: StatistiquesProducteurResponse | undefined;

    service.lister().subscribe((donnees) => (resultat = donnees));

    const requete = http.expectOne(
      (req) => req.url === STATISTIQUES_URL && req.method === 'GET',
    );
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush(DONNEES);

    expect(resultat).toEqual(DONNEES);
  });

  it('lister : envoie exactement la période, jamais un identifiant de producteur', () => {
    service.lister('7j').subscribe();

    const requete = http.expectOne(`${STATISTIQUES_URL}?periode=7j`);
    expect(requete.request.params.keys()).toEqual(['periode']);
    expect(requete.request.params.has('producteurId')).toBe(false);
    expect(requete.request.params.has('id')).toBe(false);
    requete.flush(DONNEES);
  });

  it.each(['7j', '30j', 'mois'])('lister : la période %s est transmise telle quelle', (periode) => {
    service.lister(periode as '7j' | '30j' | 'mois').subscribe();

    const requete = http.expectOne(`${STATISTIQUES_URL}?periode=${periode}`);
    expect(requete.request.params.get('periode')).toBe(periode);
    requete.flush(DONNEES);
  });

  it('lister : la réponse du backend est rendue telle quelle, sans rien recalculer', () => {
    let recu: StatistiquesProducteurResponse | undefined;

    service.lister('mois').subscribe((donnees) => (recu = donnees));

    http.expectOne(`${STATISTIQUES_URL}?periode=mois`).flush(DONNEES);

    // Le service ne touche à rien : c'est bien l'objet rendu par `GET .../statistiques?periode=mois`.
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

    http.expectOne(STATISTIQUES_URL).flush(
      { statut: 403, message: 'Accès refusé : vous n’avez pas les droits nécessaires.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(statutRecu).toBe(403);
    expect(messageRecu).toBe('Accès refusé : vous n’avez pas les droits nécessaires.');
  });
});
