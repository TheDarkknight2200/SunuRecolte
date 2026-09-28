// Modèles alignés sur les DTO Java réels.
// UtilisateurResponse : user/dto/UtilisateurResponse.java
// RecolteResponse : recolte/dto/RecolteResponse.java
// (BigDecimal -> number, LocalDate -> chaîne « AAAA-MM-JJ »,
//  LocalDateTime -> chaîne ISO renvoyée par Jackson.)

import { Role, StatutRecolte } from './referentiels';

/** Réponse de GET /api/utilisateurs/{id}. */
export interface UtilisateurResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: Role;
  dateCreation: string;
  actif: boolean;
}

/** Réponse de GET /api/recoltes et GET /api/recoltes/{id}. */
export interface RecolteResponse {
  id: number;
  producteurId: number;
  nomProducteur: string;
  localisationProducteur: string;
  produit: string;
  description: string;
  quantiteDisponible: number;
  quantiteMin: number;
  quantiteMax: number;
  unite: string;
  prixUnitaire: number;
  imageUrl: string | null;
  localisation: string;
  dateDisponibilite: string;
  statut: StatutRecolte;
  dateCreation: string;
}
