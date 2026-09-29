import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationResponse } from '../modeles/domaine.modeles';
import { messageErreurApi } from '../utilitaires/erreurs-api';
import { CLE_UTILISATEUR } from './auth.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

const API = 'http://localhost:8080/api';
const URL_NOTIFICATIONS = `${API}/notifications`;

function notification(id: number, lu: boolean): NotificationResponse {
  return {
    id,
    utilisateurId: 9,
    titre: lu ? 'Suivi de commande' : 'Nouvelle commande',
    message: lu
      ? 'Le statut de votre commande n° 1123 est désormais : CONFIRMEE.'
      : 'Vous avez reçu la commande n° 1123 de la part de Moussa Fall.',
    lu,
    dateCreation: `2026-09-2${id}T10:15:30`,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('demande mes notifications par GET /api/notifications, seule URL de l’application', () => {
    let recues: NotificationResponse[] | undefined;
    service.mesNotifications().subscribe((liste) => (recues = liste));

    const requete = http.expectOne(URL_NOTIFICATIONS);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_NOTIFICATIONS);

    requete.flush([]);
    expect(recues).toEqual([]);
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('n’envoie aucun paramètre de requête : le serveur lit l’identité dans le jeton', () => {
    service.mesNotifications().subscribe();

    const requete = http.expectOne(URL_NOTIFICATIONS);
    expect(requete.request.params.keys()).toEqual([]);
    expect(requete.request.responseType).toBe('json');

    requete.flush([]);
  });

  it('n’envoie aucun corps sur la lecture', () => {
    service.mesNotifications().subscribe();

    const requete = http.expectOne(URL_NOTIFICATIONS);
    expect(requete.request.body).toBeNull();

    requete.flush([]);
  });

  it('reprend la liste du serveur telle quelle, dans son ordre et avec ses seules propriétés', () => {
    // Ordre renvoyé par le backend : dateCreation DESC. Le service ne retraie rien.
    const seconde = notification(2, false);
    const premiere = notification(7, true);
    let recues: NotificationResponse[] | undefined;

    service.mesNotifications().subscribe((liste) => (recues = liste));
    http.expectOne(URL_NOTIFICATIONS).flush([premiere, seconde]);

    expect(recues).toEqual([premiere, seconde]);
    expect(Object.keys(recues?.[0] ?? {}).sort()).toEqual([
      'dateCreation',
      'id',
      'lu',
      'message',
      'titre',
      'utilisateurId',
    ]);
  });

  it('marque une notification comme lue par PUT /api/notifications/{id}/lue', () => {
    let recue: NotificationResponse | undefined;
    service.marquerLue(4).subscribe((lue) => (recue = lue));

    const requete = http.expectOne(`${URL_NOTIFICATIONS}/4/lue`);
    expect(requete.request.method).toBe('PUT');
    expect(requete.request.urlWithParams).toBe(`${URL_NOTIFICATIONS}/4/lue`);

    requete.flush(notification(4, true));
    expect(recue?.lu).toBe(true);
  });

  it('n’envoie ni corps ni paramètre pour le marquage', () => {
    service.marquerLue(4).subscribe();

    const requete = http.expectOne(`${URL_NOTIFICATIONS}/4/lue`);
    expect(requete.request.body).toBeNull();
    expect(requete.request.params.keys()).toEqual([]);

    requete.flush(notification(4, true));
  });

  it('ne ajoute jamais d’utilisateurId, que ce soit en paramètre ou dans un corps', () => {
    service.mesNotifications().subscribe();
    const lecture = http.expectOne(URL_NOTIFICATIONS);
    expect(lecture.request.serializeBody()).toBeNull();
    expect(lecture.request.params.keys()).toEqual([]);
    lecture.flush([]);

    service.marquerLue(4).subscribe();
    const marquage = http.expectOne(`${URL_NOTIFICATIONS}/4/lue`);
    expect(marquage.request.serializeBody()).toBeNull();
    expect(marquage.request.params.keys()).toEqual([]);
    expect(marquage.request.urlWithParams).not.toMatch(/utilisateur/i);
    marquage.flush(notification(4, true));
  });

  it('propage un refus 403 avec le message réel, sans le transformer en erreur d’authentification', () => {
    let erreurRecue: unknown;
    service.marquerLue(4).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(`${URL_NOTIFICATIONS}/4/lue`)
      .flush(
        { message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.", statut: 403 },
        { status: 403, statusText: 'Forbidden' },
      );

    expect((erreurRecue as HttpErrorResponse).status).toBe(403);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
  });

  it('propage un 404 de notification inconnue', () => {
    let erreurRecue: unknown;
    service.marquerLue(999999).subscribe({ error: (erreur) => (erreurRecue = erreur) });

    // Message réellement produit par `new ResourceNotFoundException("Notification", id)`.
    http
      .expectOne(`${URL_NOTIFICATIONS}/999999/lue`)
      .flush({ message: "Notification introuvable avec l'id : 999999", statut: 404 },
        { status: 404, statusText: 'Not Found' });

    expect((erreurRecue as HttpErrorResponse).status).toBe(404);
    expect(messageErreurApi(erreurRecue, 'défaut')).toBe(
      "Notification introuvable avec l'id : 999999",
    );
  });

  it('laisse le 401 à l’intercepteur global : le service ne purge rien lui-même', () => {
    localStorage.setItem(
      CLE_UTILISATEUR,
      JSON.stringify({
        utilisateurId: 9,
        nom: 'Fall',
        prenom: 'Moussa',
        email: 'moussa.fall@example.sn',
        role: 'ACHETEUR',
      }),
    );
    const auth = TestBed.inject(AuthService);
    expect(auth.estConnecte()).toBe(true);

    let erreurRecue: unknown;
    service.mesNotifications().subscribe({ error: (erreur) => (erreurRecue = erreur) });

    http
      .expectOne(URL_NOTIFICATIONS)
      .flush({ message: 'Authentification requise : fournissez un jeton JWT valide.' },
        { status: 401, statusText: 'Unauthorized' });

    expect((erreurRecue as HttpErrorResponse).status).toBe(401);
    // Aucune logique de sécurité ici : la session locale reste en place, l'intercepteur décide.
    expect(auth.estConnecte()).toBe(true);
  });

  it('calcule le compteur de non-lues sur la liste du serveur, aucun endpoint ne le fournit', () => {
    expect(service.nonLues()).toBe(0);

    service.mesNotifications().subscribe();
    http.expectOne(URL_NOTIFICATIONS).flush([notification(1, false), notification(2, true), notification(3, false)]);

    expect(service.nonLues()).toBe(2);
    expect(service.notifications()).toHaveLength(3);
  });

  it('partage la lecture déjà partie : l’en-tête et la page montés ensemble n’émettent qu’un seul GET', () => {
    const recuesEnTete: NotificationResponse[][] = [];
    const recuesPage: NotificationResponse[][] = [];

    service.mesNotifications().subscribe((liste) => recuesEnTete.push(liste));
    service.mesNotifications().subscribe((liste) => recuesPage.push(liste));

    // `expectOne` échoue dès que deux `GET` identiques sont partis : l’unique requête est la preuve.
    const requete = http.expectOne(URL_NOTIFICATIONS);
    expect(requete.request.method).toBe('GET');
    requete.flush([notification(1, false)]);

    expect(recuesEnTete).toHaveLength(1);
    expect(recuesPage).toHaveLength(1);
    expect(service.nonLues()).toBe(1);
  });

  it('ne met aucun résultat en cache : la lecture qui suit une réponse repart au serveur', () => {
    service.mesNotifications().subscribe();
    http.expectOne(URL_NOTIFICATIONS).flush([notification(1, true)]);

    service.mesNotifications().subscribe();
    const seconde = http.expectOne(URL_NOTIFICATIONS);
    expect(seconde.request.method).toBe('GET');
    seconde.flush([notification(1, false)]);

    expect(service.nonLues()).toBe(1);
  });

  it('n’anticipe jamais l’état lu : le passage à lu vient de la réponse du serveur', () => {
    service.mesNotifications().subscribe();
    http.expectOne(URL_NOTIFICATIONS).flush([notification(1, false)]);
    expect(service.nonLues()).toBe(1);

    service.marquerLue(1).subscribe();
    // Rien n'est encore reçu : la notification reste non lue et le compteur aussi.
    expect(service.notifications()[0]?.lu).toBe(false);
    expect(service.nonLues()).toBe(1);

    http.expectOne(`${URL_NOTIFICATIONS}/1/lue`).flush(notification(1, true));
    expect(service.notifications()[0]?.lu).toBe(true);
    expect(service.nonLues()).toBe(0);
  });

  it('conserve la liste précédente quand le marquage échoue', () => {
    service.mesNotifications().subscribe();
    http.expectOne(URL_NOTIFICATIONS).flush([notification(1, false), notification(2, false)]);

    service.marquerLue(1).subscribe({ error: () => undefined });
    http
      .expectOne(`${URL_NOTIFICATIONS}/1/lue`)
      .flush({ message: 'Erreur interne inattendue.', statut: 500 },
        { status: 500, statusText: 'Internal Server Error' });

    expect(service.notifications().map((n) => n.lu)).toEqual([false, false]);
    expect(service.nonLues()).toBe(2);
  });

  it('ne déclenche aucune requête par lui-même : rien ne part sans appel', () => {
    expect(http.match(() => true)).toHaveLength(0);
    // Aucun `setInterval`, aucun `EventSource`, aucun WebSocket : le service n'ouvre aucun canal.
    expect(service.nonLues()).toBe(0);
    expect(http.match(() => true)).toHaveLength(0);
  });
});
