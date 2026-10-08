import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatistiquesProducteurResponse } from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_PERIODE_STATISTIQUE,
  LIBELLES_STATUT_COMMANDE,
  LIBELLES_STATUT_RECOLTE,
  PERIODES_STATISTIQUE,
  PERIODE_STATISTIQUE_PAR_DEFAUT,
  PeriodeStatistique,
  VARIANTES_BADGE_COMMANDE,
  StatutCommande,
  StatutRecolte,
} from '../../../core/modeles/referentiels';
import { StatistiquesService } from '../../../core/services/statistiques.service';
import { ToastService } from '../../../core/services/toast.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  formaterMontant,
  formaterQuantite,
} from '../../../core/utilitaires/formatage';
import { BarreStatistique, Barres } from '../../../partage/graphiques/barres';

/**
 * Statistiques de vente du producteur connecté — LOT STAT-1.
 *
 * Une seule source : `GET /api/producteurs/moi/statistiques?periode=…`. Le backend déduit le
 * producteur du jeton et n'accepte aucun identifiant en paramètre ; l'écran n'en envoie donc
 * jamais. Aucun montant n'est recalculé ici : les cartes, les barres et les listes rendent la
 * réponse telle quelle.
 *
 * Le chiffre d'affaires et le panier moyen sont **libellés « hors commandes annulées »** : c'est
 * ce que le service fait (les lignes `ANNULEE` sont exclues des sommes), mais les commandes
 * annulées restent comptées dans `nombreCommandes`, qui sert de dénominateur au taux
 * d'annulation. Les commandes `EN_ATTENTE` sont incluses dans le chiffre d'affaires — limite
 * connue, identique à celle du service Java.
 *
 * Une erreur de lecture est signalée par la notice du bas (§39.2), jamais par une bannière en
 * haut de l'écran : le contenu est vide tant que la requête n'a pas abouti, et « Réessayer »
 * reste disponible.
 */
@Component({
  selector: 'app-statistiques',
  imports: [RouterLink, Barres],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss',
})
export class Statistiques {
  private readonly statistiques = inject(StatistiquesService);
  private readonly toast = inject(ToastService);

  protected readonly periodes = PERIODES_STATISTIQUE;
  protected readonly periode = signal<PeriodeStatistique>(PERIODE_STATISTIQUE_PAR_DEFAUT);
  protected readonly donnees = signal<StatistiquesProducteurResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  /** Une entrée par jour civil de la période, sans trou : le graphique ne trie ni ne comble rien. */
  protected readonly ventes = computed<BarreStatistique[]>(() =>
    (this.donnees()?.ventesParJour ?? []).map((vente) => ({
      etiquette: this.jour(vente.date),
      valeur: vente.montant,
      valeurFormatee: formaterMontant(vente.montant),
    })),
  );

  /** Cinq récoltes au plus, revenu décroissant. La barre mesure le revenu, la lecture reste la
   * quantité vendue avec son unité — une quantité sans unité n'est pas une information. */
  protected readonly recoltes = computed<BarreStatistique[]>(() =>
    (this.donnees()?.topRecoltes ?? []).map((recolte) => ({
      etiquette: recolte.nom,
      valeur: recolte.revenu,
      valeurFormatee: `${formaterQuantite(recolte.quantiteVendue, recolte.unite)} — ${formaterMontant(recolte.revenu)}`,
    })),
  );

  protected readonly chargees = computed(
    () => this.donnees() !== null && !this.chargement() && this.erreur() === null,
  );

  /** Aucune commande et aucun stock à surveiller : l'écran n'a rien à montrer. */
  protected readonly vide = computed(() => {
    const donnees = this.donnees();
    return (
      this.chargees() &&
      donnees !== null &&
      donnees.nombreCommandes === 0 &&
      donnees.stockFaible.length === 0
    );
  });

  /** Toutes les journées sont à zéro : des barres toutes égales ne porteraient aucune information. */
  protected readonly sansVente = computed(
    () => this.chargees() && this.donnees()?.chiffreAffaires === 0,
  );

  protected readonly annonce = computed(() => {
    const donnees = this.donnees();
    if (donnees === null || this.chargement()) {
      return '';
    }
    const pluriel = donnees.nombreCommandes > 1 ? 's' : '';
    return (
      `Période : ${this.libellePeriode(this.periode())}. Chiffre d’affaires ` +
      `${formaterMontant(donnees.chiffreAffaires)} pour ${donnees.nombreCommandes} commande${pluriel}.`
    );
  });

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    // Une nouvelle lecture efface la notice de la lecture précédente.
    this.toast.masquer();

    this.statistiques.lister(this.periode()).subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        const message = messageErreurApi(
          erreur,
          'Impossible de charger vos statistiques de vente.',
        );
        this.donnees.set(null);
        this.erreur.set(message);
        this.chargement.set(false);
        this.toast.afficher(message, 'erreur');
      },
    });
  }

  /** Le changement de période relit le même endpoint avec un autre paramètre, jamais un calcul local. */
  protected choisirPeriode(periode: PeriodeStatistique): void {
    if (periode === this.periode() || this.chargement()) {
      return;
    }
    this.periode.set(periode);
    this.charger();
  }

  protected libellePeriode(periode: PeriodeStatistique): string {
    return LIBELLES_PERIODE_STATISTIQUE[periode];
  }

  protected libelleStatut(statut: StatutCommande): string {
    return LIBELLES_STATUT_COMMANDE[statut];
  }

  protected classesStatut(statut: StatutCommande): string {
    return `badge ${VARIANTES_BADGE_COMMANDE[statut]}`;
  }

  protected libelleStatutRecolte(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
  }

  /** Étiquette courte d'une journée : « 2026-10-08 » ne tient pas sous une colonne de 12 px. */
  private jour(date: string): string {
    const [, mois, jour] = date.split('-');
    return jour && mois ? `${jour}/${mois}` : date;
  }
}
