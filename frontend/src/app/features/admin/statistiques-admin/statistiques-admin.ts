import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatistiquesAdminResponse } from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_FILIERE,
  LIBELLES_MOYEN_PAIEMENT,
  LIBELLES_PERIODE_STATISTIQUE,
  PERIODES_STATISTIQUE,
  PERIODE_STATISTIQUE_PAR_DEFAUT,
  Filiere,
  MoyenPaiement,
  PeriodeStatistique,
} from '../../../core/modeles/referentiels';
import { StatistiquesAdminService } from '../../../core/services/statistiques-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { formaterMontantEntier, formaterQuantite } from '../../../core/utilitaires/formatage';
import { AdminNavigation } from '../../../partage/admin-navigation/admin-navigation';
import { BarreStatistique, Barres } from '../../../partage/graphiques/barres';

/**
 * Statistiques de la plateforme vues de l'administration — LOT STAT-2.
 *
 * Une seule source : `GET /api/admin/statistiques?periode=…`. La route est réservée à ADMIN par
 * `roleGuard` ici, et vérifiée une seconde fois sur le jeton par le backend : l'écran n'envoie
 * aucun identifiant, aucun filtre, aucun rôle. Aucun chiffre n'est recalculé ici — les cartes,
 * les barres et les listes rendent la réponse telle quelle.
 *
 * Deux précisions portées à l'écran parce qu'elles ne se devinent pas au chiffre :
 * le **volume d'affaires** est calculé hors commandes annulées alors que le **nombre de
 * commandes** les comprend toutes ; et le total des **comptes** est producteurs + acheteurs,
 * les administrateurs en étant exclus — ils ne viennent pas de l'inscription publique.
 *
 * Les zones sont une limite affichée, pas un référentiel : `localisation_exploitation` est un
 * texte libre saisi par chaque producteur. Le backend regroupe les grafies d'une même localité,
 * garde huit zones au plus et réunit le reste sous « Autres zones » ; l'écran le dit tel quel.
 *
 * Une erreur de lecture est signalée par la notice du bas (§39.2), jamais par une bannière en
 * haut de l'écran : le contenu est vide tant que la requête n'a pas abouti, et « Réessayer »
 * reste disponible.
 */
@Component({
  selector: 'app-statistiques-admin',
  imports: [RouterLink, Barres, AdminNavigation],
  templateUrl: './statistiques-admin.html',
  styleUrl: './statistiques-admin.scss',
})
export class StatistiquesAdmin {
  private readonly statistiques = inject(StatistiquesAdminService);
  private readonly toast = inject(ToastService);

  protected readonly periodes = PERIODES_STATISTIQUE;
  protected readonly periode = signal<PeriodeStatistique>(PERIODE_STATISTIQUE_PAR_DEFAUT);
  protected readonly donnees = signal<StatistiquesAdminResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Un écran de synthèse lit des entiers : les montants sont arrondis à l'affichage, jamais en base. */
  protected readonly formaterMontantEntier = formaterMontantEntier;

  /** Une semaine civile par entrée, sans trou : le graphique ne trie ni ne comble rien. */
  protected readonly inscriptions = computed<BarreStatistique[]>(() =>
    (this.donnees()?.inscriptionsParSemaine ?? []).map((semaine) => {
      const total = semaine.producteurs + semaine.acheteurs;
      return {
        etiquette: this.jour(semaine.semaineDebut),
        valeur: total,
        valeurFormatee:
          `${total} compte${total > 1 ? 's' : ''} — ` +
          `${semaine.producteurs} producteur${semaine.producteurs > 1 ? 's' : ''}, ` +
          `${semaine.acheteurs} acheteur${semaine.acheteurs > 1 ? 's' : ''}`,
      };
    }),
  );

  /** Cinq producteurs au plus, volume apporté décroissant. */
  protected readonly producteurs = computed<BarreStatistique[]>(() =>
    (this.donnees()?.topProducteurs ?? []).map((ligne) => ({
      etiquette: ligne.nom,
      valeur: ligne.chiffreAffaires,
      valeurFormatee:
        `${formaterMontantEntier(ligne.chiffreAffaires)} — ` +
        `${ligne.nombreCommandes} commande${ligne.nombreCommandes > 1 ? 's' : ''}`,
    })),
  );

  /** Cinq récoltes au plus, toute la plateforme, revenu décroissant. La barre mesure le revenu,
   * la lecture reste la quantité vendue avec son unité — une quantité sans unité n'est pas une information. */
  protected readonly recoltes = computed<BarreStatistique[]>(() =>
    (this.donnees()?.topRecoltes ?? []).map((ligne) => ({
      etiquette: ligne.nom,
      valeur: ligne.revenu,
      valeurFormatee:
        `${formaterQuantite(ligne.quantiteVendue, ligne.unite)} — ` +
        `${formaterMontantEntier(ligne.revenu)}`,
    })),
  );

  protected readonly chargees = computed(
    () => this.donnees() !== null && !this.chargement() && this.erreur() === null,
  );

  /** Plateforme encore vide : aucun compte inscrit, aucune récolte, aucune commande. */
  protected readonly vide = computed(() => {
    const donnees = this.donnees();
    return (
      this.chargees() &&
      donnees !== null &&
      donnees.utilisateursTotal === 0 &&
      donnees.recoltesActives === 0 &&
      donnees.commandesPeriode === 0
    );
  });

  protected readonly annonce = computed(() => {
    const donnees = this.donnees();
    if (donnees === null || this.chargement()) {
      return '';
    }
    const pluriel = donnees.commandesPeriode > 1 ? 's' : '';
    return (
      `Période : ${this.libellePeriode(this.periode())}. Volume d’affaires ` +
      `${formaterMontantEntier(donnees.volumeAffaires)} pour ${donnees.commandesPeriode} ` +
      `commande${pluriel}.`
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
          'Impossible de charger les statistiques de la plateforme.',
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

  /**
   * Filière rendue par son nom d'enum Java. Une valeur inconnue s'affiche telle quelle :
   * l'écran n'a pas vocation à masquer une valeur que le backend aurait ouverte.
   */
  protected libelleFiliere(nom: string): string {
    return LIBELLES_FILIERE[nom as Filiere] ?? nom;
  }

  protected libelleMoyen(moyen: MoyenPaiement): string {
    return LIBELLES_MOYEN_PAIEMENT[moyen];
  }

  /** Étiquette courte d'un lundi : « 2026-10-05 » ne tient pas sous une colonne de 12 px. */
  private jour(date: string): string {
    const [, mois, jour] = date.split('-');
    return jour && mois ? `${jour}/${mois}` : date;
  }
}
