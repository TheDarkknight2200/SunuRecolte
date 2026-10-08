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
const PAS_LIGNE = 34;
const HAUTEUR_TRACE = 110;
const HAUTEUR_AXE = 20;
const DECALAGE_TRACE = 18;
const EPAISSEUR_BARRE = 10;

/** Parts de largeur (en pourcentage) d'une barre horizontale : l'étiquette, le tracé, la valeur. */
const PART_ETIQUETTE = 34;
const PART_BARRE = 46;

/** Un identifiant par instance : `aria-labelledby` doit désigner le bon `<title>`. */
let compteurInstances = 0;

/**
 * Barres en SVG, sans bibliothèque de graphique (lot STAT-1).
 *
 * Un seul composant pour les deux rendus demandés : colonnes verticales (ventes par jour) et
 * barres horizontales (top récoltes). Il n'interprète rien : l'écran appelant fournit les valeurs
 * déjà formatées, et le graphique ne fait que les reporter en longueurs relatives à la plus
 * grande d'entre elles.
 *
 * Accessibilité : le `<svg>` porte `role="img"` et un `<title>` qui dit ce qu'il montre, les
 * chiffres eux-mêmes sont dans un tableau alternatif présent en permanence dans le DOM — une
 * barre ne porte jamais l'information seule.
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

  protected readonly identifiant = `barres-${(compteurInstances += 1)}`;
  protected readonly epaisseur = EPAISSEUR_BARRE;
  protected readonly debutBarre = `${PART_ETIQUETTE}%`;
  protected readonly sol = HAUTEUR_TRACE;
  protected readonly ligneBase = HAUTEUR_TRACE + HAUTEUR_AXE - 6;

  protected readonly verticale = computed(() => this.orientation() === 'verticale');

  protected readonly max = computed(() =>
    this.series().reduce((plus, barre) => Math.max(plus, barre.valeur), 0),
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
    return index % this.pasEtiquettes() === 0;
  }

  protected yEtiquette(index: number): number {
    return index * PAS_LIGNE + 12;
  }

  protected yBarre(index: number): number {
    return index * PAS_LIGNE + DECALAGE_TRACE;
  }

  protected longueur(barre: BarreStatistique): string {
    return `${(this.pourcentage(barre.valeur) * PART_BARRE) / 100}%`;
  }
}
