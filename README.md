# SunuRecolte 🌾

Plateforme web de mise en relation directe entre producteurs agricoles et acheteurs dans la région de Dakar.
*Projet de fin d'études — Licence 3 Informatique.*

---

## 📌 Présentation

**SunuRecolte** facilite la commercialisation des produits agricoles locaux en éliminant les intermédiaires superflus. La plateforme permet :
- Aux **producteurs** de publier leurs récoltes disponibles, de gérer leurs stocks et de suivre leurs commandes.
- Aux **acheteurs** (commerçants, restaurateurs, particuliers) de parcourir le catalogue, filtrer les récoltes, commander (retrait ou livraison) et enregistrer un paiement **simulé** (Wave ou Orange Money, sans transaction réelle).
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
- **Paiement** : **simulation** uniquement (`POST /api/paiements` enregistré `REUSSI` sous référence `SIMU-…`) — aucun prestataire joint, aucun débit réel. Détail dans les notes du §7.

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
7. `Paiement` : référence, montant, moyen (`WAVE`, `ORANGE_MONEY`), statut (`EN_ATTENTE`, `REUSSI`, `ECHOUE`, `ANNULE`, `REMBOURSE`).
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

> **Limitation des tentatives de connexion** : cinq tentatives sans succès pour un même couple
> (email normalisé — trimé puis mis en minuscules — et adresse du client telle que le serveur la voit)
> dans une fenêtre de quinze minutes arment un blocage de quinze minutes sur ce couple ; la tentative
> suivante est refusée par un `429` (`Trop de tentatives de connexion. Réessayez dans quelques
> minutes.`) accompagné d'un en-tête `Retry-After` portant les secondes restantes. Le comptage passe
> **avant** toute comparaison de mot de passe, un email inconnu est compté exactement comme un email
> connu, et une connexion réussie efface l'historique du couple. **Avec ses limites** : le compteur est
> un objet **en mémoire** dans une seule instance du serveur — plusieurs instances derrière un même
> équilibreur comptent chacune de leur côté et un redémarrage remet tout à zéro ; derrière un proxy
> inverse, sans résolution d'en-têtes de confiance (`server.forward-headers-strategy=FRAMEWORK` avec un
> proxy déclaré), toutes les requêtes portent l'adresse du proxy et le blocage frapperait tous les
> clients à la fois ; aucun crédit n'est accordé à `X-Forwarded-For`, qu'un client peut forger.

### 4. Compte administrateur initial

Aucune migration Flyway ne contient de mot de passe : un compte ADMIN ne peut pas être obtenu depuis le
dépôt. L'inscription publique, elle, ne peut créer que des comptes PRODUCTEUR ou ACHETEUR (enum
`RoleInscription`), jamais ADMIN. **Sans amorçage, aucune route d'administration n'est atteignable** : ni
`GET /api/utilisateurs`, ni l'écran `/admin` du frontend.

Procédure locale :

1. Choisir une adresse et un mot de passe **locaux** : l'amorçage refuse un mot de passe de moins de
   6 caractères (`AdminInitializer`), mais retenez-en au moins 8 — c'est le minimum exigé à
   l'inscription publique (`@Size(min = 8)` dans `InscriptionRequest`). La connexion, elle, n'impose
   **aucune** longueur : un compte créé plus tôt avec 6 ou 7 caractères reste accessible, la règle
   nouvelle n'étant pas rétroactive ;
2. Les fournir **soit** en variables d'environnement avant de lancer l'API :

   ```bash
   # Git Bash / Linux / macOS
   export APP_ADMIN_EMAIL="adresse@exemple.sn"
   export APP_ADMIN_PASSWORD="mot_de_passe_local"
   ./mvnw spring-boot:run
   ```

   ```powershell
   # Windows PowerShell
   $env:APP_ADMIN_EMAIL = "adresse@exemple.sn"
   $env:APP_ADMIN_PASSWORD = "mot_de_passe_local"
   .\mvnw.cmd spring-boot:run
   ```

   **soit** dans `src/main/resources/application-local.properties` (`app.admin.email`,
   `app.admin.password`, et éventuellement `app.admin.telephone`, hors Git) ;
3. Démarrer l'API : l'amorçage crée le compte au premier démarrage si aucun utilisateur ne porte déjà cet email,
   avec un mot de passe haché BCrypt par le même encodeur que l'inscription.

L'opération est **idempotente** (un second démarrage ne recrée ni n'écrase rien), **silencieuse** (le mot de passe
n'apparaît jamais dans les journaux) et **facultative par construction** : sans email ou sans mot de passe fourni,
l'application démarre normalement en signalant simplement que le compte ADMIN n'a pas été amorcé ; un mot de passe
trop court est refusé de la même façon. L'adresse est normalisée en minuscules, le nom porté par le compte amorce
est « SunuRecolte Administrateur ».

Le mot de passe source ne doit **jamais** apparaître dans Git, dans un journal, dans une capture d'écran de QA ni
dans un fichier de test.

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
| Commandes | `GET /api/commandes` | Connecté — filtre optionnel `acheteurId`, restreint aux ressources accessibles. La réponse `CommandeResponse` porte `statutPaiement` et `moyenPaiement` (`null` et `null` si aucun paiement n'est enregistré), chargés en une seule requête pour toute la liste |
| Commandes | `GET /api/commandes/{id}` | Acheteur propriétaire, producteur concerné ou ADMIN — réponse portant les mêmes `statutPaiement` et `moyenPaiement` |
| Commandes | `POST /api/commandes` | ACHETEUR — total calculé serveur, stock décrémenté et contrôlé |
| Commandes | `PATCH /api/commandes/{id}/statut` | Acheteur propriétaire, producteur concerné ou ADMIN — l'ADMIN **ne contourne aucune transition métier** : mêmes bornes `TRANSITIONS_AUTORISEES`, mêmes refus `400` (« Transition de statut interdite : … », « La commande est déjà au statut … ») ; `LIVRAISON` : paiement `REUSSI` requis (note) |
| Paiements | `GET /api/paiements/{id}` | Droits de la commande — acheteur propriétaire, producteur concerné ou ADMIN |
| Paiements | `GET /api/paiements/commande/{commandeId}` | Droits de la commande ; `404` (« Aucun paiement n'existe pour la commande : … ») si aucun paiement n'est enregistré |
| Paiements | `POST /api/paiements` | Acheteur propriétaire ou ADMIN — paiement **simulé** : `REUSSI` posé à l'enregistrement, référence `SIMU-…`, montant repris du total serveur, aucune transaction réelle ; `400` si `ANNULEE`, déjà `LIVREE` ou déjà payé ; notifie les producteurs (cf. note) |
| Notifications | `GET /api/notifications` | Connecté — restreint à ses propres notifications (ADMIN : toutes) |
| Notifications | `GET /api/notifications/{id}` | Destinataire ou ADMIN |
| Notifications | `PUT /api/notifications/{id}/lue` | Destinataire ou ADMIN |
| Prix du marché | `GET /api/prix-marche` | Public |
| Prix du marché | `GET /api/prix-marche/{id}` | Public |
| Profils | `GET /api/utilisateurs/{id}` | Utilisateur concerné ou ADMIN (jamais de mot de passe) |
| Profils | `GET /api/producteurs/moi` | PRODUCTEUR uniquement — son propre profil ; l'identifiant vient du jeton (aucun `producteurId` en entrée). `401` sans jeton, `403` pour ACHETEUR ou ADMIN |
| Profils | `GET /api/acheteurs/moi` | ACHETEUR uniquement — son propre profil ; l'identifiant vient du jeton (aucun `acheteurId` en entrée). `401` sans jeton, `403` pour PRODUCTEUR ou ADMIN |
| Profils | `PUT /api/producteurs/moi` | PRODUCTEUR uniquement — mise à jour complète de son profil (prénom, nom, email, téléphone, localisation, filière, description) ; cible déduite du jeton, `403` pour ACHETEUR ou ADMIN, `400` si l'email est déjà pris |
| Profils | `GET /api/producteurs/{id}` · `PUT /api/producteurs/{id}` | Producteur concerné ou ADMIN — le `PUT` n'écrit que les trois colonnes d'exploitation |
| Profils | `GET /api/acheteurs/{id}` | Acheteur concerné ou ADMIN |
| Statistiques | `GET /api/producteurs/moi/statistiques` | **PRODUCTEUR uniquement** — ses statistiques de vente (chiffre d'affaires, panier moyen, taux d'annulation, répartition par statut, ventes par jour, top 5 des récoltes, stock faible, commandes à traiter) ; paramètre `periode` = `7j`, `30j` (défaut) ou `mois`, une autre valeur répond `400`. Le producteur est déduit du jeton : **aucun `producteurId` en entrée**, un identifiant passé en paramètre est ignoré. `401` sans jeton, `403` pour ACHETEUR ou ADMIN. Les sommes portent sur les **lignes de commande** du producteur (une commande peut mélanger plusieurs producteurs), commandes annulées exclues des sommes et comptées dans le taux ; deux limites assumées : les `EN_ATTENTE` sont incluses dans le chiffre d'affaires et le seuil de stock faible (5) est le même quelle que soit l'unité |
| Administration | `GET /api/admin/statistiques` | **ADMIN uniquement** — **première route du préfixe `/api/admin`** : compteurs de la plateforme (comptes, producteurs, acheteurs, récoltes au statut `DISPONIBLE`), volume d'affaires et nombre de commandes de la période, inscriptions par semaine civile, répartitions par filière / par zone / par moyen de paiement, deux top 5. Paramètre `periode` = `7j`, `30j` (défaut) ou `mois`, une autre valeur répond `400`. `401` sans jeton, `403` pour PRODUCTEUR ou ACHETEUR, vérifié aussi dans le service. Les sommes suivent la règle de `GET /api/producteurs/moi/statistiques` : lignes de commande, annulées exclues du volume et comprises dans le nombre. Trois limites assumées : la **zone** vient du champ libre `localisation_exploitation` (orthographe normalisée, 8 zones au plus, le reste sous « Autres zones », non renseignées omises) ; le total des **comptes exclut ADMIN** ; et l'enum `MoyenPaiement` ne comptant que `WAVE` et `ORANGE_MONEY`, il n'existe **aucune** ligne « autre moyen ». La réponse ne porte ni email, téléphone, mot de passe ni jeton |
| Administration | `GET /api/utilisateurs` | **ADMIN uniquement** — tous les comptes, ou filtrés par `role` ; réponse triée par le serveur (`dateCreation DESC`, puis `id DESC`), portée par `UtilisateurResponse` : jamais de mot de passe ni de hash. `401` sans jeton, `403` pour ACHETEUR ou PRODUCTEUR |
| Administration | `PATCH /api/utilisateurs/{id}/actif` | **ADMIN uniquement** — corps `{"actif": true|false}` ; un administrateur ne peut pas modifier son propre compte (`400`) ; `404` si le compte n'existe pas. Un compte désactivé voit son **jeton existant refusé (`401`) dès la requête suivante**, l'état étant relu en base à chaque requête |
| Administration | `PATCH /api/recoltes/{id}/statut` | **ADMIN uniquement** — modération du statut d'une récolte entre les deux seules valeurs du domaine (`DISPONIBLE`, `EPUISEE`) ; DTO séparé `StatutRecolteRequest`, `RecolteRequest` ne portant jamais de statut |
| Administration | `POST /api/prix-marche` · `PUT /api/prix-marche/{id}` · `DELETE /api/prix-marche/{id}` | **ADMIN uniquement** — écriture des prix indicatifs ; les deux routes de lecture `GET` restent publiques |

En cas d'erreur, l'API renvoie un JSON du type `{"statut": 404, "message": "...", "timestamp": "..."}`
(ou `erreurs` par champ en cas d'échec de validation), sans jamais exposer de détails internes.

> **Paiement simulé — ce qui l'est, ce qui ne l'est pas.**
> - **Simulé : l'aboutissement du paiement.** `POST /api/paiements` écrit `REUSSI`, une date de confirmation
>   horodatée par l'application et une référence `SIMU-<uuid>`. La réussite fait partie de la simulation : elle
>   n'est le retour d'aucun opérateur.
> - **Réel : tout le reste.** Le montant est repris du total calculé par le serveur, un paiement reste unique
>   par commande (contrainte `uq_paiements_commande`, même pour deux envois simultanés) sous le message `400`
>   « Un paiement existe déjà pour cette commande. », les droits d'accès sont ceux de la commande, les
>   notifications sont réellement créées, et la règle de livraison décrite ci-dessous est réellement appliquée.
> - **Règle de livraison.** Une commande en `LIVRAISON` ne peut être ni confirmée ni marquée prête sans un
>   paiement au statut `REUSSI` ; le refus est un `400` dont le message vient du serveur, au mot près :
>   « Une commande en livraison doit être payée avant d'être confirmée. » (cible `CONFIRMEE`) et
>   « Une commande en livraison doit être payée avant d'être marquée prête. » (cible `PRETE`). La règle ne
>   s'applique pas au `RETRAIT` et vaut pour tous les rôles, administrateur compris.
> - **Remboursement simulé.** Annuler une commande rend d'abord les quantités au stock, puis solde son
>   paiement : `REUSSI` devient `REMBOURSE`, un paiement encore `EN_ATTENTE` devient `ANNULE`. Aucun
>   remboursement ne transite réellement.
> - **Ce qui n'existe pas.** Aucun appel à Wave ou Orange Money, aucun débit, aucun encaissement, aucun
>   remboursement effectif ; `ECHOUE` n'est écrit par aucun chemin de l'API. Une intégration réelle à un
>   prestataire n'est ni en cours ni promise ici : elle demanderait une configuration et des tests réels.

### 7.1 Capacités de l'ADMIN

Les routes d'administration ci-dessus sont les **premières du projet réservées à un seul rôle** ; l'ADMIN était
jusque-là un rôle de secours en écriture sur les ressources d'autrui (récoltes, commandes, paiements,
notifications).

**Ce qu'un ADMIN peut faire** : lister les comptes (avec le filtre facultatif `?role=`), activer ou désactiver
un compte, modérer le statut d'une récolte entre `DISPONIBLE` et `EPUISEE`, créer / modifier / supprimer un prix
indicatif, et rester partie prenante sur les récoltes, commandes, paiements et notifications d'autrui.

**Ce qu'aucun ADMIN ne peut faire** :

- **contourner une transition de statut de commande** — `PATCH /api/commandes/{id}/statut` applique exactement les
  mêmes bornes `TRANSITIONS_AUTORISEES` qu'à un acheteur ou un producteur, et refuse une transition interdite ou un
  statut déjà atteint par un `400` ;
- **se désactiver lui-même** — la seule auto-modification refusée (`400`), pour ne pas fermer la porte à la
  dernière administration disponible ;
- **lire un mot de passe** — ni en clair ni haché : `UtilisateurResponse` ne porte que l'identité de contact, le
  rôle, la date de création et l'état `actif` ;
- **se créer un pair** — l'inscription publique ne sait produire que `PRODUCTEUR` ou `ACHETEUR` (enum
  `RoleInscription`), `ADMIN` étant impossible par construction ;
- **redéfinir le contenu d'un compte ou d'une récolte d'autrui depuis l'écran d'administration** — aucune route
  d'API ne le permet, donc aucun écran ne le propose : la liste des comptes n'a qu'une action, et la modération
  des récoltes aussi.

L'effet d'une désactivation est vérifié côté serveur : le rôle et l'état étant relus en base à chaque requête,
le **jeton déjà émis** d'un compte désactivé produit un `401` sur la requête suivante (test backend
`unJetonDunCompteDesactiveRepond401`).

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

Écrans protégés par rôle (règle : `authGuard` puis `roleGuard`, `data.roles`, chargement paresseux) :

- **tous connectés** : `/tableau-de-bord`, `/notifications` (écran transversal, `authGuard` seul — les trois
  rôles y accèdent) ;
- **PRODUCTEUR** : `/producteur/recoltes` (liste et suppression), `/producteur/recoltes/nouvelle`,
  `/producteur/recoltes/:id/modifier`, `/producteur/commandes` (commandes reçues et statuts),
  `/producteur/profil` ;
- **ACHETEUR** : `/acheteur/panier`, `/acheteur/commande` (tunnel), `/acheteur/commandes` et
  `/acheteur/commandes/:id` (consultation, annulation), `/acheteur/paiement/:id` ;
- **ADMIN** : `/admin` (trois entrées, aucun chiffre ni graphique : le backend n'expose aucun endpoint de
  comptage), `/admin/utilisateurs`, `/admin/recoltes`, `/admin/prix-marche`. La protection de ces quatre routes
  est vérifiée sur la table de routes réelle par `src/app/routes-admin.spec.ts`. Règles et états de ces écrans :
  `FRONTEND_DESIGN.md` §37.

L'identité visuelle, les tokens de design et les règles d'interface font foi dans
[`FRONTEND_DESIGN.md`](./FRONTEND_DESIGN.md).

### 9. Données de démonstration (profil `demo`)

`DemoDataInitializer` (`src/main/java/com/sunurecolte/config/`) remplit une base locale **vide** : de
quoi parcourir les écrans et préparer les captures du mémoire — **3 producteurs**, **6 acheteurs**,
**20 récoltes** et **60 commandes étalées sur les 60 derniers jours**. Comptes, récoltes et paiements
sont reculés avec leurs commandes : le jeu a un historique, pas seulement une date du jour.

> **Avertissement — ne jamais lancer le profil `demo` sur une base contenant des données réelles.** Le
> jeu passe par les services réels et écrit commandes, paiements et notifications comme s'ils étaient
> réels : rien ne le distingue ni ne le nettoie, sinon une recréation de base. Il vise donc une base
> dédiée, `sunurecolte_demo`, **jamais** la base `sunurecolte` des tests d'intégration et du
> développement courant.

```powershell
# Windows PowerShell — base de démonstration dédiée
cd sunurecolte-backend
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/sunurecolte_demo"
$env:SPRING_PROFILES_ACTIVE = "demo"
$env:APP_DEMO_MOT_DE_PASSE = "un_mot_de_passe_local_d_au_moins_8_caracteres"
$env:APP_ADMIN_EMAIL = "admin.demo@sunurecolte.sn"
$env:APP_ADMIN_PASSWORD = "un_mot_de_passe_admin_d_au_moins_6_caracteres"
.\mvnw.cmd spring-boot:run
```

```bash
# Git Bash / Linux / macOS
cd sunurecolte-backend
SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/sunurecolte_demo" \
SPRING_PROFILES_ACTIVE="demo" \
APP_DEMO_MOT_DE_PASSE="un_mot_de_passe_local_d_au_moins_8_caracteres" \
APP_ADMIN_EMAIL="admin.demo@sunurecolte.sn" \
APP_ADMIN_PASSWORD="un_mot_de_passe_admin_d_au_moins_6_caracteres" \
  ./mvnw spring-boot:run
```

`SPRING_DATASOURCE_URL` prend le pas sur l'URL d'`application-local.properties` ; le mot de passe
PostgreSQL continue de venir de ce fichier hors Git. Le profil peut aussi se passer de la variable
d'environnement, et le mot de passe de démonstration de la ligne `app.demo.mot-de-passe`
d'`application-local.properties`. Cette valeur sert aussi à **se connecter** aux comptes de
démonstration : elle doit faire au moins 8 caractères, comme à l'inscription publique.

**Comptes créés** (tous avec le mot de passe fourni — le profil `demo` ne crée **aucun** ADMIN : le
compte administrateur vient de l'amorçage du §4, d'où `APP_ADMIN_EMAIL` et `APP_ADMIN_PASSWORD`
ci-dessus) :

- `producteur1.demo@sunurecolte.sn`, `producteur2.demo@sunurecolte.sn`, `producteur3.demo@sunurecolte.sn`
  — maraîchère, élevage, et une exploitation céréalière et fruitière ;
- `acheteur1.demo@sunurecolte.sn` à `acheteur6.demo@sunurecolte.sn` — deux commerçants, deux
  restaurateurs, deux particuliers.

**Ce que contient le jeu** : 8 + 4 + 8 récoltes selon le producteur, avec un prix unitaire, des
quantités min/max et une unité réalistes (kg, botte, tête, plateau, litre) et des stocks de départ
larges — de 12 à 300 selon le produit ; `EN_ATTENTE` (10), `CONFIRMEE` (12), `PRETE` (8), `LIVREE` (22)
et `ANNULEE` (8) parmi les commandes ; les trois premières commandes mélangent deux producteurs ; les
paiements portent `WAVE` et `ORANGE_MONEY`, **simulés** sous référence `SIMU-…` comme partout dans le
projet ; `imageUrl` est vide, donc le catalogue rend son état « sans image ».

**Dates étalées** : les dates de commande viennent d'une **graine fixe** — deux bases vides obtiennent
les mêmes commandes, les mêmes quantités et les mêmes statuts —, puis une passe finale recule les
comptes, les récoltes et les paiements avec leurs commandes, dans leur **propre graine** pour ne
décaler aucun tirage du catalogue. Sur le jeu produit (invariants verrouillés par
`DemoDataInitializerTest`, effectifs relevés le 2026-10-09) :
neuf comptes sur **vingt-neuf jours civils d'amplitude**, le plus ancien soixante-deux jours avant le
lancement et jamais au-delà de soixante-trois ; chaque compte au moins **trois jours civils avant** la
plus ancienne commande qu'il rend possible ; vingt récoltes publiées entre le compte de leur producteur
et leur première vente, `date_disponibilite` posée sur ce même jour ; trente-sept paiements à **une
heure** après leur commande et confirmés douze minutes plus tard ; rien dans le futur. La passe écrit en
SQL (`JdbcTemplate`) après un `flush()` des dépôts, et les colonnes de date restent figées après
insertion : `commandes.date_creation` a retrouvé `updatable = false`, le générateur ne passant plus par
le setter. Une seconde exécution ne déplace aucune date.

**Deux mécanismes rendent l'écran statistiques lisible** sans toucher aux règles métier : une récolte ne
peut céder en ventes libres que **45 % de son stock initial** (les `ANNULEE` en sont dispensées, puisque
l'annulation rend la quantité au stock), et les huit `ANNULEE` sont **planifiées** — quatre dans la
fenêtre des trente derniers jours, au moins une chez chaque producteur, les quatre autres franchement
dehors. Une annulation sur deux (par rang pair) laisse un paiement `REMBOURSE` derrière elle, soit
**quatre** dans le jeu, les quatre autres étant annulées avant tout paiement. Valeurs mesurées sur le jeu :
**au plus deux récoltes par producteur** `EPUISEE` ou sous le seuil d'alerte de stock faible (Piment fort
`EPUISEE`, Salade 3,5 bottes, Mangue 4 kg) et **11,11 %** de taux d'annulation pour le premier
producteur sur la fenêtre de trente jours. Ces chiffres sont verrouillés par `DemoDataInitializerTest`.

**Trois garde-fous** : rien ne s'exécute tant que le profil `demo` n'est pas explicitement activé ;
`demo` et `prod` actifs ensemble sont **refusés au démarrage**, même si aucun
`application-prod.properties` n'existe encore ; sans mot de passe fourni (ou trop court), le démarrage
est refusé — aucune valeur par défaut n'est versionnée, donc aucune n'est inventée. Aucune migration
Flyway, aucun `data.sql` : le schéma reste la seule autorité, et le jeu de données passe par les
services réels avec leurs règles métier.

**Idempotence et remise à zéro** : si `producteur1.demo@sunurecolte.sn` existe déjà, un redémarrage ne
crée rien, ne supprime rien et journalise une ligne INFO. Repartir d'une base vide se fait donc en
recréant **la base de démonstration** — **opération destructive, qui efface aussi les saisies faites
dans cette base, et qui ne concerne jamais `sunurecolte`** :

```powershell
# Windows PowerShell
psql -U postgres -c "DROP DATABASE sunurecolte_demo;"
psql -U postgres -c "CREATE DATABASE sunurecolte_demo;"
```

Les migrations Flyway se réappliquent au démarrage suivant.

**Limites consignées** (détail dans `TASKS.md`, lots DEMO-1 et DEMO-2) : `notifications.date_creation`
garde l'horodatage de génération — la table ne porte aucune référence à la commande annoncée, seulement
un destinataire, et la rattacher serait une invention ; **aucun des neuf comptes ne tombe dans la fenêtre
des trente derniers jours** (mesuré : zéro sur neuf), donc le graphique « inscriptions par semaine » de
l'administration rend des semaines à zéro sur ce jeu, tandis que les historiques de ventes sont bien
nourris (vingt-neuf commandes sur soixante en fenêtre) ; la règle de cohérence **prime sur la bande de
tirage**, d'où l'ordre « producteurs avant acheteurs » **non tenu** — cinq des six acheteurs sont plus
anciens que le second producteur, et le compte le plus ancien du jeu est un acheteur ; les statuts de
paiement que les services ne savent pas écrire (`EN_ATTENTE`, `ECHOUE`, `ANNULE`) ne sont pas simulés par
une écriture directe, d'où `REUSSI` et `REMBOURSE` seulement ; un compte de démonstration porte le mot de
passe commun de la variable ; et la génération elle-même n'a pas encore été observée dans un navigateur
réel.

