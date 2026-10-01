import { Injectable, signal } from '@angular/core';

export type TypeNotice = 'succes' | 'erreur' | 'info';

export interface Notice {
  readonly message: string;
  readonly type: TypeNotice;
}

/** Durées d'affichage imposées par FRONTEND_DESIGN.md §39.2. */
const DUREES: Record<TypeNotice, number> = { succes: 2500, info: 2500, erreur: 5000 };

/** Temps de la descente, aligné sur `--duree-mouvement` du design system. */
const DUREE_SORTIE = 300;

/**
 * Notice de retour d'action, unique pour toute l'application (§39.2). Purement visuelle :
 * elle ne calcule rien, n'appelle aucune API et ne juge jamais du succès d'une action —
 * l'écran qui déclenche l'action lui transmet le message et son type.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly etat = signal<Notice | null>(null);
  private readonly sortant = signal(false);

  readonly notice = this.etat.asReadonly();
  readonly enSortie = this.sortant.asReadonly();

  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private reste = 0;
  private echeance = 0;

  afficher(message: string, type: TypeNotice = 'info'): void {
    this.annuler();
    this.sortant.set(false);
    this.etat.set({ message, type });
    this.armer(DUREES[type]);
  }

  /** Retrait immédiat d'une notice par l'utilisateur ; seul le porteur d'une erreur le propose. */
  masquer(): void {
    if (this.etat() === null) {
      return;
    }
    this.cacher();
  }

  /** Mise en pause du minuteur, pendant un survol ou un focus dans la notice. */
  suspendre(): void {
    if (this.minuteur === null || this.sortant()) {
      return;
    }
    this.reste = Math.max(0, this.echeance - Date.now());
    this.annuler();
  }

  /** Reprise du minuteur là où il s'est arrêté, pas d'une durée complète. */
  reprendre(): void {
    if (this.etat() === null || this.minuteur !== null || this.sortant()) {
      return;
    }
    this.echeance = Date.now() + this.reste;
    this.minuteur = setTimeout(() => this.cacher(), this.reste);
  }

  private armer(duree: number): void {
    this.reste = duree;
    this.echeance = Date.now() + duree;
    this.minuteur = setTimeout(() => this.cacher(), duree);
  }

  private cacher(): void {
    this.annuler();
    this.sortant.set(true);
    this.minuteur = setTimeout(() => {
      this.minuteur = null;
      this.etat.set(null);
      this.sortant.set(false);
    }, DUREE_SORTIE);
  }

  private annuler(): void {
    if (this.minuteur !== null) {
      clearTimeout(this.minuteur);
      this.minuteur = null;
    }
  }
}
