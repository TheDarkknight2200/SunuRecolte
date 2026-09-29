// Référentiels alignés sur les enums Java réels du backend
// (user/entity/Role.java, user/entity/Filiere.java, user/entity/TypeAcheteur.java,
// user/dto/RoleInscription.java, commande/entity/StatutCommande.java,
// commande/entity/ModeReception.java, paiement/entity/StatutPaiement.java et
// paiement/entity/MoyenPaiement.java). Aucune valeur inventée.

export type Role = 'PRODUCTEUR' | 'ACHETEUR' | 'ADMIN';

/**
 * Rôles proposables à l'inscription publique.
 * ADMIN en est volontairement absent : le backend refuse structurellement
 * cette valeur (enum RoleInscription), l'interface ne la propose jamais.
 */
export type RoleInscription = 'PRODUCTEUR' | 'ACHETEUR';

export type Filiere = 'MARAICHAGE' | 'ELEVAGE' | 'CEREALES' | 'AUTRE';

export type TypeAcheteur = 'COMMERCANT' | 'RESTAURATEUR' | 'PARTICULIER';

export type StatutRecolte = 'DISPONIBLE' | 'EPUISEE';

/** Cycle de vie d'une commande (commande/entity/StatutCommande.java). */
export type StatutCommande = 'EN_ATTENTE' | 'CONFIRMEE' | 'PRETE' | 'LIVREE' | 'ANNULEE';

/** Mode de réception d'une commande (commande/entity/ModeReception.java). */
export type ModeReception = 'RETRAIT' | 'LIVRAISON';

/**
 * Statut d'un paiement (paiement/entity/StatutPaiement.java).
 * Le backend n'écrit que EN_ATTENTE (création) et ANNULE (annulation de la commande
 * liée, CommandeService.annulerPaiementEnAttente) : REUSSI et ECHOUE existent dans
 * l'enum et dans la contrainte de base mais aucun chemin applicatif ne les produit,
 * le paiement restant simulé.
 */
export type StatutPaiement = 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE' | 'ANNULE';

/** Moyen de paiement (paiement/entity/MoyenPaiement.java) — moyens simulés. */
export type MoyenPaiement = 'WAVE' | 'ORANGE_MONEY';

export const ROLES_INSCRIPTION: readonly RoleInscription[] = ['PRODUCTEUR', 'ACHETEUR'];

export const FILIERES: readonly Filiere[] = ['MARAICHAGE', 'ELEVAGE', 'CEREALES', 'AUTRE'];

export const TYPES_ACHETEUR: readonly TypeAcheteur[] = [
  'COMMERCANT',
  'RESTAURATEUR',
  'PARTICULIER',
];

export const STATUTS_RECOLTE: readonly StatutRecolte[] = ['DISPONIBLE', 'EPUISEE'];

export const STATUTS_COMMANDE: readonly StatutCommande[] = [
  'EN_ATTENTE',
  'CONFIRMEE',
  'PRETE',
  'LIVREE',
  'ANNULEE',
];

export const MODES_RECEPTION: readonly ModeReception[] = ['RETRAIT', 'LIVRAISON'];

export const STATUTS_PAIEMENT: readonly StatutPaiement[] = [
  'EN_ATTENTE',
  'REUSSI',
  'ECHOUE',
  'ANNULE',
];

export const MOYENS_PAIEMENT: readonly MoyenPaiement[] = ['WAVE', 'ORANGE_MONEY'];

export const LIBELLES_ROLE: Record<Role, string> = {
  PRODUCTEUR: 'Producteur',
  ACHETEUR: 'Acheteur',
  ADMIN: 'Administrateur',
};

export const LIBELLES_ROLE_INSCRIPTION: Record<RoleInscription, string> = {
  PRODUCTEUR: 'Producteur',
  ACHETEUR: 'Acheteur',
};

export const LIBELLES_FILIERE: Record<Filiere, string> = {
  MARAICHAGE: 'Maraîchage',
  ELEVAGE: 'Élevage',
  CEREALES: 'Céréales',
  AUTRE: 'Autre',
};

export const LIBELLES_TYPE_ACHETEUR: Record<TypeAcheteur, string> = {
  COMMERCANT: 'Commerçant',
  RESTAURATEUR: 'Restaurateur',
  PARTICULIER: 'Particulier',
};

export const LIBELLES_STATUT_RECOLTE: Record<StatutRecolte, string> = {
  DISPONIBLE: 'Disponible',
  EPUISEE: 'Épuisée',
};

/** Libellés affichés avec la couleur du badge (FRONTEND_DESIGN.md §27). */
export const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRMEE: 'Confirmée',
  PRETE: 'Prête',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const LIBELLES_MODE_RECEPTION: Record<ModeReception, string> = {
  RETRAIT: 'Retrait',
  LIVRAISON: 'Livraison',
};

/**
 * Variantes de badge par statut de commande, conformément au mapping de
 * FRONTEND_DESIGN.md §27. La couleur ne porte jamais le sens seule : le libellé
 * ci-dessus reste affiché à côté.
 */
export const VARIANTES_BADGE_COMMANDE: Record<StatutCommande, string> = {
  EN_ATTENTE: 'badge--avertissement',
  CONFIRMEE: 'badge--info',
  PRETE: 'badge--primaire',
  LIVREE: 'badge--succes',
  ANNULEE: 'badge--erreur',
};

/**
 * Libellés du paiement simulé (FRONTEND_DESIGN.md §28) : jamais « payé » ni
 * « confirmé » dans l'interface, seul le nom de l'état réel est repris.
 * « Annulé » qualifie le paiement, « Annulée » la commande : les deux enums
 * n'ont pas la même orthographe côté Java (ANNULE / ANNULEE).
 */
export const LIBELLES_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  EN_ATTENTE: 'En attente',
  REUSSI: 'Réussi',
  ECHOUE: 'Échoué',
  ANNULE: 'Annulé',
};

export const LIBELLES_MOYEN_PAIEMENT: Record<MoyenPaiement, string> = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
};
