import { Component, ElementRef, HostListener, computed, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LignePanier, PanierService } from '../../core/services/panier.service';
import { TiroirPanierService } from '../../core/services/tiroir-panier.service';
import { formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';

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

  /** Un pas d'une unité ; une valeur refusée (stock) est ignorée, une quantité nulle retire la ligne. */
  protected changer(ligne: LignePanier, pas: number): void {
    const quantite = Math.round((ligne.quantite + pas) * 100) / 100;
    if (quantite < 0.01) {
      this.panier.retirer(ligne.recolteId);
      return;
    }
    this.panier.modifierQuantite(ligne.recolteId, quantite);
  }

  protected retirer(ligne: LignePanier): void {
    this.panier.retirer(ligne.recolteId);
  }

  protected fermer(): void {
    this.tiroir.fermer();
  }
}
