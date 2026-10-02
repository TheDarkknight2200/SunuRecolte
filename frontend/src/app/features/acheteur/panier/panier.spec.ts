import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { RecolteResponse } from '../../../core/modeles/domaine.modeles';
import {
  CLE_PANIER,
  LignePanier,
  MESSAGE_ERREUR_STOCKAGE,
  PanierService,
} from '../../../core/services/panier.service';
import { ToastService } from '../../../core/services/toast.service';
import { Panier } from './panier';

function ligne(partiels: Partial<LignePanier> = {}): LignePanier {
  return {
    recolteId: 101,
    quantite: 3,
    produit: 'Tomate',
    prixUnitaire: 500,
    unite: 'kg',
    nomProducteur: 'Awa Diop',
    quantiteDisponible: 20,
    statut: 'DISPONIBLE',
    ...partiels,
  };
}

function recolte(partiels: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id: 101,
    producteurId: 4,
    nomProducteur: 'Awa Diop',
    localisationProducteur: 'Rufisque',
    produit: 'Tomate',
    description: null,
    quantiteDisponible: 20,
    quantiteMin: null,
    quantiteMax: null,
    unite: 'kg',
    prixUnitaire: 500,
    imageUrl: null,
    localisation: null,
    dateDisponibilite: '2026-10-01',
    statut: 'DISPONIBLE',
    dateCreation: '2026-09-20T08:15:00',
    ...partiels,
  };
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function elements<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T[] {
  return Array.from(racine.querySelectorAll<T>(selecteur));
}

/** Espace insécable et espace fine comprises : comparaison sans aucun blanc. */
function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('Panier', () => {
  let fixture: ComponentFixture<Panier>;
  let racine: HTMLElement;
  let panier: PanierService;

  /** Le service lit `localStorage` à sa création : le panier est donc posé avant le rendu. */
  function ouvrir(contenu: readonly LignePanier[] = []): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (contenu.length > 0) {
      localStorage.setItem(CLE_PANIER, JSON.stringify(contenu));
    }
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation()), provideLocationMocks()],
    });
    panier = TestBed.inject(PanierService);
    fixture = TestBed.createComponent(Panier);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /** Ce que `app-toast` rendrait : la notice confiée au service, type et texte inclus. */
  function notice() {
    return TestBed.inject(ToastService).notice();
  }

  /** Saisie réelle : frappe, cycle de rendu, puis validation en quittant le champ. */
  function saisir(id: string, valeur: string): void {
    const champ = element<HTMLInputElement>(racine, `#${id}`);
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    champ.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function carte(index: number = 0): HTMLElement {
    const lignes = elements<HTMLElement>(racine, '.panier__ligne');
    if (lignes.length <= index) {
      throw new Error(`Aucune ligne de panier à l’index ${index}`);
    }
    return lignes[index];
  }

  function echapper(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  }

  function presserTab(shift: boolean = false): void {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: shift,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe('rendu', () => {
    it('affiche un panier vide, sans total ni liste, et renvoie au catalogue', () => {
      ouvrir();

      expect(texteDe(element(racine, 'h1'))).toBe('Panier');
      expect(texteDe(element(racine, '.etat__titre'))).toBe('Votre panier est vide.');
      expect(racine.querySelector('.panier__ligne')).toBeNull();
      expect(racine.querySelector('.panier__total')).toBeNull();
      expect(racine.querySelector('#vider-panier')).toBeNull();
      expect(element<HTMLAnchorElement>(racine, '#lien-catalogue').getAttribute('href')).toBe(
        '/recoltes',
      );
    });

    it('rend chaque champ de la ligne : produit, producteur, quantité, unité, prix, stock, statut', () => {
      ouvrir([ligne({ quantite: 2.5 })]);

      const carte0 = carte();
      expect(texteDe(element(carte0, '.carte__titre'))).toBe('Tomate');
      expect(texteDe(carte0)).toContain('Producteur : Awa Diop');
      expect(texteDe(carte0)).toContain('Disponible');
      expect(texteDe(carte0)).toContain('Stock connu : 20 kg');
      expect(texteDe(carte0)).toContain('Prix unitaire');
      expect(sansEspace(texteDe(carte0))).toContain('500FCFA/kg');
      expect(element<HTMLInputElement>(carte0, '#quantite-101').value).toBe('2.5');
    });

    it('conserve l’ordre des lignes et une carte par récolte', () => {
      ouvrir([
        ligne({ recolteId: 101, produit: 'Tomate' }),
        ligne({ recolteId: 102, produit: 'Oignon' }),
        ligne({ recolteId: 103, produit: 'Mangue' }),
      ]);

      expect(elements<HTMLElement>(racine, '.panier__ligne .carte__titre').map(texteDe)).toEqual([
        'Tomate',
        'Oignon',
        'Mangue',
      ]);
      expect(texteDe(racine)).toContain('3 récoltes au panier');
    });

    it('calcule le sous-total sur la quantité et le prix du snapshot', () => {
      ouvrir([ligne({ quantite: 2.5, prixUnitaire: 1200 })]);

      expect(sansEspace(texteDe(element(racine, '.panier__montants')))).toContain('3000FCFA');
    });

    it('annonce le total comme indicatif et confirmé au serveur', () => {
      ouvrir([ligne({ quantite: 4, prixUnitaire: 500 })]);

      expect(texteDe(element(racine, '.panier__total-libelle'))).toBe('Total indicatif');
      expect(sansEspace(texteDe(element(racine, '.panier__total-valeur')))).toBe('2000FCFA');
      expect(texteDe(element(racine, '.panier__total-mention'))).toBe(
        'Total indicatif, confirmé au serveur.',
      );
      expect(texteDe(racine)).not.toMatch(/montant à payer|total final|prix définitif/i);
    });

    it('chaque champ de quantité porte un label explicite', () => {
      ouvrir([ligne({ recolteId: 102, produit: 'Oignon', unite: 'sac' })]);

      const label = element<HTMLLabelElement>(racine, 'label[for="quantite-102"]');
      expect(texteDe(label)).toBe('Quantité (sac)');
      expect(element(racine, '#quantite-aide-102').getAttribute('id')).toBe('quantite-aide-102');
      expect(element(racine, '#quantite-102').getAttribute('aria-describedby')).toBe(
        'quantite-aide-102',
      );
    });

    it('propose d’ouvrir le tunnel de commande sous le total', () => {
      ouvrir([ligne()]);

      const lien = element<HTMLAnchorElement>(racine, '#lien-commander');
      expect(lien.getAttribute('href')).toBe('/acheteur/commande');
      expect(texteDe(lien)).toBe('Passer la commande');
    });

    it('ne propose aucune commande quand le panier est vide', () => {
      ouvrir();

      expect(racine.querySelector('#lien-commander')).toBeNull();
    });
  });

  describe('structure alignée sur le tiroir', () => {
    it('plafonne la liste et le récapitulatif dans le conteneur global (§20)', () => {
      ouvrir([ligne()]);

      const conteneur = element(racine, '.conteneur');
      expect(conteneur.contains(element(racine, '.panier__liste'))).toBe(true);
      expect(conteneur.contains(element(racine, '.panier__total'))).toBe(true);
    });

    it('plafonne aussi l’état vide dans le conteneur global', () => {
      ouvrir();

      expect(element(racine, '.conteneur').contains(element(racine, '.etat'))).toBe(true);
    });

    it('habille la ligne en carte globale et son retrait en action lien', () => {
      ouvrir([ligne()]);

      const carte0 = carte();
      expect(carte0.classList.contains('carte')).toBe(true);
      expect(texteDe(element(carte0, '.carte__titre'))).toBe('Tomate');

      const retirer = element<HTMLButtonElement>(carte0, '.panier__retirer');
      expect(retirer.classList.contains('lien-action')).toBe(true);
      expect(retirer.classList.contains('bouton')).toBe(false);
    });

    it('ne dessine aucune image de récolte : le snapshot du panier n’a pas d’imageUrl', () => {
      ouvrir([ligne(), ligne({ recolteId: 102, produit: 'Oignon' })]);

      expect(elements(racine, '.panier__ligne img')).toHaveLength(0);
    });

    it('réunit les montants et la saisie de quantité dans le même bloc de la ligne', () => {
      ouvrir([ligne()]);

      const detail = element(racine, '.panier__detail');
      expect(detail.contains(element(racine, '.panier__montants'))).toBe(true);
      expect(detail.contains(element(racine, '#quantite-101'))).toBe(true);
    });

    it('pose le motif de la ligne bloquée en role="status", comme la mention du tiroir', () => {
      ouvrir([ligne({ statut: 'EPUISEE' })]);

      const motif = element(racine, '.panier__motif');
      expect(motif.getAttribute('role')).toBe('status');
      expect(texteDe(motif)).toBe('Cette récolte n’est plus disponible. Retirez-la du panier.');
      expect(texteDe(element(racine, '.panier__aide'))).toBe(
        'Récolte non disponible : quantité à laisser telle quelle.',
      );
    });

    it('donne au récapitulatif la carte globale et son action principale pleine largeur', () => {
      ouvrir([ligne()]);

      expect(element(racine, '.panier__total').classList.contains('carte')).toBe(true);

      const action = element<HTMLAnchorElement>(racine, '#lien-commander');
      expect(action.classList.contains('bouton--primaire')).toBe(true);
      expect(action.classList.contains('bouton--large')).toBe(true);
    });
  });

  describe('quantité', () => {
    it('une saisie valide est transmise au service et reprise dans le total', () => {
      ouvrir([ligne({ quantite: 3, prixUnitaire: 500 })]);

      saisir('quantite-101', '4');

      expect(panier.lignes()[0].quantite).toBe(4);
      expect(element<HTMLInputElement>(racine, '#quantite-101').value).toBe('4');
      expect(sansEspace(texteDe(element(racine, '.panier__total-valeur')))).toBe('2000FCFA');
      expect(racine.querySelector('.message--erreur')).toBeNull();
      expect(notice()).toBeNull();
    });

    it('accepte une quantité décimale', () => {
      ouvrir([ligne({ quantite: 1 })]);

      saisir('quantite-101', '0.5');

      expect(panier.lignes()[0].quantite).toBe(0.5);
      expect(element<HTMLInputElement>(racine, '#quantite-101').value).toBe('0.5');
    });

    it('refuse une quantité supérieure au stock connu sans modifier la ligne', () => {
      ouvrir([ligne({ quantite: 3, quantiteDisponible: 20 })]);

      saisir('quantite-101', '21');

      expect(panier.lignes()[0].quantite).toBe(3);
      expect(element<HTMLInputElement>(racine, '#quantite-101').value).toBe('3');
      expect(notice()?.type).toBe('erreur');
      expect(notice()?.message).toContain('Quantité refusée pour « Tomate »');
      expect(notice()?.message).toContain('20 kg');
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });

    it('refuse le zéro et une saisie non numérique', () => {
      ouvrir([ligne({ quantite: 3 })]);

      saisir('quantite-101', '0');
      expect(panier.lignes()[0].quantite).toBe(3);
      expect(notice()?.type).toBe('erreur');
      expect(notice()?.message).toContain('stock connu');

      saisir('quantite-101', '');
      expect(panier.lignes()[0].quantite).toBe(3);
      expect(notice()?.message).toContain('Quantité invalide');
      expect(element<HTMLInputElement>(racine, '#quantite-101').value).toBe('3');
    });

    it('les boutons d’incrémentation ajoutent et retirent une unité', () => {
      ouvrir([ligne({ quantite: 3 })]);

      cliquer('button[aria-label="Augmenter la quantité de Tomate"]');
      expect(panier.lignes()[0].quantite).toBe(4);

      cliquer('button[aria-label="Diminuer la quantité de Tomate"]');
      expect(panier.lignes()[0].quantite).toBe(3);
    });

    it('un clic sur + au-delà du stock connu est refusé, quantité inchangée', () => {
      ouvrir([ligne({ quantite: 20, quantiteDisponible: 20 })]);

      cliquer('button[aria-label="Augmenter la quantité de Tomate"]');

      expect(panier.lignes()[0].quantite).toBe(20);
      expect(notice()?.type).toBe('erreur');
      expect(notice()?.message).toContain('Quantité refusée');
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });

    it('la mention du maximum s’efface dès que la saisie est acceptée', () => {
      ouvrir([ligne({ quantite: 3 })]);
      const t = TestBed.inject(ToastService);
      vi.useFakeTimers();

      saisir('quantite-101', '25');
      expect(notice()?.message).toContain('Quantité refusée');

      saisir('quantite-101', '5');
      expect(t.enSortie()).toBe(true);

      // La descente de 300 ms est terminée : il ne reste aucune mention à l’écran.
      vi.advanceTimersByTime(300);
      expect(notice()).toBeNull();
      expect(panier.lignes()[0].quantite).toBe(5);
    });

    it('confie le refus à la notice : la page ne rend plus aucune bannière', () => {
      ouvrir([ligne({ quantite: 3 })]);
      const espion = vi.spyOn(TestBed.inject(ToastService), 'afficher');

      saisir('quantite-101', '25');

      expect(espion).toHaveBeenCalledWith(
        'Quantité refusée pour « Tomate » : le stock connu est de 20 kg au maximum, 0,01 au minimum.',
        'erreur',
      );
      expect(racine.querySelector('.message--erreur')).toBeNull();
      expect(racine.querySelector('.message--succes')).toBeNull();
    });
  });

  describe('retrait', () => {
    it('retire uniquement la ligne demandée et met à jour le total', () => {
      ouvrir([
        ligne({ recolteId: 101, quantite: 2 }),
        ligne({ recolteId: 102, produit: 'Oignon', quantite: 1 }),
      ]);

      cliquer('button[aria-label="Retirer Tomate du panier"]');

      expect(panier.lignes().map((entree) => entree.recolteId)).toEqual([102]);
      expect(sansEspace(texteDe(element(racine, '.panier__total-valeur')))).toBe('500FCFA');
    });

    it('le dernier retrait fait basculer la page sur l’état vide', () => {
      ouvrir([ligne()]);

      cliquer('button[aria-label="Retirer Tomate du panier"]');

      expect(texteDe(element(racine, '.etat__titre'))).toBe('Votre panier est vide.');
      expect(localStorage.getItem(CLE_PANIER)).toBeNull();
    });
  });

  describe('vider le panier', () => {
    it('ne vide rien sans confirmation : la modale est un dialogue accessible', () => {
      ouvrir([ligne(), ligne({ recolteId: 102 })]);

      cliquer('#vider-panier');

      const modale = element(racine, '.modale');
      expect(modale.getAttribute('role')).toBe('dialog');
      expect(modale.getAttribute('aria-modal')).toBe('true');
      expect(modale.getAttribute('aria-labelledby')).toBe('vider-titre');
      expect(texteDe(element(racine, '#vider-titre'))).toBe(
        'Voulez-vous vraiment vider le panier ?',
      );
      expect(panier.lignes()).toHaveLength(2);
    });

    it('utilise le motif global de modale et ne redessine rien en local (§31)', () => {
      ouvrir([ligne()]);

      cliquer('#vider-panier');

      expect(racine.querySelector('.voile')).not.toBeNull();
      expect(racine.querySelector('.modale')).not.toBeNull();
      expect(racine.querySelector('.modale__actions')).not.toBeNull();
      expect(racine.querySelector('.panier__fond')).toBeNull();
      expect(racine.querySelector('.panier__modale')).toBeNull();
      expect(racine.querySelector('.panier__actions')).toBeNull();
      // Le titre référencé par aria-labelledby est bien rendu dans la boîte.
      const titre = element(racine, '#vider-titre');
      expect(element(racine, '.modale').contains(titre)).toBe(true);
    });

    it('Annuler ferme la modale, rend le focus au déclencheur et garde les lignes', () => {
      ouvrir([ligne()]);
      cliquer('#vider-panier');

      cliquer('#vider-annuler');

      expect(racine.querySelector('.modale')).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('vider-panier');
      expect(panier.lignes()).toHaveLength(1);
    });

    it('Escape ferme la modale sans vider le panier', () => {
      ouvrir([ligne()]);
      cliquer('#vider-panier');

      echapper();

      expect(racine.querySelector('.modale')).toBeNull();
      expect(panier.lignes()).toHaveLength(1);
    });

    it('un clic sur la voile ferme la modale et garde les lignes', () => {
      ouvrir([ligne(), ligne({ recolteId: 102 })]);
      cliquer('#vider-panier');

      element(racine, '.voile').click();
      fixture.detectChanges();

      expect(racine.querySelector('.modale')).toBeNull();
      expect(panier.lignes()).toHaveLength(2);
      expect(document.activeElement?.getAttribute('id')).toBe('vider-panier');
    });

    it('un clic à l’intérieur de la modale ne la ferme pas', () => {
      ouvrir([ligne(), ligne({ recolteId: 102 })]);
      cliquer('#vider-panier');

      element(racine, '.modale').click();
      fixture.detectChanges();

      expect(racine.querySelector('.modale')).not.toBeNull();
      expect(panier.lignes()).toHaveLength(2);
    });

    it('Tab et Shift+Tab restent piégés dans la modale ouverte', () => {
      ouvrir([ligne()]);
      cliquer('#vider-panier');
      expect(document.activeElement?.getAttribute('id')).toBe('vider-annuler');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('vider-confirmer');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('vider-annuler');

      presserTab(true);
      expect(document.activeElement?.getAttribute('id')).toBe('vider-confirmer');
      expect(element(racine, '.modale').contains(document.activeElement)).toBe(true);
    });

    it('confirmer purge le panier, sa clé de stockage, et pose le focus sur le catalogue', () => {
      ouvrir([ligne(), ligne({ recolteId: 102 })]);
      cliquer('#vider-panier');

      cliquer('#vider-confirmer');

      expect(panier.lignes()).toEqual([]);
      expect(localStorage.getItem(CLE_PANIER)).toBeNull();
      expect(texteDe(element(racine, '.etat__titre'))).toBe('Votre panier est vide.');
      expect(document.activeElement?.getAttribute('id')).toBe('lien-catalogue');
      expect(racine.querySelector('.modale')).toBeNull();
    });

    it('le bouton destructif porte le libellé de son effet réel', () => {
      ouvrir([ligne()]);
      cliquer('#vider-panier');

      expect(
        element<HTMLButtonElement>(racine, '#vider-confirmer').classList.contains('bouton--danger'),
      ).toBe(true);
      expect(texteDe(element(racine, '#vider-confirmer'))).toBe('Vider le panier');
    });
  });

  describe('snapshot obsolète', () => {
    it('conserve une ligne épuisée avec son état et son motif', () => {
      ouvrir([ligne({ statut: 'EPUISEE' })]);

      expect(panier.lignes()).toHaveLength(1);
      expect(texteDe(carte())).toContain('Épuisée');
      expect(texteDe(element(racine, '.panier__motif'))).toBe(
        'Cette récolte n’est plus disponible. Retirez-la du panier.',
      );
    });

    it('bloque la quantité d’une ligne épuisée, retrait toujours possible', () => {
      ouvrir([ligne({ statut: 'EPUISEE', quantite: 3 })]);

      expect(element<HTMLInputElement>(racine, '#quantite-101').disabled).toBe(true);
      expect(
        element(racine, 'button[aria-label="Augmenter la quantité de Tomate"]').hasAttribute(
          'disabled',
        ),
      ).toBe(true);

      cliquer('button[aria-label="Retirer Tomate du panier"]');

      expect(panier.lignes()).toEqual([]);
    });

    it('signale la totalité du stock connu sans inventer un contrôle serveur', () => {
      ouvrir([ligne({ quantite: 20, quantiteDisponible: 20 })]);

      expect(texteDe(element(racine, '.panier__motif'))).toBe(
        'Le panier contient déjà la totalité du stock connu.',
      );
      expect(texteDe(racine)).not.toContain('vérifié');
    });
  });

  describe('stockage', () => {
    it('annonce une écriture impossible sans masquer les lignes', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });
      ouvrir();

      expect(panier.ajouter(recolte(), 3)).toBe(true);
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--avertissement'))).toContain(
        MESSAGE_ERREUR_STOCKAGE,
      );
      expect(element(racine, '.message--avertissement').getAttribute('role')).toBe('status');
      expect(elements(racine, '.panier__ligne')).toHaveLength(1);
      expect(sansEspace(texteDe(element(racine, '.panier__total-valeur')))).toBe('1500FCFA');
    });
  });
});

/**
 * La protection de la page est vérifiée sur la table de routes réelle ; le refus des
 * autres rôles est déjà couvert par roleGuard.spec et authGuard.spec.
 */
describe('route du panier acheteur', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
    title?: string;
    loadComponent?: unknown;
    redirectTo?: string;
  }

  function route(path: string): RouteProtegee {
    const trouvee = routes.find((entree) => entree.path === path);
    if (!trouvee) {
      throw new Error(`Route introuvable : ${path}`);
    }
    return trouvee as unknown as RouteProtegee;
  }

  it('exige authGuard puis roleGuard pour ACHETEUR uniquement', () => {
    const protegee = route('acheteur/panier');

    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['ACHETEUR'] });
    expect(protegee.title).toBe('SunuRecolte — Panier');
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('laisse l’espace acheteur et le catalogue publics inchangés', () => {
    // L’espace acheteur n’est plus une page d’attente : il mène à la liste des commandes.
    expect(route('acheteur').redirectTo).toBe('acheteur/commandes');
    expect(route('recoltes').canActivate).toBeUndefined();
  });
});
