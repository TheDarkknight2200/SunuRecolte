import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationResponse } from '../../core/modeles/domaine.modeles';
import { NotificationService } from '../../core/services/notification.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { formaterDateHeure } from '../../core/utilitaires/formatage';

/**
 * Notifications du compte connecté (`GET /api/notifications`), écran **transversal** :
 * un producteur reçoit « Nouvelle commande », un acheteur « Suivi de commande », et
 * l'ADMIN n'est pas exclu — d'où `authGuard` seul, sans `roleGuard` (FRONTEND_DESIGN.md §29).
 *
 * La liste affichée est celle du **service**, c'est-à-dire la dernière réponse du serveur :
 * cette page ne conserve aucune copie qu'elle réécrirait elle-même. Marquer comme lue attend
 * la réponse de `PUT /api/notifications/{id}/lue` avant de changer quoi que ce soit.
 *
 * Aucune actualisation automatique : ni `setInterval`, ni polling, ni WebSocket. Le
 * rafraîchissement vient de l'ouverture de la page, du bouton « Actualiser » ou d'un marquage.
 */
@Component({
  selector: 'app-notifications',
  imports: [RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private readonly service = inject(NotificationService);

  protected readonly liste = this.service.notifications;
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Message du marquage raté : la notification garde son état précédent, le bouton reste disponible. */
  protected readonly erreurMarquage = signal<string | null>(null);

  /** Un seul marquage à la fois : la garde empêche le second clic d'envoyer une autre requête. */
  protected readonly marquageEnCours = signal<number | null>(null);

  protected readonly vide = computed(() => this.liste().length === 0);

  protected readonly formaterDateHeure = formaterDateHeure;

  private readonly titre = viewChild('titrePage', { read: ElementRef });

  /** Le focus n'est posé que sur une actualisation **déclenchée par l'utilisateur**. */
  private readonly focusAttendu = signal(false);

  constructor() {
    this.charger(false);

    effect(() => {
      const titre = this.titre();
      if (this.focusAttendu() && titre !== undefined) {
        titre.nativeElement.focus();
        this.focusAttendu.set(false);
      }
    });
  }

  protected charger(poseFocus: boolean): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.service.mesNotifications().subscribe({
      next: () => {
        this.chargement.set(false);
        if (poseFocus) {
          this.focusAttendu.set(true);
        }
      },
      error: (erreur: unknown) => {
        // Un 403 comme un 500 : le message du backend, sans déconnexion ni redirection (§19).
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger vos notifications.'));
        this.chargement.set(false);
      },
    });
  }

  protected actualiser(): void {
    this.charger(true);
  }

  protected reessayer(): void {
    this.charger(false);
  }

  protected marquerLue(id: number): void {
    if (this.marquageEnCours() !== null) {
      return;
    }
    this.marquageEnCours.set(id);
    this.erreurMarquage.set(null);

    this.service.marquerLue(id).subscribe({
      next: () => this.marquageEnCours.set(null),
      error: (erreur: unknown) => {
        this.marquageEnCours.set(null);
        this.erreurMarquage.set(
          messageErreurApi(erreur, 'Cette notification n’a pas pu être marquée comme lue.'),
        );
      },
    });
  }

  protected enMarquage(id: number): boolean {
    return this.marquageEnCours() === id;
  }

  /** Le texte porte l'état : la couleur seule ne suffirait pas (§29, §12). */
  protected classesEtat(notification: NotificationResponse): string {
    return notification.lu ? 'badge' : 'badge badge--avertissement';
  }

  protected libelleEtat(notification: NotificationResponse): string {
    return notification.lu ? 'Lue' : 'Non lue';
  }
}
