// Modèles d'authentification alignés sur les DTO Java réels
// (user/dto/AuthResponse.java, InscriptionRequest.java, ConnexionRequest.java).
// propriétés : celles du JSON réellement renvoyé par l'API, rien de plus.

import { Filiere, Role, RoleInscription, TypeAcheteur } from './referentiels';

/** Réponse de POST /api/auth/inscription et POST /api/auth/connexion. */
export interface AuthResponse {
  token: string;
  utilisateurId: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}

/**
 * Corps de POST /api/auth/inscription.
 * filiere est exigée pour un PRODUCTEUR, typeAcheteur pour un ACHETEUR :
 * les deux champs restent facultatifs dans le modèle, le backend tranche.
 */
export interface InscriptionRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  role: RoleInscription;
  filiere?: Filiere;
  typeAcheteur?: TypeAcheteur;
}

/** Corps de POST /api/auth/connexion. */
export interface ConnexionRequest {
  email: string;
  motDePasse: string;
}

/**
 * Identité minimale conservée localement pour l'affichage.
 * Le rôle qui y figure n'accorde aucun droit : le backend relit le rôle réel
 * en base à chaque requête.
 */
export interface SessionUtilisateur {
  utilisateurId: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}
