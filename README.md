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

- **Frontend** : Angular 21 (composants standalone, SCSS, Reactive Forms ; tests Vitest)
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
- [`FRONTEND_DESIGN.md`](./FRONTEND_DESIGN.md) : Identité visuelle, tokens et règles d'interface du frontend.

---

## ⚙️ Installation

### Prérequis

- **Java JDK 17** (testé avec Eclipse Adoptium Temurin 17.0.19)
- **PostgreSQL 17** démarré localement (port 5432)
- **Maven** : inutile de l'installer, le Maven Wrapper (`mvnw` / `mvnw.cmd`, Maven 3.9.15) est fourni
- **Node.js 20.19+ / 22.12+ / 24+** pour le frontend Angular 21 (testé avec Node 24.18 ; le CLI Angular
  est une dépendance locale du projet, aucune installation globale n'est nécessaire)

### 1. Créer la base de données

```bash
psql -U postgres -c "CREATE DATABASE sunurecolte;"
```

### 2. Configurer les secrets locaux (hors Git)

Créer le fichier `sunurecolte-backend/src/main/resources/application-local.properties` :

```properties
spring.datasource.password=VOTRE_MOT_DE_PASSE_POSTGRES
jwt.secret=UNE_CLE_ALEATOIRE_D_AU_MOINS_32_CARACTERES
app.admin.email=admin@sunurecolte.sn
app.admin.password=UN_MOT_DE_PASSE_LOCAL_D_AU_MOINS_6_CARACTERES
```

Générer la clé JWT (jamais recopiée d'un exemple, jamais versionnée) :

```bash
openssl rand -base64 48
```

Ce fichier est ignoré par Git : ne jamais le committer, ne jamais écrire de mot de passe réel dans le dépôt.
En alternative, tout ou partie de ces valeurs peut venir de variables d'environnement (`JWT_SECRET`,
`APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`), ce qui évite d'écrire un secret sur disque.

La durée de validité d'un jeton est définie par `jwt.expiration` (millisecondes) dans le fichier versionné
`application.properties` — une heure par défaut. Ce fichier a volontairement une priorité supérieure à
`application-local.properties` : c'est pourquoi `jwt.secret` n'y est **jamais** déclaré, afin qu'une valeur
de développement ne puisse pas écraser le vrai secret.

L'application **refuse de démarrer** si `jwt.secret` est absent ou fait moins de 32 octets (minimum HS256) :
cette validation est volontaire, pour qu'aucun environnement ne tourne avec une clé manquante ou trop courte.

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

> **Sécurité (Phase 3)** : l'API est authentifiée par JWT. Seules l'inscription, la connexion,
> la documentation OpenAPI et la consultation du catalogue (`GET /api/recoltes`, `GET /api/recoltes/{id}`,
> `GET /api/prix-marche`) sont publiques ; toutes les autres routes exigent un en-tête `Authorization: Bearer <jeton>`.
> Le chemin `GET /api/recoltes/mes-recoltes` est réservé au producteur authentifié, en dépit de sa ressemblance
> avec l'URL publique `GET /api/recoltes/{id}`.
> Les refus renvoient un JSON (`401` sans jeton valide, `403` sans les droits), jamais une page HTML.

### 4. Compte administrateur initial

Aucune migration Flyway ne contient de mot de passe : un compte ADMIN ne peut pas être obtenu depuis le
dépôt. Pour en amorcer un localement, renseigner `app.admin.email` et `app.admin.password`
(ou `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`) puis démarrer l'application : le compte est créé au premier
démarrage si aucun utilisateur ne porte déjà cet email, avec un mot de passe haché BCrypt. L'amorçage est
idempotent (un second démarrage ne recrée ni n'écrase rien) et n'affiche jamais le mot de passe dans les journaux.

Le mot de passe source ne doit **jamais** apparaître dans Git. L'inscription publique, elle, ne peut créer
que des comptes PRODUCTEUR ou ACHETEUR (enum `RoleInscription`), jamais ADMIN.

### 5. Lancer les tests

```bash
cd sunurecolte-backend
./mvnw test
```

Les tests d'intégration s'exécutent contre la base PostgreSQL locale (aucune base embarquée, aucun mock) :
PostgreSQL doit donc être démarré et `application-local.properties` configuré. Les données de test sont
annulées automatiquement (rollback).

### 6. Documentation API (Swagger)

Application démarrée :

- Interface Swagger UI : `http://localhost:8080/swagger-ui.html` (ou `http://localhost:8080/swagger-ui/index.html`)
- Spécification OpenAPI JSON : `http://localhost:8080/v3/api-docs`

Les endpoints protégés portent un cadenas : le bouton **Authorize** accepte un jeton JWT (`Bearer`)
obtenu via `POST /api/auth/connexion`, ce qui permet de tester l'API depuis Swagger UI.

### 7. Principales routes de l'API

Toutes les routes sont exposées sous `http://localhost:8080`. L'organisation suit le flux
`Controller → Service → Repository` ; la logique métier (stock, calculs, transitions de statut) est
appliquée côté serveur. Sauf mention « public », une route exige `Authorization: Bearer <jeton>`.

| Domaine | Méthode et route | Accès |
| --- | --- | --- |
| Authentification | `POST /api/auth/inscription` | Public — crée un compte PRODUCTEUR ou ACHETEUR et renvoie un jeton |
| Authentification | `POST /api/auth/connexion` | Public — renvoie un jeton (`{email, motDePasse}`) |
| Récoltes | `GET /api/recoltes` | Public — filtres optionnels `statut`, `filiere`, `recherche` |
| Récoltes | `GET /api/recoltes/{id}` | Public — détail d'une récolte |
| Récoltes | `GET /api/recoltes/mes-recoltes` | PRODUCTEUR uniquement — ses récoltes ; l'identité vient du jeton (aucun `producteurId` en entrée), filtres optionnels `statut`, `recherche`. `401` sans jeton, `403` pour ACHETEUR ou ADMIN |
| Récoltes | `POST /api/recoltes` | PRODUCTEUR (propriétaire) ou ADMIN |
| Récoltes | `PUT /api/recoltes/{id}` | Producteur propriétaire ou ADMIN |
| Récoltes | `DELETE /api/recoltes/{id}` | Producteur propriétaire ou ADMIN (refusée si la récolte est commandée) |
| Commandes | `GET /api/commandes` | Connecté — filtre optionnel `acheteurId`, restreint aux ressources accessibles |
| Commandes | `GET /api/commandes/{id}` | Acheteur propriétaire, producteur concerné ou ADMIN |
| Commandes | `POST /api/commandes` | ACHETEUR — total calculé serveur, stock décrémenté et contrôlé |
| Commandes | `PATCH /api/commandes/{id}/statut` | Acheteur propriétaire, producteur concerné ou ADMIN |
| Paiements | `GET /api/paiements/{id}` | Acheteur propriétaire ou ADMIN |
| Paiements | `GET /api/paiements/commande/{commandeId}` | Acheteur propriétaire ou ADMIN |
| Paiements | `POST /api/paiements` | ACHETEUR — paiement **simulé** (WAVE / ORANGE_MONEY, aucune transaction réelle) |
| Notifications | `GET /api/notifications` | Connecté — restreint à ses propres notifications (ADMIN : toutes) |
| Notifications | `GET /api/notifications/{id}` | Destinataire ou ADMIN |
| Notifications | `PUT /api/notifications/{id}/lue` | Destinataire ou ADMIN |
| Prix du marché | `GET /api/prix-marche` | Public |
| Prix du marché | `GET /api/prix-marche/{id}` | Public |
| Profils | `GET /api/utilisateurs/{id}` | Utilisateur concerné ou ADMIN (jamais de mot de passe) |
| Profils | `GET /api/producteurs/moi` | PRODUCTEUR uniquement — son propre profil ; l'identifiant vient du jeton (aucun `producteurId` en entrée). `401` sans jeton, `403` pour ACHETEUR ou ADMIN |
| Profils | `GET /api/acheteurs/moi` | ACHETEUR uniquement — son propre profil ; l'identifiant vient du jeton (aucun `acheteurId` en entrée). `401` sans jeton, `403` pour PRODUCTEUR ou ADMIN |
| Profils | `GET /api/producteurs/{id}` · `PUT /api/producteurs/{id}` | Producteur concerné ou ADMIN |
| Profils | `GET /api/acheteurs/{id}` | Acheteur concerné ou ADMIN |

En cas d'erreur, l'API renvoie un JSON du type `{"statut": 404, "message": "...", "timestamp": "..."}`
(ou `erreurs` par champ en cas d'échec de validation), sans jamais exposer de détails internes.

> Le paiement est une **simulation** pour le MVP : aucune transaction réelle n'est effectuée et aucune
> intégration Wave / Orange Money n'existe à ce stade.

### 8. Frontend Angular

Prérequis : Node.js (voir « Prérequis » ci-dessus) et npm. Le backend doit être démarré sur
`http://localhost:8080` (CORS restreint à `http://localhost:4200`).

```bash
cd frontend
npm install     # dépendances
npm start       # serveur de développement : http://localhost:4200
npm test        # tests unitaires (Vitest, sans navigateur)
npm run build   # build de production (frontend/dist/)
```

L'URL de l'API est centralisée dans `src/environments/` : `http://localhost:8080/api` en développement,
`/api` en production (reverse proxy). Aucun service n'écrit d'URL en dur.

> **Rappel** : le frontend n'est jamais l'autorité de sécurité. Les guards et l'intercepteur gèrent la
> navigation et l'expérience (redirection, purge locale) ; toute autorisation est rendue par l'API.

L'identité visuelle, les tokens de design et les règles d'interface font foi dans
[`FRONTEND_DESIGN.md`](./FRONTEND_DESIGN.md).

