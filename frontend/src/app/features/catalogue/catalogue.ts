import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FILIERES,
  Filiere,
  LIBELLES_FILIERE,
  LIBELLES_STATUT_RECOLTE,
  STATUTS_RECOLTE,
  StatutRecolte,
} from '../../core/modeles/referentiels';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { AuthService } from '../../core/services/auth.service';
import { PanierService } from '../../core/services/panier.service';
import { CriteresRechercheRecolte, RecolteService } from '../../core/services/recolte.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { formaterDate, formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';
import {
  QUANTITE_INITIALE,
  estAjoutPossible,
  messageRefusAjout,
  quantiteAjoutee,
} from '../../core/utilitaires/panier-affichage';

/**
 * Catalogue public (GET /api/recoltes) : consultable sans être connecté.
 * Les filtres sont exactement ceux que le backend accepte — statut, filière,
 * recherche sur le nom du produit — et l'ordre renvoyé par l'API est conservé.
 *
 * L'ajout au panier est une commodité réservée à un acheteur connecté : le rôle
 * lu ici vient de la session locale et ne constitue aucune autorisation.
 */
@Component({
  selector: 'app-catalogue',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly recoltes = inject(RecolteService);
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);

  protected readonly formulaire = this.fb.group({
    recherche: [''],
    statut: [''],
    filiere: [''],
  });

  protected readonly statuts: readonly StatutRecolte[] = STATUTS_RECOLTE;
  protected readonly filieres: readonly Filiere[] = FILIERES;

  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly liste = signal<RecolteResponse[]>([]);
  protected readonly criteresActifs = signal(false);

  /** Réglage d'usage, pas une règle de sécurité : le catalogue reste public. */
  protected readonly acheteur = computed(() => this.auth.role() === 'ACHETEUR');
  protected readonly succesPanier = signal<string | null>(null);
  protected readonly refusPanier = signal<string | null>(null);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  constructor() {
    this.charger();
  }

  protected charger(): void {
    const criteres = this.formulaire.getRawValue();
    const recherche = criteres.recherche.trim();
    this.criteresActifs.set(recherche !== '' || criteres.statut !== '' || criteres.filiere !== '');

    const filtres: CriteresRechercheRecolte = {
      recherche: recherche === '' ? undefined : recherche,
      statut: criteres.statut === '' ? undefined : (criteres.statut as StatutRecolte),
      filiere: criteres.filiere === '' ? undefined : (criteres.filiere as Filiere),
    };

    this.succesPanier.set(null);
    this.refusPanier.set(null);
    this.chargement.set(true);
    this.erreur.set(null);
    this.recoltes.lister(filtres).subscribe({
      next: (recoltes) => {
        this.liste.set(recoltes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.liste.set([]);
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger les récoltes.'));
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected reinitialiser(): void {
    this.formulaire.reset({ recherche: '', statut: '', filiere: '' });
    this.charger();
  }

  protected libelleStatut(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
  }

  protected libelleFiliere(filiere: Filiere): string {
    return LIBELLES_FILIERE[filiere];
  }

  protected producteur(recolte: RecolteResponse): string {
    return recolte.localisationProducteur
      ? `${recolte.nomProducteur} — ${recolte.localisationProducteur}`
      : recolte.nomProducteur;
  }

  protected meta(recolte: RecolteResponse): string | null {
    const date = recolte.dateDisponibilite
      ? `Disponible à partir du ${formaterDate(recolte.dateDisponibilite)}`
      : null;
    const lieu = recolte.localisation;
    if (date && lieu) {
      return `${date} — ${lieu}`;
    }
    return date ?? lieu;
  }

  protected denombrement(): string {
    const total = this.liste().length;
    return total === 1 ? '1 récolte affichée' : `${total} récoltes affichées`;
  }

  protected lien(recolte: RecolteResponse): string[] {
    return ['/recoltes', String(recolte.id)];
  }

  protected estAjoutPossible(recolte: RecolteResponse): boolean {
    return estAjoutPossible(recolte);
  }

  protected quantiteAjoutee(recolte: RecolteResponse): string {
    return quantiteAjoutee(recolte);
  }

  protected messageRefusAjout(recolte: RecolteResponse): string {
    return messageRefusAjout(recolte);
  }

  /**
   * Le composant ne fait que transmettre la récolte et la quantité initiale :
   * fusion, plafond du stock connu et persistance appartiennent à `PanierService`.
   */
  protected ajouterAuPanier(recolte: RecolteResponse): void {
    if (this.panier.ajouter(recolte, QUANTITE_INITIALE)) {
      this.refusPanier.set(null);
      this.succesPanier.set(
        `Récolte ajoutée au panier : ${recolte.produit} (${quantiteAjoutee(recolte)}).`,
      );
      return;
    }
    this.succesPanier.set(null);
    this.refusPanier.set(messageRefusAjout(recolte));
  }
}
