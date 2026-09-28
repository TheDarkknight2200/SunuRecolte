# SunuRecolte 🌾

Plateforme web de mise en relation directe entre producteurs agricoles et acheteurs dans la région de Dakar.
*Projet de fin d'études — Licence 3 Informatique.*

---

## 📌 Présentation

**SunuRecolte** facilite la commercialisation des produits agricoles locaux en éliminant les intermédiaires superflus. La plateforme permet :
- Aux **producteurs** de publier leurs récoltes disponibles, de gérer leurs stocks et de suivre leurs commandes.
- Aux **acheteurs** (commerçants, restaurateurs, particuliers) de parcourir le catalogue, filtrer les récoltes, commander (retrait ou livraison) et payer via mobile money.
- Aux **administrateurs** de modérer les utilisateurs, les offres de récoltes, et de gérer les prix indicatifs du marché.

---

## 🛠 Stack Technique

- **Frontend** : Angular
- **Backend** : Spring Boot 3.x (Java 17)
- **Base de données** : PostgreSQL
- **ORM** : Spring Data JPA / Hibernate
- **Sécurité** : Spring Security 6 + JWT (stateless)
- **Validation** : Jakarta Bean Validation (`@Valid`)
- **Documentation API** : OpenAPI 3 / Swagger
- **Paiement** : Approche progressive (Simulation/Sandbox d'abord, puis Wave / Orange Money selon disponibilité API)

---

## 📐 Architecture & Modèle de Données

Architecture générale : **Angular → Spring Boot REST API → PostgreSQL**

### 9 Entités approuvées :
1. `Utilisateur` : identité, rôles (`PRODUCTEUR`, `ACHETEUR`, `ADMIN`), statut actif.
2. `Producteur` : exploitation, filière (`MARAICHAGE`, `ELEVAGE`, `CEREALES`, `AUTRE`), description.
3. `Acheteur` : type d'acheteur (`COMMERCANT`, `RESTAURATEUR`, `PARTICULIER`).
4. `Récolte` : produit, quantité disponible, prix unitaire, localisation, statut (`DISPONIBLE`, `EPUISEE`).
5. `Commande` : statut (`EN_ATTENTE`, `CONFIRMEE`, `PRETE`, `LIVREE`, `ANNULEE`), mode réception (`RETRAIT`, `LIVRAISON`), adresse.
6. `LigneCommande` : récolte, quantité, prix unitaire historique, sous-total.
7. `Paiement` : référence, montant, moyen (`WAVE`, `ORANGE_MONEY`), statut (`EN_ATTENTE`, `REUSSI`, `ECHOUE`, `ANNULE`).
8. `Notification` : utilisateur destinataire, titre, message, statut de lecture (MVP REST).
9. `PrixMarche` : prix indicatifs moyens de référence administrés.

---

## 📚 Documents de Référence

- [`PROJECT_RULES.md`](./PROJECT_RULES.md) : Règles universelles et strictes du projet (périmètre, contraintes).
- [`CONTEXTE.md`](./CONTEXTE.md) : Contexte académique, acteurs, priorités du MVP.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) : Détail des flux et découpage en packages.
- [`TASKS.md`](./TASKS.md) : Suivi détaillé de l'avancement par phases.
- [`REGLES_DEVELOPPEMENT.md`](./REGLES_DEVELOPPEMENT.md) : Bonnes pratiques de code, tests et commits.

---

## ⚙️ Installation

### Prérequis

- **Java JDK 17** (testé avec Eclipse Adoptium Temurin 17.0.19)
- **PostgreSQL 17** démarré localement (port 5432)
- **Maven** : inutile de l'installer, le Maven Wrapper (`mvnw` / `mvnw.cmd`, Maven 3.9.15) est fourni
- **Node.js 18+ / Angular CLI** : uniquement pour la phase frontend

### 1. Créer la base de données

```bash
psql -U postgres -c "CREATE DATABASE sunurecolte;"
```

### 2. Configurer les secrets locaux (hors Git)

Créer le fichier `sunurecolte-backend/src/main/resources/application-local.properties` :

```properties
spring.datasource.password=VOTRE_MOT_DE_PASSE_POSTGRES
jwt.secret=CHANGER_CETTE_CLE_SECRETE_32_CARACTERES_MINIMUM
jwt.expiration=86400000
```

Ce fichier est ignoré par Git : ne jamais le committer, ne jamais écrire de mot de passe réel dans le dépôt.

### 3. Lancer le backend

```bash
cd sunurecolte-backend
./mvnw spring-boot:run        # Linux / macOS / Git Bash
mvnw.cmd spring-boot:run      # Windows (cmd / PowerShell)
```

L'API démarre sur `http://localhost:8080`. Au démarrage, **Flyway** applique automatiquement les migrations
de `src/main/resources/db/migration/`, puis Hibernate **vérifie** la correspondance entités/tables
(`ddl-auto=validate`) sans jamais modifier le schéma. Toute évolution du schéma passe donc par une nouvelle
migration versionnée (`V2__...`).

> **Sécurité provisoire (Phase 2)** : tant que l'authentification JWT n'est pas implémentée (Phase 3),
> la configuration de sécurité autorise toutes les requêtes (`permitAll`). Aucune route n'est donc protégée
> à ce stade : c'est un état de développement volontaire, pas une configuration de production.

### 4. Lancer les tests

```bash
cd sunurecolte-backend
./mvnw test
```

Les tests d'intégration s'exécutent contre la base PostgreSQL locale (aucune base embarquée, aucun mock) :
PostgreSQL doit donc être démarré et `application-local.properties` configuré. Les données de test sont
annulées automatiquement (rollback).

### 5. Documentation API (Swagger)

Application démarrée :

- Interface Swagger UI : `http://localhost:8080/swagger-ui.html` (ou `http://localhost:8080/swagger-ui/index.html`)
- Spécification OpenAPI JSON : `http://localhost:8080/v3/api-docs`

### 6. Principales routes de l'API

Toutes les routes sont exposées sous `http://localhost:8080`. L'organisation suit le flux
`Controller → Service → Repository` ; la logique métier (stock, calculs, transitions de statut) est
appliquée côté serveur.

| Domaine | Méthode et route | Rôle |
| --- | --- | --- |
| Récoltes | `GET /api/recoltes` | Liste, filtres optionnels `statut`, `filiere`, `recherche` |
| Récoltes | `GET /api/recoltes/{id}` | Détail d'une récolte |
| Récoltes | `POST /api/recoltes` | Création (producteur existant obligatoire) |
| Récoltes | `PUT /api/recoltes/{id}` | Modification |
| Récoltes | `DELETE /api/recoltes/{id}` | Suppression (refusée si la récolte est commandée) |
| Commandes | `GET /api/commandes` | Liste, filtre optionnel `acheteurId` |
| Commandes | `GET /api/commandes/{id}` | Détail avec ses lignes |
| Commandes | `POST /api/commandes` | Création : total calculé serveur, stock décrémenté et contrôlé |
| Commandes | `PATCH /api/commandes/{id}/statut` | Changement de statut (transitions contrôlées) |
| Paiements | `GET /api/paiements/{id}` | Détail d'un paiement |
| Paiements | `GET /api/paiements/commande/{commandeId}` | Paiement d'une commande |
| Paiements | `POST /api/paiements` | Paiement **simulé** (WAVE / ORANGE_MONEY, aucune transaction réelle) |
| Notifications | `GET /api/notifications` | Liste, filtre optionnel `utilisateurId` |
| Notifications | `GET /api/notifications/{id}` | Détail |
| Notifications | `PUT /api/notifications/{id}/lue` | Marquer comme lue |
| Prix du marché | `GET /api/prix-marche` | Liste des prix indicatifs |
| Prix du marché | `GET /api/prix-marche/{id}` | Détail |
| Profils | `GET /api/utilisateurs/{id}` | Compte utilisateur (sans mot de passe) |
| Profils | `GET /api/producteurs/{id}` · `PUT /api/producteurs/{id}` | Profil producteur |
| Profils | `GET /api/acheteurs/{id}` | Profil acheteur |

En cas d'erreur, l'API renvoie un JSON du type `{"statut": 404, "message": "...", "timestamp": "..."}`
(ou `erreurs` par champ en cas d'échec de validation), sans jamais exposer de détails internes.

> Le paiement est une **simulation** pour le MVP : aucune transaction réelle n'est effectuée et aucune
> intégration Wave / Orange Money n'existe à ce stade.

