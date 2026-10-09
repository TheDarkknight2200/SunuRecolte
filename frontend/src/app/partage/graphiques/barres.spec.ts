import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarreStatistique, Barres } from './barres';

const TROIS_BARRRES: BarreStatistique[] = [
  { etiquette: 'Tomate', valeur: 6000, valeurFormatee: '6 000 FCFA' },
  { etiquette: 'Oignon', valeur: 3000, valeurFormatee: '3 000 FCFA' },
  { etiquette: 'Carotte', valeur: 1500, valeurFormatee: '1 500 FCFA' },
];

describe('Barres', () => {
  let fixture: ComponentFixture<Barres>;

  function configurer(series: readonly BarreStatistique[], orientation: 'horizontale' | 'verticale' = 'horizontale'): void {
    fixture = TestBed.createComponent(Barres);
    fixture.componentRef.setInput('titre', 'Récoltes les plus rémunératrices de la période');
    fixture.componentRef.setInput('enteteEtiquette', 'Récolte');
    fixture.componentRef.setInput('enteteValeur', 'Revenu');
    fixture.componentRef.setInput('orientation', orientation);
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Barres] });
  });

  function texte(element: Element | null): string {
    return (element?.textContent ?? '').trim();
  }

  it('nomme le graphique par son titre : le svg est une image désignée par un <title>', () => {
    configurer(TROIS_BARRRES);
    const svg = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('role')).toBe('img');
    const titre = svg.querySelector('title');
    expect(svg.getAttribute('aria-labelledby')).toBe(titre.getAttribute('id'));
    expect(texte(titre)).toBe('Récoltes les plus rémunératrices de la période');
  });

  it('expose chaque valeur dans un tableau alternatif, avec ses deux entêtes', () => {
    configurer(TROIS_BARRRES);
    const tableau = fixture.nativeElement.querySelector('table');
    const lignes = tableau.querySelectorAll('tbody tr');

    expect(texte(tableau.querySelector('caption'))).toBe(
      'Récoltes les plus rémunératrices de la période',
    );
    expect([...tableau.querySelectorAll('thead th')].map(texte)).toEqual(['Récolte', 'Revenu']);
    expect(lignes).toHaveLength(3);
    expect(texte(lignes[1].querySelector('th'))).toBe('Oignon');
    expect(texte(lignes[1].querySelector('td'))).toBe('3 000 FCFA');

    // Le voile qui masque le tableau est son parent, pas le tableau lui-même : une <table> ne peut
    // pas être plus étroite que son contenu, donc `width: 1px` posé sur la table laisse déborder
    // l'écran d'une barre de défilement horizontale à 375 px.
    expect(tableau.parentElement?.className).toBe('graphique-barres__alternative');
  });

  it('rend une barre horizontale et sa valeur formatée par série, sans interpréter le nombre', () => {
    configurer(TROIS_BARRRES);
    const lignes = fixture.nativeElement.querySelectorAll('.graphique-barres__ligne');
    const rects = fixture.nativeElement.querySelectorAll('rect');
    const valeurs = [...fixture.nativeElement.querySelectorAll('.graphique-barres__valeur')];

    expect(rects).toHaveLength(3);
    expect(valeurs.map(texte)).toEqual(['6 000 FCFA', '3 000 FCFA', '1 500 FCFA']);
    // La longueur est relative à la plus grande valeur : 100 %, 50 %, 25 % de la largeur.
    expect(rects[0].getAttribute('width')).toBe('100%');
    expect(rects[1].getAttribute('width')).toBe('50%');
    expect(rects[2].getAttribute('width')).toBe('25%');

    // L'association se lit dans la structure : libellé, valeur et barre appartiennent au même groupe.
    expect(lignes).toHaveLength(3);
    expect(texte(lignes[1].querySelector('.graphique-barres__etiquette'))).toBe('Oignon');
    expect(texte(lignes[1].querySelector('.graphique-barres__valeur'))).toBe('3 000 FCFA');
    expect(lignes[1].querySelector('.graphique-barres__barre')).toBe(rects[1]);
  });

  it('pose la barre sous son libellé, à nettement plus près de lui que de la ligne suivante', () => {
    configurer(TROIS_BARRRES);
    const lignes = fixture.nativeElement.querySelectorAll('.graphique-barres__ligne');

    expect(lignes[1].getAttribute('transform')).toBe('translate(0 52)');
    expect(lignes[2].getAttribute('transform')).toBe('translate(0 104)');
    expect(fixture.nativeElement.querySelector('svg').getAttribute('height')).toBe('156');

    // Le libellé et sa valeur partagent la même ligne de base, la barre vient après les deux.
    const premiere = lignes[0];
    const baseLabel = Number(premiere.querySelector('.graphique-barres__etiquette').getAttribute('y'));
    const baseValeur = Number(premiere.querySelector('.graphique-barres__valeur').getAttribute('y'));
    const hautBarre = Number(premiere.querySelector('rect').getAttribute('y'));
    const basBarre = hautBarre + Number(premiere.querySelector('rect').getAttribute('height'));
    expect(baseValeur).toBe(baseLabel);
    expect(hautBarre).toBeGreaterThan(baseLabel);

    // 7 px entre un libellé et sa barre, 35 px jusqu'au libellé de la ligne suivante : le
    // rattachement se voit de lui-même, sans avoir à compter les pixels sur l'écran.
    expect(hautBarre - baseLabel).toBe(7);
    expect(52 + baseLabel - basBarre).toBeGreaterThan(hautBarre - baseLabel);
  });

  it('en colonnes, rapporte la hauteur à la plus grande valeur et garde le sol', () => {
    configurer(TROIS_BARRRES, 'verticale');
    const rects = fixture.nativeElement.querySelectorAll('rect');

    expect(fixture.nativeElement.querySelector('line')).not.toBeNull();
    expect(rects[0].getAttribute('height')).toBe('110');
    expect(rects[0].getAttribute('y')).toBe('0');
    expect(rects[1].getAttribute('height')).toBe('55');
    expect(rects[1].getAttribute('y')).toBe('55');
    expect(rects[2].getAttribute('height')).toBe('28');
  });

  it('donne une infobulle à chaque colonne, avec la date et la valeur déjà formatée', () => {
    configurer(
      [
        { etiquette: '07/10', valeur: 6000, valeurFormatee: '6 000 FCFA' },
        { etiquette: '08/10', valeur: 3000, valeurFormatee: '3 000 FCFA' },
      ],
      'verticale',
    );
    const titres = [...fixture.nativeElement.querySelectorAll('.graphique-barres__barre title')];

    expect(titres.map(texte)).toEqual(['07/10 : 6 000 FCFA', '08/10 : 3 000 FCFA']);
  });

  it('annonce le maximum de l’axe des colonnes quand l’appelant fournit une légende', () => {
    fixture = TestBed.createComponent(Barres);
    fixture.componentRef.setInput('titre', 'Montant encaissé par jour');
    fixture.componentRef.setInput('enteteEtiquette', 'Jour');
    fixture.componentRef.setInput('enteteValeur', 'Montant');
    fixture.componentRef.setInput('orientation', 'verticale');
    fixture.componentRef.setInput('etiquetteMaximum', 'Maximum encaissé sur une journée');
    fixture.componentRef.setInput('series', [
      { etiquette: '07/10', valeur: 900, valeurFormatee: '900 FCFA' },
      { etiquette: '08/10', valeur: 1800, valeurFormatee: '1 800 FCFA' },
    ]);
    fixture.detectChanges();

    expect(texte(fixture.nativeElement.querySelector('.graphique-barres__repere'))).toBe(
      'Maximum encaissé sur une journée : 1 800 FCFA',
    );
  });

  it('rend le repère muet sans légende fournie, et absent quand toutes les valeurs sont nulles', () => {
    configurer(TROIS_BARRRES, 'verticale');
    expect(fixture.nativeElement.querySelector('.graphique-barres__repere')).toBeNull();

    configurer([{ etiquette: '08/10', valeur: 0, valeurFormatee: '0 FCFA' }], 'verticale');
    fixture.componentRef.setInput('etiquetteMaximum', 'Maximum encaissé sur une journée');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.graphique-barres__repere')).toBeNull();
  });

  it('ne divise jamais par zéro : une période sans vente produit des barres nulles', () => {
    configurer([
      { etiquette: '07/10', valeur: 0, valeurFormatee: '0 FCFA' },
      { etiquette: '08/10', valeur: 0, valeurFormatee: '0 FCFA' },
    ]);
    const rects = fixture.nativeElement.querySelectorAll('rect');

    expect(rects[0].getAttribute('width')).toBe('0%');
    expect(rects[1].getAttribute('width')).toBe('0%');
    expect(texte(fixture.nativeElement.querySelector('tbody td'))).toBe('0 FCFA');
  });

  it('n’affiche qu’une étiquette sur cinq, à distance suffisante de la borne finale', () => {
    const trenteJours = Array.from({ length: 30 }, (_, index) => ({
      etiquette: `${index + 1}`,
      valeur: index + 1,
      valeurFormatee: `${index + 1} FCFA`,
    }));
    configurer(trenteJours, 'verticale');

    const etiquettes = fixture.nativeElement.querySelectorAll('.graphique-barres__etiquette');
    expect(etiquettes).toHaveLength(6);
    expect([...etiquettes].map(texte)).toEqual(['1', '6', '11', '16', '21', '30']);
    expect(fixture.nativeElement.querySelectorAll('rect')).toHaveLength(30);
    // Trente lignes dans le tableau alternatif : toutes les valeurs restent lisibles autrement.
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(30);

    // Chaque étiquette est centrée sur sa colonne : le pourcentage rendu dit de quelle colonne il
    // s'agit. Aucun couple ne doit se trouver à moins d'un pas de cinq colonnes, sans quoi la
    // précédente empiète sur la date du jour — ce que la capture à 353 px a montré.
    const largeurColonne = 100 / trenteJours.length;
    const colonnes = [...etiquettes].map((etiquette) =>
      Math.round(Number.parseFloat(etiquette.getAttribute('x')) / largeurColonne - 0.5),
    );
    expect(colonnes).toEqual([0, 5, 10, 15, 20, 29]);
    const ecarts = colonnes.slice(1).map((colonne, index) => colonne - colonnes[index]);
    expect(Math.min(...ecarts)).toBeGreaterThanOrEqual(5);
  });

  it('garde la dernière date quand le pas tomberait juste avant elle', () => {
    // Douze colonnes, pas de deux : la borne finale étant à l'indice 11, l'indice 10 est écarté.
    configurer(
      Array.from({ length: 12 }, (_, index) => ({
        etiquette: `${index + 1}`,
        valeur: index + 1,
        valeurFormatee: `${index + 1} FCFA`,
      })),
      'verticale',
    );

    expect(
      [...fixture.nativeElement.querySelectorAll('.graphique-barres__etiquette')].map(texte),
    ).toEqual(['1', '3', '5', '7', '9', '12']);
  });

  it('ajoute une barre à une série vide sans géométrie invalide', () => {
    configurer([{ etiquette: 'Tomate', valeur: 450, valeurFormatee: '450 FCFA' }]);
    const rect = fixture.nativeElement.querySelector('rect');

    expect(rect.getAttribute('width')).toBe('100%');
    expect(rect.getAttribute('x')).toBe('0');
  });
});
