import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LignePanier, PanierService } from '../../core/services/panier.service';
import { TiroirPanierService } from '../../core/services/tiroir-panier.service';
import { formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';
import { messageRefusQuantite } from '../../core/utilitaires/panier-affichage';

/** Panier latéral (à droite) : résumé du panier local, sans logique métier propre. */
@Component({
  selector: 'app-panier-tiroir',
  imports: [RouterLink],
  templateUrl: './panier-tiroir.html',
  styleUrl: './panier-tiroir.scss',
})
export class PanierTiroir {
  private readonly panier = inject(PanierService);
  protected readonly tiroir = inject(TiroirPanierService);

  protected readonly lignes = this.panier.lignes;
  protected readonly total = this.panier.totalIndicatif;
  protected readonly nombre = computed(() => this.lignes().length);
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  private readonly boutonFermer = viewChild<ElementRef<HTMLButtonElement>>('boutonFermer');

  /**
   * Motif d'un refus du service, par récolte. Concerne le cas limite que le plafond du
   * bouton ne couvre pas (quantité fractionnaire, stock inférieur à un pas d'unité).
   */
  private readonly refus = signal<Record<number, string>>({});

  constructor() {
    // Le focus passe au bouton de fermeture à l'ouverture ; le défilement de la page est bloqué.
    effect(() => {
      const ouvert = this.tiroir.ouvert();
      document.body.style.overflow = ouvert ? 'hidden' : '';
      if (ouvert) {
        queueMicrotask(() => this.boutonFermer()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected surEchap(): void {
    this.tiroir.fermer();
  }

  /**
   * Un pas d'une unité. Au plafond du stock connu, le « + » est neutralisé en `aria-disabled`
   * — il reste atteignable au clavier et lit sa mention — donc un clic y reste sans effet.
   * Une valeur refusée par le service malgré tout est affichée sous la ligne, jamais en notice.
   * Une quantité nulle retire la ligne.
   */
  protected changer(ligne: LignePanier, pas: number): void {
    const quantite = Math.round((ligne.quantite + pas) * 100) / 100;
    if (quantite < 0.01) {
      this.retirer(ligne);
      return;
    }
    if (pas > 0 && this.stockAtteint(ligne)) {
      return;
    }
    if (this.panier.modifierQuantite(ligne.recolteId, quantite)) {
      this.oublierRefus(ligne.recolteId);
      return;
    }
    this.refus.update((refus) => ({ ...refus, [ligne.recolteId]: messageRefusQuantite(ligne) }));
  }

  protected retirer(ligne: LignePanier): void {
    this.panier.retirer(ligne.recolteId);
    this.oublierRefus(ligne.recolteId);
  }

  protected fermer(): void {
    this.tiroir.fermer();
  }

  /** Le stock connu de la ligne est atteint : rien de plus à ajouter, la mention l'annonce. */
  protected stockAtteint(ligne: LignePanier): boolean {
    return ligne.quantite >= ligne.quantiteDisponible;
  }

  protected motifRefus(ligne: LignePanier): string | null {
    return this.refus()[ligne.recolteId] ?? null;
  }

  /** Ce qui décrit le bouton d'ajout : d'abord le plafond, ensuite un refus du service. */
  protected descriptionAjout(ligne: LignePanier): string | null {
    if (this.stockAtteint(ligne)) {
      return `stock-max-${ligne.recolteId}`;
    }
    return this.motifRefus(ligne) === null ? null : `refus-${ligne.recolteId}`;
  }

  private oublierRefus(recolteId: number): void {
    this.refus.update((refus) => {
      if (refus[recolteId] === undefined) {
        return refus;
      }
      const reste = { ...refus };
      delete reste[recolteId];
      return reste;
    });
  }
}
