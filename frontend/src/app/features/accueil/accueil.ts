import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
import { PanierService } from '../../core/services/panier.service';
import { RecolteService } from '../../core/services/recolte.service';
import { ToastService } from '../../core/services/toast.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { formaterDate, formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';
import {
  QUANTITE_INITIALE,
  estAjoutPossible,
  messageRefusAjout,
} from '../../core/utilitaires/panier-affichage';

const PHOTO_HERO_DISTANTE =
  'https://images.unsplash.com/photo-1746014929708-fcb859fd3185?w=1400&q=85';

/** Page publique : présentation du projet et catalogue réel (GET /api/recoltes). */
@Component({
  selector: 'app-accueil',
  imports: [RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  private readonly recoltes = inject(RecolteService);
  private readonly auth = inject(AuthService);
  private readonly panier = inject(PanierService);
  private readonly toast = inject(ToastService);

  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly liste = signal<RecolteResponse[]>([]);

  /** Les quatre premières récoltes renvoyées par l'API : l'ordre du serveur est conservé. */
  protected readonly aLaUne = computed(() => this.liste().slice(0, 4));

  /** Photo du hero : fichier local d'abord, adresse d'origine si le fichier est absent. */
  protected readonly photoHero = signal('images/hero.jpg');
  private readonly photosEnErreur = signal<ReadonlySet<number>>(new Set());

  protected readonly connecte = computed(() => this.auth.session() !== null);

  /** Commodité d'usage réservée à un acheteur connecté ; le serveur reste l'autorité. */
  protected readonly acheteur = computed(() => this.auth.role() === 'ACHETEUR');

  // Les formats sont ceux de toute l'interface (core/utilitaires/formatage).
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;
  protected readonly formaterDate = formaterDate;

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.recoltes.lister().subscribe({
      next: (recoltes) => {
        this.liste.set(recoltes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, "Le catalogue n'a pas pu être chargé."));
        this.chargement.set(false);
      },
    });
  }

  protected libelleStatut(recolte: RecolteResponse): string {
    return LIBELLES_STATUT_RECOLTE[recolte.statut];
  }

  protected producteur(recolte: RecolteResponse): string {
    return recolte.localisationProducteur
      ? `${recolte.nomProducteur} — ${recolte.localisationProducteur}`
      : recolte.nomProducteur;
  }

  /** Ligne de disponibilité : une récolte peut n'avoir ni date ni lieu de retrait. */
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

  protected estDisponible(recolte: RecolteResponse): boolean {
    return estAjoutPossible(recolte);
  }

  /**
   * Ajout rapide : une unité, notice de succès **seulement** si `PanierService` a accepté
   * et a pu enregistrer le panier. Un refus (statut, stock, cumul) ou une écriture impossible
   * donne la notice d'erreur correspondante, jamais le message de succès (§39.2).
   */
  protected ajouter(recolte: RecolteResponse): void {
    if (!this.panier.ajouter(recolte, QUANTITE_INITIALE)) {
      this.toast.afficher(messageRefusAjout(recolte), 'erreur');
      return;
    }
    const echecStockage = this.panier.erreurStockage();
    if (echecStockage !== null) {
      this.toast.afficher(echecStockage, 'erreur');
      return;
    }
    this.toast.afficher(`${recolte.produit} ajouté au panier`, 'succes');
  }

  protected repliPhotoHero(): void {
    this.photoHero.set(PHOTO_HERO_DISTANTE);
  }

  /** Une photo de récolte qui ne charge pas (adresse invalide) laisse place au visuel neutre. */
  protected photoDe(recolte: RecolteResponse): string | null {
    return recolte.imageUrl && !this.photosEnErreur().has(recolte.id) ? recolte.imageUrl : null;
  }

  protected photoEnErreur(recolte: RecolteResponse): void {
    this.photosEnErreur.update((ensemble) => new Set(ensemble).add(recolte.id));
  }
}
