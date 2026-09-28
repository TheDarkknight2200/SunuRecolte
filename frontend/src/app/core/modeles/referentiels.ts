// Référentiels alignés sur les enums Java réels du backend
// (user/entity/Role.java, user/entity/Filiere.java, user/entity/TypeAcheteur.java
// et user/dto/RoleInscription.java). Aucune valeur inventée.

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

export const ROLES_INSCRIPTION: readonly RoleInscription[] = ['PRODUCTEUR', 'ACHETEUR'];

export const FILIERES: readonly Filiere[] = ['MARAICHAGE', 'ELEVAGE', 'CEREALES', 'AUTRE'];

export const TYPES_ACHETEUR: readonly TypeAcheteur[] = [
  'COMMERCANT',
  'RESTAURATEUR',
  'PARTICULIER',
];

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
