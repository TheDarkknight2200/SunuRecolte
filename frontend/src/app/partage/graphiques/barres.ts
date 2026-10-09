import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Une barre : ce qu'on lit dans le graphique, plus ce qu'on lit dans le tableau alternatif. */
export interface BarreStatistique {
  readonly etiquette: string;
  readonly valeur: number;
  /** Valeur déjà formatée pour l'affichage : le graphique ne décide ni la devise ni l'unité. */
  readonly valeurFormatee: string;
}

/* Géométrie en pixels. Le SVG n'a pas de `viewBox` : une unité vaut un pixel, le texte garde sa
   taille réelle et rien ne se déforme quand l'utilisateur agrandit la police du navigateur. */
const PAS_LIGNE = 52;
const HAUTEUR_TRACE = 110;
const HAUTEUR_AXE = 20;
const EPAISSEUR_BARRE = 10;

/** Une ligne horizontale : le texte (libellé et valeur) sur sa ligne de base, la barre juste après. */
const BASE_ETIQUETTE = 11;
const HAUT_BARRE = 18;

/** Un identifiant par instance : `aria-labelledby` doit désigner le bon `<title>`. */
let compteurInstances = 0;

/**
 * Barres en SVG, sans bibliothèque de graphique (lot STAT-1).
 *
 * Un seul composant pour les deux rendus demandés : colonnes verticales (ventes par jour) et
 * barres horizontales (top récoltes). Il n'interprète rien : l'écran appelant fournit les valeurs
 * déjà formatées, et le graphique ne fait que les reporter en longueurs relatives à la plus
 * grande d'entre elles, tracée sur toute la largeur.
 *
 * Une ligne horizontale est un seul groupe : libellé à gauche et valeur à droite sur la même ligne
 * de base, barre pleine largeur juste en dessous. L'écart entre deux groupes doit rester
 * nettement plus grand que l'écart entre le libellé et sa barre, sinon le lecteur ne sait plus
 * quelle barre appartient à quelle ligne.
 *
 * Accessibilité : le `<svg>` porte `role="img"` et un `<title>` qui dit ce qu'il montre, les
 * chiffres eux-mêmes sont dans un tableau alternatif présent en permanence dans le DOM — une
 * barre ne porte jamais l'information seule. En colonnes, chaque barre porte aussi un `<title>`
 * pour l'infobulle native ; ce titre reste un confort visuel, `role="img"` tenant le contenu du
 * SVG hors de l'arbre consulté par un lecteur d'écran — le tableau demeure la voie machine.
 *
 * Le lot administration doit le réutiliser : aucune couleur en dur, tout vient des tokens, et
 * aucun texte de métier n'est écrit ici.
 */
@Component({
  selector: 'app-barres',
  imports: [],
  templateUrl: './barres.html',
  styleUrl: './barres.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Barres {
  readonly orientation = input<'horizontale' | 'verticale'>('horizontale');
  readonly titre = input.required<string>();
  readonly enteteEtiquette = input.required<string>();
  readonly enteteValeur = input.required<string>();
  readonly series = input.required<readonly BarreStatistique[]>();

  /**
   * Légende du repère de valeur maximal, affichée au-dessus des colonnes. `null` (par défaut) le
   * retire : un appelant qui n'a rien à promettre sur l'échelle ne montre rien. Le texte vient de
   * l'écran appelant — le graphique n'écrit aucun mot de métier.
   */
  readonly etiquetteMaximum = input<string | null>(null);

  protected readonly identifiant = `barres-${(compteurInstances += 1)}`;
  protected readonly epaisseur = EPAISSEUR_BARRE;
  protected readonly baseEtiquette = BASE_ETIQUETTE;
  protected readonly hautBarre = HAUT_BARRE;
  protected readonly sol = HAUTEUR_TRACE;
  protected readonly ligneBase = HAUTEUR_TRACE + HAUTEUR_AXE - 6;

  protected readonly verticale = computed(() => this.orientation() === 'verticale');

  protected readonly max = computed(() =>
    this.series().reduce((plus, barre) => Math.max(plus, barre.valeur), 0),
  );

  /** Le repère rend la valeur déjà formatée de la plus haute barre : rien n'est recalculé ici. */
  protected readonly valeurMaxFormatee = computed(() => {
    const laPlusHaute = this.series().find((barre) => barre.valeur === this.max());
    return laPlusHaute?.valeurFormatee ?? '';
  });

  protected readonly repereVisible = computed(
    () => this.verticale() && this.etiquetteMaximum() !== null && this.max() > 0,
  );

  protected readonly hauteurSvg = computed(() =>
    this.verticale() ? HAUTEUR_TRACE + HAUTEUR_AXE : this.series().length * PAS_LIGNE,
  );

  /** Largeur d'une colonne, en pourcentage de la place disponible. */
  protected readonly pasColonnes = computed(() =>
    this.series().length === 0 ? 100 : 100 / this.series().length,
  );

  /** Une étiquette sur N : les trente colonnes d'un mois ne peuvent pas toutes se lire. */
  protected readonly pasEtiquettes = computed(() =>
    Math.max(1, Math.ceil(this.series().length / 6)),
  );

  protected pourcentage(valeur: number): number {
    // Une valeur nulle ne divise pas par zéro, et la plus grande barre occupe toute la trace.
    return this.max() <= 0 ? 0 : (valeur / this.max()) * 100;
  }

  protected xColonne(index: number): string {
    const pas = this.pasColonnes();
    return `${pas * index + pas * 0.15}%`;
  }

  protected largeurColonne(): string {
    return `${this.pasColonnes() * 0.7}%`;
  }

  protected hauteurColonne(barre: BarreStatistique): number {
    return this.max() <= 0 ? 0 : Math.round((barre.valeur / this.max()) * HAUTEUR_TRACE);
  }

  protected yColonne(barre: BarreStatistique): number {
    return HAUTEUR_TRACE - this.hauteurColonne(barre);
  }

  protected xEtiquette(index: number): string {
    const pas = this.pasColonnes();
    return `${pas * index + pas * 0.5}%`;
  }

  protected etiquetteColonne(index: number): boolean {
    const derniere = this.series().length - 1;
    // Les deux bornes de la période se lisent toujours, même quand les colonnes sont trop serrées.
    return index === 0 || index === derniere || index % this.pasEtiquettes() === 0;
  }

  /** Une ligne horizontale = un groupe translaté : tout ce qu'elle contient suit le même pas. */
  protected transformLigne(index: number): string {
    return `translate(0 ${index * PAS_LIGNE})`;
  }

  /** La plus grande valeur occupe toute la largeur : la barre n'est plus partagée avec le texte. */
  protected longueur(barre: BarreStatistique): string {
    return `${this.pourcentage(barre.valeur)}%`;
  }
}
