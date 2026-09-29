import { Injectable, computed, signal } from '@angular/core';
import { RecolteResponse } from '../modeles/domaine.modeles';
import { STATUTS_RECOLTE, StatutRecolte } from '../modeles/referentiels';

/**
 * Clé du panier — préfixe `sunurecolte.` commun au stockage local
 * (FRONTEND_DESIGN.md §19 et §25).
 */
export const CLE_PANIER = 'sunurecolte.panier';

/** Même borne basse que `@DecimalMin("0.01")` côté commande et que le formulaire récolte. */
const QUANTITE_MINIMUM = 0.01;

/** Message affiché par les écrans quand le stockage local est indisponible. */
export const MESSAGE_ERREUR_STOCKAGE =
  'Le panier n’a pas pu être enregistré sur cet appareil. Il reste utilisable pendant cette session.';

/**
 * Une ligne du panier : snapshot purement local d'une récolte au moment de l'ajout.
 *
 * Ces valeurs ne sont JAMAIS une autorité métier : prix, stock, disponibilité et
 * total sont recalculés par le serveur à la création de la commande
 * (`POST /api/commandes`). Elles ne servent qu'à afficher et composer le panier.
 * Il n'existe ni entité, ni table, ni endpoint de panier.
 */
export interface LignePanier {
  readonly recolteId: number;
  readonly quantite: number;
  readonly produit: string;
  readonly prixUnitaire: number;
  readonly unite: string;
  readonly nomProducteur: string;
  /** Stock connu à l'ajout : plafonne la saisie côté interface, le serveur vérifie à la commande. */
  readonly quantiteDisponible: number;
  readonly statut: StatutRecolte;
}

/**
 * Panier de commande, état exclusif du frontend (`localStorage`).
 *
 * Le service n'appelle aucune API : il compose une liste de lignes qu'un écran
 * transformera en `CommandeRequest`. Toute mutation remplace le tableau et ses
 * objets par de nouvelles références (aucune mutation en place) et persiste le
 * résultat ; une écriture qui échoue est signalée, jamais jetée.
 */
@Injectable({ providedIn: 'root' })
export class PanierService {
  private readonly etatLignes = signal<LignePanier[]>(lirePanierStocke());
  private readonly etatErreurStockage = signal<string | null>(null);

  /** Lignes dans l'ordre d'ajout ; une seule ligne par récolte. */
  readonly lignes = this.etatLignes.asReadonly();

  /**
   * Total indicatif, calculé sur les snapshots locaux (quantité × prix à l'ajout).
   * À présenter avec la mention « total indicatif, confirmé au serveur » (§25) :
   * le total réel d'une commande est celui que renvoie le backend.
   */
  readonly totalIndicatif = computed(() =>
    this.etatLignes().reduce((somme, ligne) => somme + ligne.quantite * ligne.prixUnitaire, 0),
  );

  /** `MESSAGE_ERREUR_STOCKAGE` après un `setItem()` raté, `null` dès qu'une écriture réussit. */
  readonly erreurStockage = this.etatErreurStockage.asReadonly();

  /**
   * Ajoute la récolte, ou fusionne avec la ligne déjà présente (une récolte ne peut
   * jamais produire deux lignes). En cas de fusion, la ligne garde sa place, sa
   * quantité s'additionne et le snapshot d'affichage est repris de la récolte la plus
   * récente. Refusé sans effet si la quantité est invalide, si la récolte n'a aucun
   * stock ou si le total dépasserait le stock connu.
   */
  ajouter(recolte: RecolteResponse, quantite: number): boolean {
    const existante = this.etatLignes().find((ligne) => ligne.recolteId === recolte.id);
    const total = (existante?.quantite ?? 0) + quantite;
    if (!estQuantiteAcceptable(quantite, recolte.quantiteDisponible, total)) {
      return false;
    }
    const ligne: LignePanier = {
      recolteId: recolte.id,
      quantite: total,
      produit: recolte.produit,
      prixUnitaire: recolte.prixUnitaire,
      unite: recolte.unite,
      nomProducteur: recolte.nomProducteur,
      quantiteDisponible: recolte.quantiteDisponible,
      statut: recolte.statut,
    };
    this.remplacer(
      existante
        ? this.etatLignes().map((courante) =>
            courante.recolteId === recolte.id ? ligne : courante,
          )
        : [...this.etatLignes(), ligne],
    );
    return true;
  }

  /** Nouvelle quantité pour une récolte du panier ; refusé sans effet sinon. */
  modifierQuantite(recolteId: number, quantite: number): boolean {
    const ligne = this.etatLignes().find((courante) => courante.recolteId === recolteId);
    if (!ligne || !estQuantiteAcceptable(quantite, ligne.quantiteDisponible, quantite)) {
      return false;
    }
    this.remplacer(
      this.etatLignes().map((courante) =>
        courante.recolteId === recolteId ? { ...courante, quantite } : courante,
      ),
    );
    return true;
  }

  /** Retire la ligne de la récolte ; sans effet si elle n'est pas dans le panier. */
  retirer(recolteId: number): void {
    this.remplacer(this.etatLignes().filter((ligne) => ligne.recolteId !== recolteId));
  }

  /** Vide complètement le panier et sa clé de stockage. À appeler après une commande
   * créée et à la déconnexion ; ces branchements relèvent des sous-phases suivantes. */
  vider(): void {
    this.remplacer([]);
  }

  /** Remplace l'état par une nouvelle liste puis la persiste : jamais de mutation en place. */
  private remplacer(lignes: LignePanier[]): void {
    this.etatLignes.set(lignes);
    this.persiste(lignes);
  }

  private persiste(lignes: LignePanier[]): void {
    try {
      if (lignes.length === 0) {
        localStorage.removeItem(CLE_PANIER);
      } else {
        localStorage.setItem(CLE_PANIER, JSON.stringify(lignes));
      }
      this.etatErreurStockage.set(null);
    } catch {
      // Stockage indisponible (quota, mode privé, blocage) : le panier reste en mémoire.
      this.etatErreurStockage.set(MESSAGE_ERREUR_STOCKAGE);
    }
  }
}

/** Quantité valide pour le panier : positive, dans la limite du stock connu, cumul compris. */
function estQuantiteAcceptable(quantite: number, stock: number, totalApres: number): boolean {
  if (!Number.isFinite(quantite) || quantite < QUANTITE_MINIMUM) {
    return false;
  }
  return stock >= QUANTITE_MINIMUM && totalApres <= stock;
}

/**
 * Restaure les lignes persistées : un contenu absent, illisible ou de structure
 * inattendue donne un panier vide, et une ligne invalide est ignorée sans empêcher
 * de charger les autres. Les récoltes dupliquées sont fusionnées, plafonnées au stock.
 */
function lirePanierStocke(): LignePanier[] {
  let brut: string | null;
  try {
    brut = localStorage.getItem(CLE_PANIER);
  } catch {
    return [];
  }
  if (!brut) {
    return [];
  }
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return [];
  }
  if (!Array.isArray(valeur)) {
    return [];
  }
  return valeur.reduce<LignePanier[]>((lignes, entree) => {
    if (!estLignePanier(entree)) {
      return lignes;
    }
    const existante = lignes.find((ligne) => ligne.recolteId === entree.recolteId);
    if (existante) {
      return lignes.map((ligne) =>
        ligne.recolteId === entree.recolteId
          ? {
              ...ligne,
              quantite: Math.min(ligne.quantite + entree.quantite, ligne.quantiteDisponible),
            }
          : ligne,
      );
    }
    return [...lignes, entree];
  }, []);
}

/** Garde de structure : rien n'entre dans le panier sans correspondre à un snapshot complet. */
function estLignePanier(valeur: unknown): valeur is LignePanier {
  if (typeof valeur !== 'object' || valeur === null) {
    return false;
  }
  const ligne = valeur as Record<string, unknown>;
  return (
    estNombrePositif(ligne['recolteId']) &&
    estNombrePositif(ligne['quantite']) &&
    estNombrePositif(ligne['quantiteDisponible']) &&
    typeof ligne['prixUnitaire'] === 'number' &&
    Number.isFinite(ligne['prixUnitaire']) &&
    ligne['prixUnitaire'] >= 0 &&
    estTexteNonVide(ligne['produit']) &&
    estTexteNonVide(ligne['unite']) &&
    estTexteNonVide(ligne['nomProducteur']) &&
    estStatutRecolte(ligne['statut']) &&
    (ligne['quantite'] as number) <= (ligne['quantiteDisponible'] as number)
  );
}

function estNombrePositif(valeur: unknown): boolean {
  return typeof valeur === 'number' && Number.isFinite(valeur) && valeur > 0;
}

function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

function estStatutRecolte(valeur: unknown): valeur is StatutRecolte {
  return typeof valeur === 'string' && (STATUTS_RECOLTE as readonly string[]).includes(valeur);
}
