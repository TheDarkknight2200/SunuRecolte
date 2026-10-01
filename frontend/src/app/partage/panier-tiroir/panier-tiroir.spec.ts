import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { CLE_PANIER, LignePanier, PanierService } from '../../core/services/panier.service';
import { TiroirPanierService } from '../../core/services/tiroir-panier.service';
import { PanierTiroir } from './panier-tiroir';

const LIGNE: LignePanier = {
  recolteId: 7,
  quantite: 2,
  produit: 'Oignons de Gambie',
  prixUnitaire: 1500,
  unite: 'sac',
  nomProducteur: 'Producteur A',
  quantiteDisponible: 10,
  statut: 'DISPONIBLE',
};

describe('PanierTiroir', () => {
  let fixture: ComponentFixture<PanierTiroir>;
  let racine: HTMLElement;

  function monter(contenu: readonly LignePanier[]): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (contenu.length > 0) {
      localStorage.setItem(CLE_PANIER, JSON.stringify(contenu));
    }
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    });
    fixture = TestBed.createComponent(PanierTiroir);
    racine = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(TiroirPanierService).fermer();
    localStorage.clear();
  });

  it('reste invisible tant qu’il n’est pas ouvert', () => {
    monter([LIGNE]);
    expect(racine.querySelector('.tiroir')).toBeNull();
  });

  it('affiche les lignes et le total indicatif une fois ouvert', () => {
    monter([LIGNE]);
    TestBed.inject(TiroirPanierService).ouvrir();
    fixture.detectChanges();

    expect(racine.querySelector('.tiroir__nom')?.textContent).toContain('Oignons de Gambie');
    expect(racine.querySelector('.tiroir__total')?.textContent).toContain('Total indicatif');
    expect(racine.querySelector('a[href="/acheteur/commande"]')).not.toBeNull();
  });

  it('propose le catalogue quand le panier est vide', () => {
    monter([]);
    TestBed.inject(TiroirPanierService).ouvrir();
    fixture.detectChanges();

    expect(racine.querySelector('.tiroir__vide')).not.toBeNull();
    expect(racine.querySelector('a[href="/recoltes"]')).not.toBeNull();
  });

  it('modifie la quantité via le service du panier et retire la ligne à zéro', () => {
    monter([{ ...LIGNE, quantite: 1 }]);
    const panier = TestBed.inject(PanierService);
    TestBed.inject(TiroirPanierService).ouvrir();
    fixture.detectChanges();

    const plus = racine.querySelector<HTMLButtonElement>('button[aria-label^="Ajouter une unité"]');
    plus?.click();
    expect(panier.lignes()[0]?.quantite).toBe(2);

    const moins = racine.querySelector<HTMLButtonElement>('button[aria-label^="Retirer une unité"]');
    moins?.click();
    moins?.click();
    expect(panier.lignes()).toEqual([]);
  });

  it('se ferme avec la touche Échap et au clic sur le voile', () => {
    monter([LIGNE]);
    const tiroir = TestBed.inject(TiroirPanierService);
    tiroir.ouvrir();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tiroir.ouvert()).toBe(false);

    tiroir.ouvrir();
    fixture.detectChanges();
    racine.querySelector<HTMLElement>('.tiroir__voile')?.click();
    expect(tiroir.ouvert()).toBe(false);
  });
});
