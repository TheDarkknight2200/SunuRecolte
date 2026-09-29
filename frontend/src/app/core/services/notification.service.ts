import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationResponse } from '../modeles/domaine.modeles';

/**
 * Notifications du titulaire du jeton (FRONTEND_DESIGN.md §29).
 *
 * Deux méthodes, celles dont les écrans ont besoin : `GET /api/notifications` et
 * `PUT /api/notifications/{id}/lue`. `GET /api/notifications/{id}` existe côté backend
 * mais n'est utilisé par aucun écran : aucune méthode ne le reprend ici.
 *
 * **Aucun `utilisateurId` n'est envoyé** : le backend détermine le destinataire à partir
 * du jeton (§19). Aucun comptage n'est demandé au serveur — il n'existe aucun endpoint de
 * comptage —, le nombre de non-lues est une conséquence du calcul rendu ici.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  /**
   * Dernières notifications renvoyées par le serveur, partagées entre la page
   * `/notifications` et l'en-tête : une seule source, donc un seul compteur.
   * Uniquement des valeurs reçues du serveur, jamais une réécriture locale.
   */
  private readonly etatNotifications = signal<NotificationResponse[]>([]);

  readonly notifications = this.etatNotifications.asReadonly();

  /** Nombre de non-lues calculé sur la dernière réponse du serveur. */
  readonly nonLues = computed(() =>
    this.etatNotifications().filter((notification) => !notification.lu).length,
  );

  /** Liste des notifications du titulaire du jeton, triée par le serveur (dateCreation DESC). */
  mesNotifications(): Observable<NotificationResponse[]> {
    return this.http
      .get<NotificationResponse[]>(`${environment.apiUrl}/notifications`)
      .pipe(tap((liste) => this.etatNotifications.set(liste)));
  }

  /**
   * Marque une notification comme lue. `PUT` sans **aucun** corps, idempotent côté serveur,
   * et réponse = la notification avec `lu = true`.
   *
   * L'état partagé n'est mis à jour qu'à la **réponse** : un échec laisse la liste telle quelle,
   * donc le compteur n'est jamais décrémenté par erreur.
   */
  marquerLue(id: number): Observable<NotificationResponse> {
    return this.http
      .put<NotificationResponse>(`${environment.apiUrl}/notifications/${id}/lue`, null)
      .pipe(
        tap((lue) =>
          this.etatNotifications.update((liste) =>
            liste.map((notification) => (notification.id === lue.id ? lue : notification)),
          ),
        ),
      );
  }
}
