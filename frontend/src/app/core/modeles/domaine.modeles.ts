// Modèles alignés sur les DTO Java réels.
// UtilisateurResponse : user/dto/UtilisateurResponse.java
// ModifierActifRequest : user/dto/ModifierActifRequest.java
// RecolteResponse : recolte/dto/RecolteResponse.java
// RecolteRequest : recolte/dto/RecolteRequest.java
// StatutRecolteRequest : recolte/dto/StatutRecolteRequest.java
// PrixMarcheResponse : prixmarche/dto/PrixMarcheResponse.java
// PrixMarcheRequest : prixmarche/dto/PrixMarcheRequest.java
// ProducteurResponse : user/dto/ProducteurResponse.java
// AcheteurResponse : user/dto/AcheteurResponse.java
// CommandeResponse : commande/dto/CommandeResponse.java
// LigneCommandeResponse : commande/dto/LigneCommandeResponse.java
// CommandeRequest : commande/dto/CommandeRequest.java
// LigneCommandeRequest : commande/dto/LigneCommandeRequest.java
// StatutCommandeRequest : commande/dto/StatutCommandeRequest.java
// PaiementRequest : paiement/dto/PaiementRequest.java
// PaiementResponse : paiement/dto/PaiementResponse.java
// NotificationResponse : notification/dto/NotificationResponse.java
// StatistiquesProducteurResponse : statistiques/dto/StatistiquesProducteurResponse.java
// StatutNombreResponse / VenteJourResponse / TopRecolteResponse / StockFaibleResponse :
//   statistiques/dto du même nom
// (BigDecimal -> number, LocalDate -> chaîne « AAAA-MM-JJ »,
//  LocalDateTime -> chaîne ISO renvoyée par Jackson.
//  Un champ nullable côté Java — colonne sans nullable = false ou absence de
//  @NotNull/@NotBlank — est déclaré « | null » ici.)

import {
  Filiere,
  ModeReception,
  MoyenPaiement,
  Role,
  StatutCommande,
  StatutPaiement,
  StatutRecolte,
  TypeAcheteur,
} from './referentiels';

/** Réponse de GET /api/utilisateurs/{id} et GET /api/utilisateurs (liste ADMIN). */
export interface UtilisateurResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: Role;
  /** LocalDateTime Jackson → chaîne ISO « AAAA-MM-JJTHH:MM:SS ». */
  dateCreation: string;
  actif: boolean;
}

/**
 * Corps de PATCH /api/utilisateurs/{id}/actif.
 * Une seule propriété : l'identifiant de la cible est dans l'URL, jamais dans le corps.
 */
export interface ModifierActifRequest {
  actif: boolean;
}

/**
 * Réponse de GET /api/recoltes, GET /api/recoltes/{id}, GET /api/recoltes/mes-recoltes,
 * POST /api/recoltes et PUT /api/recoltes/{id}.
 */
export interface RecolteResponse {
  id: number;
  producteurId: number;
  nomProducteur: string;
  /** Producteur.localisationExploitation : colonne nullable. */
  localisationProducteur: string | null;
  produit: string;
  description: string | null;
  quantiteDisponible: number;
  quantiteMin: number | null;
  quantiteMax: number | null;
  unite: string;
  prixUnitaire: number;
  imageUrl: string | null;
  localisation: string | null;
  dateDisponibilite: string | null;
  statut: StatutRecolte;
  /** LocalDateTime Jackson → chaîne ISO « AAAA-MM-JJTHH:MM:SS ». */
  dateCreation: string;
}

/**
 * Corps de POST /api/recoltes et PUT /api/recoltes/{id}.
 * Les champs obligatoires du record Java (@NotNull / @NotBlank) restent
 * obligatoires ici ; les autres sont absents ou null.
 */
export interface RecolteRequest {
  producteurId: number;
  produit: string;
  description?: string | null;
  quantiteDisponible: number;
  quantiteMin?: number | null;
  quantiteMax?: number | null;
  unite: string;
  prixUnitaire: number;
  imageUrl?: string | null;
  localisation?: string | null;
  dateDisponibilite?: string | null;
}

/**
 * Corps de PATCH /api/recoltes/{id}/statut (modération ADMIN).
 * Volontairement séparé de RecolteRequest : le backend refuse `statut` dans le
 * corps d'une création ou d'une modification de récolte.
 */
export interface StatutRecolteRequest {
  statut: StatutRecolte;
}

/** Réponse de GET /api/prix-marche et GET /api/prix-marche/{id} (lecture publique). */
export interface PrixMarcheResponse {
  id: number;
  produit: string;
  unite: string;
  prixMoyen: number;
  /** PrixMarche.marche_reference : colonne sans nullable = false. */
  marcheReference: string | null;
  /** LocalDateTime Jackson → chaîne ISO. Alimentée par @PrePersist/@PreUpdate, jamais par le client. */
  dateMiseAJour: string;
}

/**
 * Corps de POST /api/prix-marche et PUT /api/prix-marche/{id} (écriture ADMIN).
 * Le record Java impose @NotBlank sur produit et unite, @NotNull + @DecimalMin/@DecimalMax
 * sur prixMoyen ; marcheReference est seulement borné à 150 caractères, donc nullable.
 */
export interface PrixMarcheRequest {
  produit: string;
  unite: string;
  prixMoyen: number;
  marcheReference: string | null;
}

/** Réponse de GET /api/producteurs/{id} et GET /api/producteurs/moi. */
export interface ProducteurResponse {
  id: number;
  utilisateurId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  /** Producteur.localisationExploitation : colonne nullable. */
  localisationExploitation: string | null;
  filiere: Filiere;
  description: string | null;
}

/**
 * Corps de PUT /api/producteurs/moi (le record Java ModifierProfilProducteurRequest).
 * Les sept propriétés sont non optionnelles : le service réécrit le compte et
 * l'exploitation sans fusion partielle, un envoi incomplet effacerait des données
 * (FRONTEND_DESIGN.md §36). Aucun id, rôle, « actif » ni mot de passe : le serveur
 * ne les accepte pas, l'identité de la cible vient du jeton.
 */
export interface ModifierProfilProducteurRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  localisationExploitation: string | null;
  filiere: Filiere;
  description: string | null;
}

/** Réponse de GET /api/acheteurs/{id} et GET /api/acheteurs/moi. */
export interface AcheteurResponse {
  id: number;
  utilisateurId: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  /** Acheteur.typeAcheteur : colonne nullable = false. */
  typeAcheteur: TypeAcheteur;
}

/**
 * Réponse de GET /api/commandes, GET /api/commandes/{id}, POST /api/commandes
 * et PATCH /api/commandes/{id}/statut (l'annulation passe par ce PATCH avec « ANNULEE »).
 */
export interface CommandeResponse {
  id: number;
  acheteurId: number;
  /** Utilisateur.nomComplet() : nom et prénom nullable = false. */
  nomAcheteur: string;
  /** LocalDateTime Jackson → chaîne ISO « AAAA-MM-JJTHH:MM:SS ». */
  dateCreation: string;
  statut: StatutCommande;
  /** Total calculé par le service à partir des lignes : jamais envoyé par le client. */
  total: number;
  modeReception: ModeReception;
  /** Commande.adresse_livraison : colonne sans nullable = false. */
  adresseLivraison: string | null;
  /** Commande.telephone_livraison : colonne sans nullable = false. */
  telephoneLivraison: string | null;
  /** Commande.instructions_livraison : colonne sans nullable = false. */
  instructionsLivraison: string | null;
  lignes: LigneCommandeResponse[];
  /**
   * Paiement de la commande : `CommandeService.versResponse` rend le statut du paiement
   * lorsqu'il existe, `null` quand aucun paiement n'a été enregistré. L'API n'invente
   * jamais de paiement pour une commande.
   */
  statutPaiement: StatutPaiement | null;
  /** Moyen choisi à la demande de paiement, conservé après un remboursement ; `null` sans paiement. */
  moyenPaiement: MoyenPaiement | null;
}

/** Ligne d'une CommandeResponse. */
export interface LigneCommandeResponse {
  id: number;
  recolteId: number;
  produit: string;
  unite: string;
  quantite: number;
  /** Prix figé à la commande par le service, depuis Recolte.prixUnitaire. */
  prixUnitaire: number;
  /** Sous-total calculé côté serveur (quantite × prixUnitaire). */
  sousTotal: number;
}

/**
 * Corps de POST /api/commandes.
 * Aucun champ de prix ni de total : le serveur recalcule tout depuis les récoltes.
 */
export interface CommandeRequest {
  acheteurId: number;
  modeReception: ModeReception;
  adresseLivraison?: string | null;
  telephoneLivraison?: string | null;
  instructionsLivraison?: string | null;
  lignes: LigneCommandeRequest[];
}

/** Ligne d'une CommandeRequest : seule la quantité est choisie par l'acheteur. */
export interface LigneCommandeRequest {
  recolteId: number;
  quantite: number;
}

/** Corps de PATCH /api/commandes/{id}/statut (changement de statut et annulation). */
export interface StatutCommandeRequest {
  statut: StatutCommande;
}

/** Corps de POST /api/paiements. */
export interface PaiementRequest {
  commandeId: number;
  moyenPaiement: MoyenPaiement;
}

/** Réponse de POST /api/paiements, GET /api/paiements/{id} et GET /api/paiements/commande/{commandeId}. */
export interface PaiementResponse {
  id: number;
  commandeId: number;
  /** Paiement.reference_transaction : colonne sans nullable = false (le service écrit « SIMU-… »). */
  referenceTransaction: string | null;
  montant: number;
  moyenPaiement: MoyenPaiement;
  statut: StatutPaiement;
  /** LocalDateTime Jackson → chaîne ISO. */
  dateCreation: string;
  /** Paiement.date_confirmation : colonne sans nullable = false, non renseignée en phase 5.5. */
  dateConfirmation: string | null;
}

/** Réponse de GET /api/notifications, GET /api/notifications/{id} et PUT /api/notifications/{id}/lue. */
export interface NotificationResponse {
  id: number;
  utilisateurId: number;
  titre: string;
  message: string;
  lu: boolean;
  /** LocalDateTime Jackson → chaîne ISO. */
  dateCreation: string;
}

/** Réponse de GET /api/producteurs/moi/statistiques (statistiques/dto/StatistiquesProducteurResponse.java). */
export interface StatistiquesProducteurResponse {
  /** Somme des sous-totaux des lignes du producteur, hors commandes annulées, sur la période. */
  chiffreAffaires: number;
  /** Commandes distinctes du producteur sur la période, annulées comprises : dénominateur du taux. */
  nombreCommandes: number;
  /** Chiffre d'affaires ÷ commandes non annulées ; 0,00 si aucune. */
  panierMoyen: number;
  /** Pourcentage, deux décimales ; 0,00 si aucune commande. */
  tauxAnnulation: number;
  /** Ordre du parcours de commande (EN_ATTENTE → ANNULEE), uniquement les statuts rencontrés. */
  repartitionStatuts: StatutNombreResponse[];
  /** Une entrée par jour civil de la période, sans trou, les jours sans vente à 0,00. */
  ventesParJour: VenteJourResponse[];
  /** 5 maximum, revenu décroissant, hors commandes annulées. */
  topRecoltes: TopRecolteResponse[];
  /** Récoltes actuelles sous le seuil de 5 ou épuisées, quantité croissante. */
  stockFaible: StockFaibleResponse[];
  /** Commandes de la période aux statuts EN_ATTENTE, CONFIRMEE ou PRETE. */
  commandesATraiter: number;
}

/** statistiques/dto/StatutNombreResponse.java. */
export interface StatutNombreResponse {
  statut: StatutCommande;
  nombre: number;
}

/** statistiques/dto/VenteJourResponse.java. */
export interface VenteJourResponse {
  /** LocalDate Jackson → chaîne « AAAA-MM-JJ ». */
  date: string;
  montant: number;
}

/** statistiques/dto/TopRecolteResponse.java. */
export interface TopRecolteResponse {
  recolteId: number;
  /** Recolte.produit. */
  nom: string;
  quantiteVendue: number;
  /** Recolte.unite : la quantité n'est jamais affichée sans son unité. */
  unite: string;
  revenu: number;
}

/** statistiques/dto/StockFaibleResponse.java. */
export interface StockFaibleResponse {
  recolteId: number;
  nom: string;
  quantiteDisponible: number;
  unite: string;
  statut: StatutRecolte;
}
