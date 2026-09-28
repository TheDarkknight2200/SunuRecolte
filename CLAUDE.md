# CLAUDE.md — Instructions spécifiques à Claude Code

Les règles universelles du projet sont définies dans `PROJECT_RULES.md`. Ce fichier doit être lu en complément.

# SUNURECOLTE — Instructions pour l'IA

Lire ce fichier AVANT toute modification du projet.

## Projet
SunuRecolte est une plateforme web responsive mettant en relation producteurs agricoles et acheteurs dans la région de Dakar.

## Stack imposée
- Frontend : Angular 21 (composants standalone, SCSS, Reactive Forms ; tests Vitest) — identité visuelle
  et règles d'interface dans `FRONTEND_DESIGN.md`
- Backend : Spring Boot 3.x, Java 17
- Base : PostgreSQL
- ORM : Spring Data JPA / Hibernate
- Sécurité : Spring Security + JWT
- API : REST + Swagger/OpenAPI
- Validation : Bean Validation (@Valid) + @ControllerAdvice

Architecture :
Angular → API REST Spring Boot → PostgreSQL

Paiement :
1. simulation/sandbox
2. Wave si accès API disponible
3. Orange Money si accès API disponible

Ne jamais prétendre qu'un paiement réel est intégré s'il n'a pas réellement été configuré et testé.

## Modèle de données approuvé
9 entités :
1. Utilisateur
2. Producteur
3. Acheteur
4. Récolte
5. Commande
6. LigneCommande
7. Paiement
8. Notification
9. PrixMarche

### Utilisateur
id, nom, prenom, email, telephone, mot_de_passe, role, date_creation, actif

Role : PRODUCTEUR, ACHETEUR, ADMIN

### Producteur
id, utilisateur_id, localisation_exploitation, filiere, description

Filiere : MARAICHAGE, ELEVAGE, CEREALES, AUTRE

### Acheteur
id, utilisateur_id, type_acheteur

TypeAcheteur : COMMERCANT, RESTAURATEUR, PARTICULIER

### Récolte
id, producteur_id, produit, description, quantite_disponible, quantite_min, quantite_max, unite, prix_unitaire, image_url, localisation, date_disponibilite, statut, date_creation

StatutRecolte : DISPONIBLE, EPUISEE

### Commande
id, acheteur_id, date_creation, statut, total, mode_reception, adresse_livraison, telephone_livraison, instructions_livraison

StatutCommande : EN_ATTENTE, CONFIRMEE, PRETE, LIVREE, ANNULEE

ModeReception : RETRAIT, LIVRAISON

### LigneCommande
id, commande_id, recolte_id, quantite, prix_unitaire, sous_total

IMPORTANT : prix_unitaire conserve le prix historique de la transaction.

### Paiement
id, commande_id, reference_transaction, montant, moyen_paiement, statut, date_creation, date_confirmation

MoyenPaiement : WAVE, ORANGE_MONEY
StatutPaiement : EN_ATTENTE, REUSSI, ECHOUE, ANNULE

### Notification
id, utilisateur_id, titre, message, lu, date_creation

MVP sans WebSocket :
- GET /api/notifications
- PUT /api/notifications/{id}/lue

### PrixMarche
id, produit, unite, prix_moyen, marche_reference, date_mise_a_jour

Les prix sont indicatifs et gérés par l'administrateur dans le MVP.

## Relations
- Utilisateur 1 → 0..1 Producteur
- Utilisateur 1 → 0..1 Acheteur
- Producteur 1 → 0..* Récolte
- Acheteur 1 → 0..* Commande
- Commande 1 → 1..* LigneCommande
- Récolte 1 → 0..* LigneCommande
- Commande 1 → 1 Paiement
- Utilisateur 1 → 0..* Notification

Producteur et Acheteur NE SONT PAS des sous-classes de Utilisateur. Ce sont des profils liés par utilisateur_id.

## Structure backend
com.sunurecolte
├── config/
├── security/
├── user/
├── recolte/
├── commande/
├── paiement/
├── notification/
├── prixmarche/
└── exception/

Séparation obligatoire :
Controller → Service → Repository

La logique métier importante reste dans les Services.

## Sécurité
- mots de passe hashés ;
- JWT stateless ;
- autorisation par rôle côté backend ;
- validation des entrées ;
- DTO lorsque nécessaire ;
- @ControllerAdvice ;
- aucun secret dans Git.

## Règles métier
- Une récolte appartient à un seul producteur.
- Un producteur ne peut modifier/supprimer que ses propres récoltes.
- Une récolte indisponible ne peut pas être commandée.
- Quantités et prix positifs.
- La quantité commandée ne peut pas dépasser le stock.
- Si LIVRAISON : adresse et téléphone obligatoires.
- Une commande n'est pas considérée comme payée avant confirmation.
- Paiement réussi → REUSSI.
- Paiement échoué → ECHOUE.

## HORS MVP
Ne pas ajouter sans validation :
- table Produit séparée
- Livraison
- Transporteur
- microservices
- WebSocket
- application mobile native
- IA de prédiction
- recommandations complexes
- USSD
- WhatsApp
- logistique avancée
- géolocalisation avancée
- système complexe d'avis

## Règle fondamentale
Avant toute modification :
1. Lire CLAUDE.md
2. Lire CONTEXTE.md
3. Lire TASKS.md
4. Vérifier ARCHITECTURE.md
5. Identifier les fichiers concernés
6. Modifier seulement le nécessaire
7. Tester réellement
8. Décrire exactement les changements

Ne jamais réécrire massivement le projet sans raison.
Ne jamais inventer une fonctionnalité.
Ne jamais modifier le modèle de données approuvé sans validation de l'équipe.
