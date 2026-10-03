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
import {
  estLigneBloquee,
  messageLigneBloquee,
  messageRefusQuantite,
} from '../../core/utilitaires/panier-affichage';

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
  protected readonly messageLigneBloquee = messageLigneBloquee;

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
   * Un pas d'une unité. Le « + » est neutralisé en `aria-disabled` quand la ligne n'est plus
   * disponible ou quand le plafond du stock connu est atteint — il reste atteignable au clavier
   * et lit sa mention — donc un clic y reste sans effet. Le « − » et le retrait restent possibles
   * sur une ligne bloquée. Une valeur refusée par le service malgré tout est affichée sous la
   * ligne, jamais en notice. Une quantité nulle retire la ligne.
   */
  protected changer(ligne: LignePanier, pas: number): void {
    const quantite = Math.round((ligne.quantite + pas) * 100) / 100;
    if (quantite < 0.01) {
      this.retirer(ligne);
      return;
    }
    if (pas > 0 && this.ajoutNeutralise(ligne)) {
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

  /** Même règle que la page du panier : une récolte non disponible ne se pilote plus. */
  protected ligneBloquee(ligne: LignePanier): boolean {
    return estLigneBloquee(ligne);
  }

  protected motifRefus(ligne: LignePanier): string | null {
    return this.refus()[ligne.recolteId] ?? null;
  }

  /** Ce qui neutralise le « + » : le statut de la ligne prime, ensuite le plafond du stock connu. */
  protected ajoutNeutralise(ligne: LignePanier): boolean {
    return this.ligneBloquee(ligne) || this.stockAtteint(ligne);
  }

  /**
   * Ce qui décrit le bouton d'ajout : une seule mention à la fois, le statut bloqué primant sur
   * le plafond, puis le plafond sur un refus du service.
   */
  protected descriptionAjout(ligne: LignePanier): string | null {
    if (this.ligneBloquee(ligne)) {
      return `ligne-bloquee-${ligne.recolteId}`;
    }
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
