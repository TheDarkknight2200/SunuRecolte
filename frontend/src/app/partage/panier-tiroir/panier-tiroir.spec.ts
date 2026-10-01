import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { CLE_PANIER, LignePanier, PanierService } from '../../core/services/panier.service';
import { ToastService } from '../../core/services/toast.service';
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

  function element<T extends HTMLElement>(selecteur: string): T {
    const trouve = racine.querySelector<T>(selecteur);
    if (!trouve) {
      throw new Error(`Élément introuvable : ${selecteur}`);
    }
    return trouve;
  }

  function texteDe(noeud: HTMLElement): string {
    return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Ouvre le tiroir sur le contenu déjà posé dans le panier. */
  function ouvrir(): void {
    TestBed.inject(TiroirPanierService).ouvrir();
    fixture.detectChanges();
  }

  function boutonAjout(): HTMLButtonElement {
    return element<HTMLButtonElement>('button[aria-label^="Ajouter une unité"]');
  }

  function boutonRetrait(): HTMLButtonElement {
    return element<HTMLButtonElement>('button[aria-label^="Retirer une unité"]');
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
    // Le chemin vers la commande passe de nouveau par le panier complet (§39).
    expect(racine.querySelector('.tiroir__pied .bouton--large')?.textContent?.trim()).toBe(
      'Continuer à explorer',
    );
    expect(racine.querySelector('a[href="/acheteur/panier"]')).not.toBeNull();
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

  it('neutralise le « + » au stock connu et l’annonce par une mention liée', () => {
    monter([{ ...LIGNE, quantite: 10 }]);
    ouvrir();

    const plus = boutonAjout();
    expect(plus.getAttribute('aria-disabled')).toBe('true');
    expect(plus.getAttribute('aria-describedby')).toBe('stock-max-7');
    expect(texteDe(element('#stock-max-7'))).toBe('Stock maximum atteint');

    plus.click();
    fixture.detectChanges();
    expect(TestBed.inject(PanierService).lignes()[0]?.quantite).toBe(10);
  });

  it('laisse le « − » utilisable et rend le « + » dès que la ligne redescend sous le stock', () => {
    monter([{ ...LIGNE, quantite: 10 }]);
    ouvrir();

    boutonRetrait().click();
    fixture.detectChanges();

    expect(TestBed.inject(PanierService).lignes()[0]?.quantite).toBe(9);
    expect(racine.querySelector('#stock-max-7')).toBeNull();
    expect(boutonAjout().getAttribute('aria-disabled')).toBeNull();
  });

  it('affiche dans le tiroir le motif d’un refus que le plafond du bouton ne couvre pas', () => {
    monter([{ ...LIGNE, quantite: 1.5, quantiteDisponible: 2 }]);
    ouvrir();

    const plus = boutonAjout();
    expect(plus.getAttribute('aria-disabled')).toBeNull();
    plus.click();
    fixture.detectChanges();

    const aide = element('#refus-7');
    expect(aide.getAttribute('role')).toBe('status');
    expect(plus.getAttribute('aria-describedby')).toBe('refus-7');
    expect(texteDe(aide)).toBe(
      'Quantité refusée pour « Oignons de Gambie » : le stock connu est de 2 sac au maximum, 0,01 au minimum.',
    );
    expect(TestBed.inject(PanierService).lignes()[0]?.quantite).toBe(1.5);
  });

  it('confie le refus du tiroir à la ligne, jamais à la notice globale', () => {
    monter([{ ...LIGNE, quantite: 1.5, quantiteDisponible: 2 }]);
    ouvrir();

    boutonAjout().click();
    fixture.detectChanges();

    expect(TestBed.inject(ToastService).notice()).toBeNull();

    boutonRetrait().click();
    fixture.detectChanges();

    expect(TestBed.inject(PanierService).lignes()[0]?.quantite).toBe(0.5);
    expect(racine.querySelector('#refus-7')).toBeNull();
  });

  it('se ferme avec la touche Échap, au clic sur le voile et par son action principale', () => {
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

    tiroir.ouvrir();
    fixture.detectChanges();
    racine.querySelector<HTMLButtonElement>('.tiroir__pied .bouton--large')?.click();
    expect(tiroir.ouvert()).toBe(false);
  });
});
