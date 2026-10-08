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
  });

  it('rend une barre horizontale et sa valeur formatée par série, sans interpréter le nombre', () => {
    configurer(TROIS_BARRRES);
    const rects = fixture.nativeElement.querySelectorAll('rect');
    const valeurs = [...fixture.nativeElement.querySelectorAll('.graphique-barres__valeur')];

    expect(rects).toHaveLength(3);
    expect(valeurs.map(texte)).toEqual(['6 000 FCFA', '3 000 FCFA', '1 500 FCFA']);
    // La longueur est relative à la plus grande valeur : 100 %, 50 %, 25 % de la trace.
    expect(rects[0].getAttribute('width')).toBe('46%');
    expect(rects[1].getAttribute('width')).toBe('23%');
    expect(rects[2].getAttribute('width')).toBe('11.5%');
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

  it('n’affiche qu’une étiquette sur cinq quand les colonnes sont trop serrées', () => {
    const trenteJours = Array.from({ length: 30 }, (_, index) => ({
      etiquette: `${index + 1}`,
      valeur: index + 1,
      valeurFormatee: `${index + 1} FCFA`,
    }));
    configurer(trenteJours, 'verticale');

    const etiquettes = fixture.nativeElement.querySelectorAll('.graphique-barres__etiquette');
    expect(etiquettes).toHaveLength(6);
    expect([...etiquettes].map(texte)).toEqual(['1', '6', '11', '16', '21', '26']);
    expect(fixture.nativeElement.querySelectorAll('rect')).toHaveLength(30);
    // Trente lignes dans le tableau alternatif : toutes les valeurs restent lisibles autrement.
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(30);
  });

  it('ajoute une barre à une série vide sans géométrie invalide', () => {
    configurer([{ etiquette: 'Tomate', valeur: 450, valeurFormatee: '450 FCFA' }]);
    const rect = fixture.nativeElement.querySelector('rect');

    expect(rect.getAttribute('width')).toBe('46%');
    expect(rect.getAttribute('x')).toBe('34%');
  });
});
