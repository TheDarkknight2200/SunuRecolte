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

> Tant que la configuration de sécurité JWT n'est pas implémentée (phase authentification), Spring Security
> protège toutes les routes avec un mot de passe généré, affiché dans les logs au démarrage.

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

- Interface Swagger UI : `http://localhost:8080/swagger-ui.html`
- Spécification OpenAPI JSON : `http://localhost:8080/api-docs`
