import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE, StatutRecolte } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
import { PanierService } from '../../core/services/panier.service';
import { RecolteService } from '../../core/services/recolte.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { formaterDate, formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';
import {
  QUANTITE_INITIALE,
  estAjoutPossible,
  messageRefusAjout,
  quantiteAjoutee,
} from '../../core/utilitaires/panier-affichage';

/**
 * Fiche publique d'une récolte (GET /api/recoltes/{id}).
 * Un identifiant inconnu ou mal formé est présenté comme « introuvable » (404),
 * jamais comme une erreur serveur.
 */
@Component({
  selector: 'app-detail-recolte',
  imports: [RouterLink],
  templateUrl: './detail-recolte.html',
  styleUrl: './detail-recolte.scss',
})
export class DetailRecolte {
  private readonly route = inject(ActivatedRoute);
  private readonly recoltes = inject(RecolteService);
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);

  protected readonly recolte = signal<RecolteResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly introuvable = signal(false);
  protected readonly imageCassee = signal(false);

  /** Réglage d'usage : la fiche reste consultable par tout le monde. */
  protected readonly acheteur = computed(() => this.auth.role() === 'ACHETEUR');
  protected readonly succesPanier = signal<string | null>(null);
  protected readonly refusPanier = signal<string | null>(null);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;
  protected readonly formaterDate = formaterDate;

  private identifiant: number | null = null;

  constructor() {
    // paramMap plutôt que snapshot : le composant est réutilisé d'une récolte à l'autre.
    this.route.paramMap.subscribe((parametres) => {
      const id = Number(parametres.get('id'));
      this.identifiant = Number.isInteger(id) && id > 0 ? id : null;
      this.charger();
    });
  }

  protected charger(): void {
    const id = this.identifiant;
    if (id === null) {
      this.recolte.set(null);
      this.erreur.set(null);
      this.introuvable.set(true);
      this.chargement.set(false);
      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);
    this.introuvable.set(false);
    this.recolte.set(null);
    this.imageCassee.set(false);
    this.succesPanier.set(null);
    this.refusPanier.set(null);

    this.recoltes.findById(id).subscribe({
      next: (recolte) => {
        this.recolte.set(recolte);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.introuvable.set(true);
          return;
        }
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger cette récolte.'));
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected libelleStatut(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
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

  /** La récolte est transmise telle quelle au service : aucune règle métier ici. */
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
