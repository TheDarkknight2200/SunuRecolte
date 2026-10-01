import { Component, computed, effect, inject } from '@angular/core';
import { TiroirPanierService } from '../../core/services/tiroir-panier.service';
import { Notice, ToastService } from '../../core/services/toast.service';

/**
 * Notice de retour d'action, montée une seule fois dans `app.html` (§39.2).
 * Elle ne décide rien : elle rend ce que `ToastService` lui confie et ne doit jamais
 * masquer l'action principale du panier latéral, modal et collé en bas de l'écran.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  private readonly tiroir = inject(TiroirPanierService);
  private readonly toast = inject(ToastService);

  protected readonly notice = computed(() =>
    this.tiroir.ouvert() ? null : this.toast.notice(),
  );

  protected readonly enSortie = this.toast.enSortie;

  constructor() {
    // Le tiroir modal passe devant la notice : son ouverture gèle le minuteur, sa fermeture le relance.
    // Sans cette mise en attente, une notice émise derrière un tiroir ouvert expirerait sans jamais être lue.
    effect(() => {
      if (this.tiroir.ouvert()) {
        if (this.toast.notice() !== null) {
          this.toast.suspendre();
        }
      } else {
        this.toast.reprendre();
      }
    });
  }

  /** Succès et info : région `role="status"`, annoncée poliment. */
  protected readonly polie = computed<Notice | null>(() => {
    const notice = this.notice();
    return notice !== null && notice.type !== 'erreur' ? notice : null;
  });

  /** Erreur : région `role="alert"`, annoncée immédiatement et fermable par l'utilisateur. */
  protected readonly grave = computed<Notice | null>(() => {
    const notice = this.notice();
    return notice !== null && notice.type === 'erreur' ? notice : null;
  });

  protected suspendre(): void {
    this.toast.suspendre();
  }

  protected reprendre(): void {
    this.toast.reprendre();
  }

  protected masquer(): void {
    this.toast.masquer();
  }

  /**
   * Trois glyphes déjà embarqués dans le sous-ensemble de §9 : `check_circle` (f0be),
   * `error` (f8b6), `info` (e88e). Aucun codepoint nouveau n'est ajouté à la police.
   */
  protected glyphe(notice: Notice): string {
    if (notice.type === 'succes') {
      return '';
    }
    if (notice.type === 'erreur') {
      return '';
    }
    return '';
  }
}
