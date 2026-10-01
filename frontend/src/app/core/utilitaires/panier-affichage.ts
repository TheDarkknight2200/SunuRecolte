import { RecolteResponse } from '../modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE } from '../modeles/referentiels';
import type { LignePanier } from '../services/panier.service';
import { formaterQuantite } from './formatage';

/**
 * Règles d'affichage du panier dans le catalogue et la fiche de récolte.
 *
 * Ce module ne décide rien de métier : le stock, le prix et la quantité acceptée
 * sont vérifiés par `PanierService` (interface) puis par le backend à la création
 * de la commande. Il sert uniquement à présenter un bouton et son motif cohérents
 * sur les écrans du panier.
 */

/**
 * Un clic ajoute une unité de la récolte, exprimée dans son unité déclarée
 * (`1 kg` pour une récolte en kg, `1 tonne` pour une récolte en tonne).
 * Aucune conversion entre unités n'est effectuée.
 */
export const QUANTITE_INITIALE = 1;

/** Même borne basse que le panier et que `@DecimalMin("0.01")` côté commande. */
const STOCK_MINIMUM = 0.01;

/** Une récolte n'est proposée à l'ajout que si elle est disponible et qu'il en reste. */
export function estAjoutPossible(recolte: RecolteResponse): boolean {
  return recolte.statut === 'DISPONIBLE' && recolte.quantiteDisponible >= STOCK_MINIMUM;
}

/** La quantité que le bouton ajoute, lue avec son unité : « 1 kg ». */
export function quantiteAjoutee(recolte: RecolteResponse): string {
  return formaterQuantite(QUANTITE_INITIALE, recolte.unite);
}

/**
 * Motif d'impossibilité, formulé à partir des seules données affichées à l'écran.
 * Le service renvoyant un booléen, ce texte explique la raison la plus probable
 * sans jamais promettre une quantité ni un stock que le serveur confirmera.
 */
export function messageRefusAjout(recolte: RecolteResponse): string {
  if (recolte.statut !== 'DISPONIBLE') {
    return `${recolte.produit} — récolte « ${LIBELLES_STATUT_RECOLTE[recolte.statut]} » : rien à ajouter au panier.`;
  }
  if (recolte.quantiteDisponible < STOCK_MINIMUM) {
    return `${recolte.produit} — aucun stock affiché : rien à ajouter au panier.`;
  }
  if (recolte.quantiteDisponible < QUANTITE_INITIALE) {
    return `${recolte.produit} — stock affiché (${formaterQuantite(
      recolte.quantiteDisponible,
      recolte.unite,
    )}) inférieur à la quantité ajoutée (${quantiteAjoutee(recolte)}).`;
  }
  return `${recolte.produit} — le panier contient déjà la quantité maximale affichée (${formaterQuantite(
    recolte.quantiteDisponible,
    recolte.unite,
  )}).`;
}

/**
 * Motif d'un refus essuyé par une ligne déjà au panier : `PanierService` ne renvoie
 * qu'un booléen, ce texte reformule sa règle (le stock connu au maximum, 0,01 au
 * minimum) avec les seules valeurs affichées. Source unique de la phrase, pour la
 * page du panier comme pour son tiroir.
 */
export function messageRefusQuantite(ligne: LignePanier): string {
  return `Quantité refusée pour « ${ligne.produit} » : le stock connu est de ${formaterQuantite(
    ligne.quantiteDisponible,
    ligne.unite,
  )} au maximum, ${STOCK_MINIMUM.toFixed(2).replace('.', ',')} au minimum.`;
}
