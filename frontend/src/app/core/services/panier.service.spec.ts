import { TestBed } from '@angular/core/testing';
import { RecolteResponse } from '../modeles/domaine.modeles';
import { CLE_PANIER, LignePanier, MESSAGE_ERREUR_STOCKAGE, PanierService } from './panier.service';

/** Récolte du catalogue telle que renvoyée par GET /api/recoltes. */
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

/** Ligne déjà persistée, à fournir telle quelle au stockage. */
function ligneStockee(partiels: Partial<LignePanier> = {}): LignePanier {
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

function ecrireStockage(valeur: unknown): void {
  localStorage.setItem(CLE_PANIER, JSON.stringify(valeur));
}

/** Ligne valide dont un champ a été corrompu : ce que localStorage peut réellement contenir. */
function ligneCorrompue(champs: Record<string, unknown>): unknown {
  return { ...ligneStockee(), ...champs };
}

function nouveauService(): PanierService {
  TestBed.resetTestingModule();
  return TestBed.configureTestingModule({}).inject(PanierService);
}

describe('PanierService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe('ajout', () => {
    it('ajoute une première ligne à partir d’une récolte du catalogue', () => {
      const panier = nouveauService();

      expect(panier.ajouter(recolte(), 3)).toBe(true);

      expect(panier.lignes()).toEqual([ligneStockee({ quantite: 3 })]);
    });

    it('conserve l’ordre d’ajout et une ligne par récolte', () => {
      const panier = nouveauService();

      panier.ajouter(recolte({ id: 101, produit: 'Tomate' }), 2);
      panier.ajouter(recolte({ id: 102, produit: 'Oignon', prixUnitaire: 300 }), 5);

      expect(panier.lignes().map((ligne) => ligne.produit)).toEqual(['Tomate', 'Oignon']);
    });

    it('fusionne une récolte déjà présente au lieu de créer une deuxième ligne', () => {
      const panier = nouveauService();

      panier.ajouter(recolte(), 3);
      panier.ajouter(recolte({ prixUnitaire: 999 }), 4);

      expect(panier.lignes()).toHaveLength(1);
      expect(panier.lignes()[0]).toMatchObject({ recolteId: 101, quantite: 7 });
      // Le snapshot est repris de la lecture la plus récente : il reste un simple affichage.
      expect(panier.lignes()[0].prixUnitaire).toBe(999);
      expect(panier.totalIndicatif()).toBe(6993);
    });

    it('ne crée aucune ligne quand l’ajout est refusé', () => {
      const panier = nouveauService();

      expect(panier.ajouter(recolte(), 0)).toBe(false);
      expect(panier.ajouter(recolte(), -2)).toBe(false);
      expect(panier.ajouter(recolte(), Number.NaN)).toBe(false);

      expect(panier.lignes()).toEqual([]);
    });

    it('refuse une quantité qui dépasse le stock connu, cumul compris', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ quantiteDisponible: 10 }), 8);

      expect(panier.ajouter(recolte({ quantiteDisponible: 10 }), 3)).toBe(false);
      expect(panier.lignes()[0].quantite).toBe(8);

      expect(panier.ajouter(recolte({ quantiteDisponible: 10 }), 2)).toBe(true);
      expect(panier.lignes()[0].quantite).toBe(10);
    });

    it('refuse une récolte sans stock', () => {
      const panier = nouveauService();

      expect(panier.ajouter(recolte({ quantiteDisponible: 0, statut: 'EPUISEE' }), 1)).toBe(false);
      expect(panier.lignes()).toEqual([]);
    });
  });

  describe('quantités', () => {
    it('remplace la quantité d’une ligne existante', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);

      expect(panier.modifierQuantite(101, 7)).toBe(true);

      expect(panier.lignes()).toEqual([ligneStockee({ quantite: 7 })]);
    });

    it('refuse une quantité nulle, négative ou non mesurable', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);

      expect(panier.modifierQuantite(101, 0)).toBe(false);
      expect(panier.modifierQuantite(101, -5)).toBe(false);
      expect(panier.modifierQuantite(101, Number.POSITIVE_INFINITY)).toBe(false);

      expect(panier.lignes()[0].quantite).toBe(3);
    });

    it('refuse une quantité supérieure au stock connu', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ quantiteDisponible: 6 }), 2);

      expect(panier.modifierQuantite(101, 6.5)).toBe(false);
      expect(panier.modifierQuantite(101, 6)).toBe(true);

      expect(panier.lignes()[0].quantite).toBe(6);
    });

    it('refuse une ligne absente du panier', () => {
      const panier = nouveauService();

      expect(panier.modifierQuantite(999, 2)).toBe(false);
      expect(panier.lignes()).toEqual([]);
    });

    it('accepte une quantité décimale, unité du domaine (kg, tonne)', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 2);

      expect(panier.modifierQuantite(101, 2.5)).toBe(true);
      expect(panier.lignes()[0].quantite).toBe(2.5);
    });
  });

  describe('retrait et purge', () => {
    it('retire uniquement la ligne demandée', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ id: 101 }), 2);
      panier.ajouter(recolte({ id: 102 }), 3);

      panier.retirer(101);

      expect(panier.lignes().map((ligne) => ligne.recolteId)).toEqual([102]);
    });

    it('ignore le retrait d’une récolte absente', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 2);

      panier.retirer(777);

      expect(panier.lignes()).toHaveLength(1);
    });

    it('vide complètement le panier et sa clé de stockage', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 2);
      panier.ajouter(recolte({ id: 102 }), 1);

      panier.vider();

      expect(panier.lignes()).toEqual([]);
      expect(panier.totalIndicatif()).toBe(0);
      expect(localStorage.getItem(CLE_PANIER)).toBeNull();
    });
  });

  describe('calculs', () => {
    it('calcule un total indicatif à partir des snapshots locaux', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ id: 101, prixUnitaire: 500 }), 2);
      panier.ajouter(recolte({ id: 102, prixUnitaire: 300 }), 3);

      expect(panier.totalIndicatif()).toBe(1900);
    });

    it('suit les modifications de quantité et de lignes', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ prixUnitaire: 500 }), 2);
      expect(panier.totalIndicatif()).toBe(1000);

      panier.modifierQuantite(101, 4);
      expect(panier.totalIndicatif()).toBe(2000);

      panier.retirer(101);
      expect(panier.totalIndicatif()).toBe(0);
    });
  });

  describe('persistance', () => {
    it('écrit les lignes dans localStorage sous la clé sunurecolte.panier', () => {
      const panier = nouveauService();

      panier.ajouter(recolte(), 3);

      expect(JSON.parse(localStorage.getItem(CLE_PANIER) ?? 'null')).toEqual([
        ligneStockee({ quantite: 3 }),
      ]);
    });

    it('restaure les lignes persistées dans une nouvelle instance du service', () => {
      const premier = nouveauService();
      premier.ajouter(recolte(), 3);
      premier.ajouter(recolte({ id: 102, produit: 'Oignon', prixUnitaire: 300 }), 1);

      const second = nouveauService();

      expect(second.lignes()).toEqual([
        ligneStockee({ quantite: 3 }),
        ligneStockee({
          recolteId: 102,
          produit: 'Oignon',
          prixUnitaire: 300,
          quantite: 1,
        }),
      ]);
      expect(second.totalIndicatif()).toBe(1800);
    });

    it('supprime la clé de stockage quand le panier se vide', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);

      panier.retirer(101);

      expect(localStorage.getItem(CLE_PANIER)).toBeNull();
    });
  });

  describe('robustesse du stockage', () => {
    it('démarre sur un panier vide quand localStorage ne contient rien', () => {
      expect(nouveauService().lignes()).toEqual([]);
    });

    it('démarre sur un panier vide quand le JSON est illisible', () => {
      localStorage.setItem(CLE_PANIER, '{ ce n’est pas du JSON');

      expect(nouveauService().lignes()).toEqual([]);
    });

    it('démarre sur un panier vide quand la structure n’est pas une liste', () => {
      ecrireStockage({ recolteId: 101, quantite: 3 });
      expect(nouveauService().lignes()).toEqual([]);

      ecrireStockage('tomate');
      expect(nouveauService().lignes()).toEqual([]);

      ecrireStockage(null);
      expect(nouveauService().lignes()).toEqual([]);
    });

    it('ignore les lignes invalides et conserve les autres', () => {
      ecrireStockage([
        ligneStockee({ recolteId: 101 }),
        { recolteId: 102 },
        ligneCorrompue({ recolteId: 103, produit: '   ' }),
        ligneCorrompue({ recolteId: 104, statut: 'BROUEE' }),
        ligneCorrompue({ recolteId: 105, quantite: 30, quantiteDisponible: 20 }),
        ligneCorrompue({ recolteId: 106, quantite: 'beaucoup' }),
        ligneCorrompue({ recolteId: 107, unite: '' }),
        ligneCorrompue({ recolteId: 108, prixUnitaire: null }),
        null,
        42,
        ligneStockee({ recolteId: 109, quantite: 2 }),
      ]);

      expect(
        nouveauService()
          .lignes()
          .map((ligne) => ligne.recolteId),
      ).toEqual([101, 109]);
    });

    it('fusionne les récoltes en double apparues dans le stockage', () => {
      ecrireStockage([
        ligneStockee({ recolteId: 101, quantite: 3 }),
        ligneStockee({ recolteId: 101, quantite: 4 }),
      ]);

      expect(nouveauService().lignes()).toEqual([ligneStockee({ quantite: 7 })]);
    });

    it('plafonne la fusion au stock connu', () => {
      ecrireStockage([
        ligneStockee({ recolteId: 101, quantite: 18, quantiteDisponible: 20 }),
        ligneStockee({ recolteId: 101, quantite: 9, quantiteDisponible: 20 }),
      ]);

      expect(nouveauService().lignes()[0].quantite).toBe(20);
    });

    it('signale une écriture impossible sans interrompre le panier', () => {
      const stockage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', stockage);

      const panier = nouveauService();
      expect(panier.erreurStockage()).toBeNull();

      expect(panier.ajouter(recolte(), 3)).toBe(true);

      expect(panier.lignes()).toEqual([ligneStockee({ quantite: 3 })]);
      expect(panier.totalIndicatif()).toBe(1500);
      expect(panier.erreurStockage()).toBe(MESSAGE_ERREUR_STOCKAGE);
    });

    it('ne signale aucune erreur quand le stockage répond', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);

      panier.retirer(101);

      expect(panier.erreurStockage()).toBeNull();
    });

    it('efface la mention d’erreur dès qu’une écriture réussit', () => {
      let echecs = 1;
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          if (echecs-- > 0) {
            throw new Error('QuotaExceededError');
          }
        }),
        removeItem: vi.fn(),
      });

      const panier = nouveauService();
      expect(panier.ajouter(recolte(), 3)).toBe(true);
      expect(panier.erreurStockage()).toBe(MESSAGE_ERREUR_STOCKAGE);

      expect(panier.ajouter(recolte({ id: 102 }), 1)).toBe(true);
      expect(panier.erreurStockage()).toBeNull();
    });
  });

  describe('immutabilité', () => {
    it('remplace le tableau et ses objets au lieu de les muter', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);

      const avant = panier.lignes();
      const avantTomate = avant[0];

      panier.ajouter(recolte({ id: 102 }), 1);

      expect(panier.lignes()).not.toBe(avant);
      expect(avant).toHaveLength(1);
      expect(avant[0]).toBe(avantTomate);
      expect(avantTomate.quantite).toBe(3);
    });

    it('ne modifie jamais la ligne précédente quand la quantité change', () => {
      const panier = nouveauService();
      panier.ajouter(recolte(), 3);
      const avant = panier.lignes()[0];

      panier.modifierQuantite(101, 5);

      expect(avant.quantite).toBe(3);
      expect(panier.lignes()[0]).not.toBe(avant);
      expect(panier.lignes()[0].quantite).toBe(5);
    });

    it('ne réutilise aucun objet ligne après un retrait', () => {
      const panier = nouveauService();
      panier.ajouter(recolte({ id: 101 }), 3);
      panier.ajouter(recolte({ id: 102, produit: 'Oignon' }), 2);
      const tomateAvantRetrait = panier.lignes()[0];

      panier.retirer(102);

      expect(panier.lignes()).toEqual([tomateAvantRetrait]);
      expect(panier.lignes()[0]).toBe(tomateAvantRetrait);
    });
  });
});
