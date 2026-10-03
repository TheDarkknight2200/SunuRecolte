import { DOCUMENT } from '@angular/common';
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
import { LIBELLES_STATUT_RECOLTE, StatutRecolte } from '../../../core/modeles/referentiels';
import { LignePanier, PanierService } from '../../../core/services/panier.service';
import { ToastService } from '../../../core/services/toast.service';
import { formaterMontant, formaterQuantite } from '../../../core/utilitaires/formatage';
import {
  estLigneBloquee,
  messageLigneBloquee,
  messageRefusQuantite,
} from '../../../core/utilitaires/panier-affichage';

/** Écart des boutons d'incrémentation : une unité du produit, jamais d'arrondi implicite. */
const PAS = 1;

/**
 * Panier local de l'acheteur (FRONTEND_DESIGN.md §25 et §32).
 *
 * Source unique : `PanierService`. La page ne lit jamais `localStorage`, ne connaît
 * aucune règle de fusion et ne valide aucune quantité : elle analyse la saisie,
 * délègue au service, et affiche ce que le service refuse. Les prix, quantités
 * disponibles et montants sont des snapshots locaux : le total réel d'une commande
 * est recalculé par le serveur.
 */
@Component({
  selector: 'app-panier',
  imports: [RouterLink],
  templateUrl: './panier.html',
  styleUrl: './panier.scss',
})
export class Panier {
  private readonly panier = inject(PanierService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  protected readonly lignes = this.panier.lignes;
  protected readonly totalIndicatif = this.panier.totalIndicatif;
  protected readonly erreurStockage = this.panier.erreurStockage;

  /** Refus du service pour la dernière saisie : aucune quantité n'a été modifiée. */
  protected readonly refus = signal<string | null>(null);
  protected readonly confirmationVider = signal(false);

  /** Valeur saisie et non encore soumise au service, par récolte. */
  private readonly brouillons = signal<Record<number, string>>({});

  protected readonly estVide = computed(() => this.lignes().length === 0);

  private readonly boutonAnnuler = viewChild('boutonAnnuler', { read: ElementRef });
  private readonly modale = viewChild('modale', { read: ElementRef });
  private readonly lienCatalogue = viewChild('lienCatalogue', { read: ElementRef });

  /** Déclencheur de la modale, pour lui rendre le focus à la fermeture. */
  private declencheurVider: HTMLElement | null = null;

  /** Le lien du catalogue n'existe qu'une fois le panier vidé : le focus attend son rendu. */
  private readonly focusApresVidage = signal(false);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  constructor() {
    // viewChild est un signal : l'effet se rejoue quand la modale est réellement rendue.
    effect(() => {
      const bouton = this.boutonAnnuler();
      if (this.confirmationVider() && bouton !== undefined) {
        bouton.nativeElement.focus();
      }
    });

    effect(() => {
      const lien = this.lienCatalogue();
      if (this.focusApresVidage() && lien !== undefined) {
        lien.nativeElement.focus();
        this.focusApresVidage.set(false);
      }
    });
  }

  protected champId(ligne: LignePanier): string {
    return `quantite-${ligne.recolteId}`;
  }

  protected aideId(ligne: LignePanier): string {
    return `quantite-aide-${ligne.recolteId}`;
  }

  protected libelleStatut(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
  }

  protected denombrement(): string {
    const total = this.lignes().length;
    return total === 1 ? '1 récolte' : `${total} récoltes`;
  }

  /**
   * Une ligne reste indicatrice de son snapshot : jamais masquée ni retirée
   * automatiquement (§25). Le texte dit ce que l'acheteur peut faire.
   */
  protected motifLigne(ligne: LignePanier): string | null {
    if (estLigneBloquee(ligne)) {
      return messageLigneBloquee();
    }
    if (ligne.quantite >= ligne.quantiteDisponible) {
      return 'Le panier contient déjà la totalité du stock connu.';
    }
    return null;
  }

  /** Une récolte épuisée n'a plus de quantité à saisir : le retrait reste possible. */
  protected estBloquee(ligne: LignePanier): boolean {
    return estLigneBloquee(ligne);
  }

  protected sousTotal(ligne: LignePanier): number {
    return ligne.quantite * ligne.prixUnitaire;
  }

  protected valeurAffichee(ligne: LignePanier): string {
    return this.brouillons()[ligne.recolteId] ?? String(ligne.quantite);
  }

  protected memoriserSaisie(ligne: LignePanier, evenement: Event): void {
    const valeur = (evenement.target as HTMLInputElement).value;
    this.brouillons.update((brouillons) => ({ ...brouillons, [ligne.recolteId]: valeur }));
  }

  /**
   * La saisie est convertie puis présentée au service, qui est seul à décider.
   * Le brouillon est effacé dans tous les cas : un refus fait revenir le champ à
   * la quantité réellement enregistrée, sans troncature silencieuse.
   */
  protected appliquerSaisie(ligne: LignePanier, evenement: Event): void {
    const valeur = (evenement.target as HTMLInputElement).value;
    this.oublierBrouillon(ligne.recolteId);

    const quantite = Number(valeur.replace(',', '.'));
    if (valeur === '' || !Number.isFinite(quantite)) {
      const message = `Quantité invalide pour « ${ligne.produit} » : saisissez un nombre strictement positif.`;
      this.refus.set(message);
      this.toast.afficher(message, 'erreur');
      return;
    }
    this.deposerQuantite(ligne, quantite);
  }

  protected augmenter(ligne: LignePanier): void {
    this.oublierBrouillon(ligne.recolteId);
    this.deposerQuantite(ligne, ligne.quantite + PAS);
  }

  protected diminuer(ligne: LignePanier): void {
    this.oublierBrouillon(ligne.recolteId);
    this.deposerQuantite(ligne, ligne.quantite - PAS);
  }

  private deposerQuantite(ligne: LignePanier, quantite: number): void {
    if (this.panier.modifierQuantite(ligne.recolteId, quantite)) {
      this.refus.set(null);
      // Parité avec l'ancienne bannière : la mention du maximum s'efface dès que la saisie passe.
      this.toast.masquer();
      return;
    }
    const motif = messageRefusQuantite(ligne);
    this.refus.set(motif);
    this.toast.afficher(motif, 'erreur');
  }

  protected retirer(ligne: LignePanier): void {
    this.panier.retirer(ligne.recolteId);
    this.oublierBrouillon(ligne.recolteId);
    this.refus.set(null);
    this.toast.masquer();
  }

  protected demanderVider(evenement: MouseEvent): void {
    this.declencheurVider = evenement.currentTarget as HTMLElement;
    this.confirmationVider.set(true);
  }

  protected annulerVider(): void {
    this.confirmationVider.set(false);
    this.rendreLeFocus();
  }

  protected confirmerVider(): void {
    this.panier.vider();
    this.confirmationVider.set(false);
    this.refus.set(null);
    this.toast.masquer();
    this.brouillons.set({});
    // Le bouton déclencheur disparaît avec les lignes : le focus passera au lien du catalogue.
    this.declencheurVider = null;
    this.focusApresVidage.set(true);
  }

  /**
   * Escape écouté sur le document : la modale se ferme même si le focus a quitté
   * son sous-arbre.
   */
  @HostListener('document:keydown.escape')
  protected fermerParEscape(): void {
    if (this.confirmationVider()) {
      this.annulerVider();
    }
  }

  /**
   * Piège de focus sur Tab et Shift+Tab : les deux événements sont interceptés,
   * « keydown.tab » ne couvrant pas Shift+Tab.
   */
  @HostListener('document:keydown.tab', ['$event'])
  @HostListener('document:keydown.shift.tab', ['$event'])
  protected piegerLeFocus(evenement: Event): void {
    const modale = this.modale()?.nativeElement;
    if (modale === undefined) {
      return;
    }
    const focusables = this.focusablesDe(modale);
    if (focusables.length === 0) {
      return;
    }

    evenement.preventDefault();
    const { shiftKey } = evenement as KeyboardEvent;
    const actif = this.document.activeElement as HTMLElement | null;
    const index = actif === null ? -1 : focusables.indexOf(actif);
    const cible = shiftKey
      ? index <= 0
        ? focusables[focusables.length - 1]
        : focusables[index - 1]
      : index === -1 || index === focusables.length - 1
        ? focusables[0]
        : focusables[index + 1];
    cible.focus();
  }

  private focusablesDe(modale: HTMLElement): HTMLElement[] {
    return Array.from(
      modale.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea',
      ),
    );
  }

  private oublierBrouillon(recolteId: number): void {
    this.brouillons.update((brouillons) => {
      const reste = { ...brouillons };
      delete reste[recolteId];
      return reste;
    });
  }

  private rendreLeFocus(): void {
    const bouton = this.declencheurVider;
    this.declencheurVider = null;
    if (bouton !== null && bouton.isConnected) {
      bouton.focus();
    }
  }
}
