# SUNURECOLTE — Plan de développement

Une tâche n'est cochée que lorsqu'elle est réellement terminée et testée.

## Phase 0 — Préparation
- [x] Dépôt Git
- [x] README.md
- [x] CLAUDE.md
- [x] CONTEXTE.md
- [x] TASKS.md
- [x] ARCHITECTURE.md
- [x] REGLES_DEVELOPPEMENT.md
- [x] .gitignore
- [x] Vérifier Java 17
- [x] Vérifier Maven
- [x] Vérifier PostgreSQL

## Phase 1 — Backend
- [x] Initialiser Spring Boot
- [x] Configurer Java 17
- [x] Configurer PostgreSQL
- [x] Configurer JPA/Hibernate
- [x] Créer enums
- [x] Créer les 9 entités
- [x] Créer repositories
- [x] Vérifier relations JPA
- [x] Flyway : migration V1 du schéma (ddl-auto=validate)
- [x] Tests du socle : démarrage Spring, schéma, mapping JPA
- [x] Maven Wrapper (mvnw, mvnw.cmd)

## Phase 2 — API
- [x] DTO (réutilisés ; ajout de AcheteurResponse, PaiementResponse, NotificationResponse, PrixMarcheResponse, StatutCommandeRequest)
- [x] Validation (`@Valid` + Jakarta Bean Validation sur les DTO d'entrée)
- [x] @ControllerAdvice (GlobalExceptionHandler : 400, 403, 404, 405, 415, 500)
- [x] Codes HTTP cohérents (200, 201, 204, 400, 404, 405, 415)
- [x] Swagger/OpenAPI (titre, description, version ; `/swagger-ui.html` et `/v3/api-docs`)
- [x] API récoltes : GET liste (filtres statut, filière, recherche), GET par id, POST, PUT, DELETE
- [x] API profils : GET utilisateur, GET/PUT producteur, GET acheteur
- [x] API commandes : GET liste (filtre acheteur), GET par id, POST (total calculé serveur, stock contrôlé), PATCH statut
- [x] API paiements : GET par id, GET par commande, POST (paiement simulé, aucune transaction réelle)
- [x] API notifications : GET liste (filtre utilisateur), GET par id, PUT marquage comme lue
- [x] API prix du marché : GET liste, GET par id
- [x] Contrôle du stock et verrou pessimiste à la création de commande (jamais de stock négatif)
- [x] Transitions de statut contrôlées en service (EN_ATTENTE → CONFIRMEE → PRETE → LIVREE ; ANNULEE terminale)
- [x] Tests Phase 2 : services métier + API MockMvc (codes HTTP, contrat d'erreur, documentation OpenAPI)

## Phase 3 — Auth
- [x] Inscription (`POST /api/auth/inscription`, jeton JWT renvoyé immédiatement)
- [x] Inscription : rôle restreint par construction (ADMIN impossible)
- [x] Connexion (`POST /api/auth/connexion`, email ou mot de passe erroné → 401 générique)
- [x] Hash mots de passe (BCrypt, jamais de mot de passe en clair ni dans les réponses)
- [x] JWT (JJWT 0.12, HS256, secret hors Git validé au démarrage, expiration configurable)
- [x] SecurityFilterChain (stateless, routes publiques limitées, 401/403 en JSON)
- [x] Autorisation par rôle (PRODUCTEUR, ACHETEUR, ADMIN transverse)
- [x] Contrôle de propriété des ressources (403, identité issue du JWT)
- [x] CORS (`http://localhost:4200`, sans credentials)
- [x] Compte ADMIN initial (`AdminInitializer`, aucun secret dans Git)
- [x] Swagger : schéma `bearerAuth` (bouton Authorize)
- [x] Tests auth (inscription, connexion, 401/403, jetons forgés/expirés, CORS, amorçage ADMIN)

## Phase 4 — Producteur
- [ ] Profil
- [ ] CRUD récoltes
- [ ] Contrôle propriétaire
- [ ] Stock
- [ ] Consultation commandes
- [ ] Statuts commandes

## Phase 5 — Acheteur
- [ ] Catalogue
- [ ] Recherche/filtres
- [ ] Détail
- [ ] Panier
- [ ] Commande
- [ ] Retrait/livraison
- [ ] Historique

## Phase 6 — Paiement
- [ ] Entité/service paiement
- [ ] Simulation
- [ ] Confirmation
- [ ] Succès/échec
- [ ] Préparation Wave
- [ ] Wave si accès disponible
- [ ] Orange Money si accès disponible

## Phase 7 — Notifications
- [ ] Création
- [ ] Liste
- [ ] Marquer comme lue
- [ ] Notifications commande
- [ ] Notifications paiement

> **Divergence signalée (5.5.9), cases laissées en l'état** : cette phase est décrite comme entièrement à
> faire, alors que son périmètre backend est **déjà partiellement livré** depuis les Phases 2 et 3, sans que
> rien ici l'ait enregistré. Réel état du backend : `Notification` + repository + service + controller
> existent, les trois endpoints `GET /api/notifications`, `GET /api/notifications/{id}` et
> `PUT /api/notifications/{id}/lue` sont implémentés et testés (`NotificationApiTest`, `SecuriteApiTest`),
> et la **création automatique** est en place dans `CommandeService` — une notification
> « Nouvelle commande » à chaque producteur distinct à la création d'une commande, une notification
> « Suivi de commande » à l'acheteur à chaque changement de statut. « Liste » et « Marquer comme lue » sont
> donc livrés côté API, et « Notifications commande » aussi.
>
> **Ce qui manquait réellement à la rédaction de cette note** : « Notifications paiement » — `PaiementService`
> n'importait aucune notification et aucune notification de paiement n'existait dans le projet ; l'espace
> producteur n'offrait aucune action sur les statuts. Ces deux points sont **désormais livrés** : la
> notification de paiement en **5.7**, les actions de statut du producteur en **5.6** (écran
> `/producteur/commandes`). Le mot « uniquement » de la phrase ci-dessus désignait donc `CommandeService`
> avant 5.7 ; il n'a pas été conservé pour ne pas affirmer le contraire de la réalité.
> Une pagination et un endpoint de comptage des non-lues n'existent toujours pas.
>
> **L'interface frontend de ces notifications a été réalisée dans la sous-phase 5.5.9**, pas ici : un écran
> transversal `/notifications` et son compteur d'en-tête, qui n'utilisent que deux des trois endpoints.
> Ces cases ne sont pas cochées : leur statut historique (périmètre backend, déjà testé mais jamais validé
> dans cette liste) demande une décision de l'auteur du projet, comme pour « Phase 4 » et « Phase 5 ».

## Phase 8 — Admin

> **Décadrage de la sous-phase 5.9** : l'espace administrateur livré ne contient **ni tableau de bord analytique,
> ni graphique, ni statistique**. Le backend n'expose aucun endpoint de comptage ou d'agrégation, et afficher un
> nombre que personne ne calcule serait du faux contenu (`FRONTEND_DESIGN.md` §17 et §37). Les deux cases
> « Dashboard » et « Statistiques » décrivent un périmètre qui n'a pas été retenu : elles restent décochées.

- [ ] Dashboard — **non retenu** (aucune donnée agrégée n'existe dans le modèle approuvé)
- [x] Utilisateurs — `GET /api/utilisateurs` (liste, filtre `role`) et `PATCH /api/utilisateurs/{id}/actif`,
  écran `/admin/utilisateurs` avec modale de confirmation (5.9)
- [x] Modération récoltes — `PATCH /api/recoltes/{id}/statut` entre les deux statuts du domaine,
  écran `/admin/recoltes` (5.9)
- [x] Prix indicatifs — `POST`, `PUT` et `DELETE /api/prix-marche` côté API, écran `/admin/prix-marche`
  pour les quatre opérations du contrat, lecture publique préservée (5.9)
- [ ] Statistiques — **non retenu**, même motif que « Dashboard »

> Cases cochées sur la foi des **tests réellement exécutés** (intégration backend PostgreSQL, unitaires frontend).
> La **QA navigateur** de ces trois écrans reste à valider (5.9).

## Phase 9 — Angular
- [x] Initialiser Angular
- [x] Identité visuelle et design system (`FRONTEND_DESIGN.md`, logo, favicon, tokens SCSS)
- [x] Structure features (`core/`, `partage/`, `features/`, styles globaux)
- [x] Services API (`AuthService`, `RecolteService`, `UtilisateurService` ; URL centralisée)
- [x] Auth (inscription, connexion, déconnexion, jeton en `localStorage`)
- [x] Intercepteur JWT (Bearer, 401 → purge et redirection, 403 non transformé)
- [x] Guards (`authGuard` puis `roleGuard`)
- [x] Auth UI (connexion, inscription, tableau de bord, pages d'erreur)
- [x] Producteur UI (gestion des récoltes faite — voir 5.4 ; commandes reçues faites — voir 5.6 ; profil fait
  — voir 5.8 et 5.8-bis, QA navigateur réelle de ce dernier écran faite en 5.8-bis)
- [x] Acheteur UI (panier, tunnel de commande, consultation, annulation, paiement simulé et notifications —
  voir 5.5.1 → 5.5.9)
- [x] Catalogue (page publique `/recoltes` + détail `/recoltes/:id` — voir 5.3)
- [x] Admin UI (5.9 : `/admin`, `/admin/utilisateurs`, `/admin/recoltes`, `/admin/prix-marche` — quatre routes
  réservées à `ADMIN` ; **QA navigateur à faire**, largeurs 375/768/1024/1366 non émules dans cet environnement)
- [x] Panier (5.5.3 et 5.5.5 : `PanierService` local + page `/acheteur/panier`)
- [x] Commandes (passer : 5.5.6 ; consulter et annuler : 5.5.7 ; mise à jour des statuts côté producteur :
  5.6 — `EN_ATTENTE → CONFIRMEE → PRETE → LIVREE` via `PATCH /api/commandes/{id}/statut`)
- [x] Paiement **simulé** (5.5.8 : `/acheteur/paiement/:id` et `POST /api/paiements`, référence `SIMU-…` ;
  aucun paiement réel n'existe dans le projet. **Corrigé le 2026-10-04** : cette ligne affirmait que « le
  serveur n'écrit que `EN_ATTENTE` », ce que le LOT P1 a rendu faux — l'enregistrement d'une simulation pose
  `REUSSI`, et une annulation solde ce paiement en `REMBOURSE` ; voir la section « Lots paiement P1 → P2d »)
- [x] Notifications (5.5.9 : écran transversal `/notifications` et compteur d'en-tête, QA navigateur réelle faite ;
  les cases **backend** de la Phase 7 restent en attente d'une décision de l'auteur, voir la note de cette phase)
- [ ] Responsive (vérifié écran par écran au fil des pages métier)
  - la vérification en **navigateur réel** aux quatre largeurs 375 / 768 / 1024 / 1366 n'a **jamais** été jouée :
    les clôtures de 5.5.7, 5.5.8, 5.5.9 et 5.8-bis, comme la ligne « Admin UI » de la Phase 9, consignent
    l'absence d'émulation de viewport dans cet environnement, et les deux campagnes de design (§38.5) n'ont pas
    été davantage vues en rendu. Voir l'entrée ouverte « QA navigateur réelle des quatre largeurs
    375 / 768 / 1024 / 1366 » de « Reste à faire à la fin de la campagne » (case **laissée décochée** —
    corrigé le 2026-10-02)

## Sous-phases 5.2 → 5.9-bis (détail réel)

> **Avertissement de numérotation** : « 5.2 », « 5.3 », « 5.4 », « 5.5 », « 5.6 », « 5.7 », « 5.8 »,
> « 5.9 » et « 5.9-bis » sont les repères des consignes de travail, pas les phases de ce fichier. Les cinq
> premiers et les deux derniers
> portent sur le frontend Angular (Phase 9) et n'ont aucun rapport avec la « Phase 5 — Acheteur » ni avec la
> « Phase 4 — Producteur » décrites plus haut. **5.7 fait exception : elle est purement backend** (Phase 7 —
> Notifications), sans aucune ligne de frontend modifiée. **5.9 est les deux à la fois** : backend (Phase 8 —
> Admin) puis frontend, dans cet ordre imposé.
>
> **Contradiction signalée, non résolue ici** : les listes « Phase 4 — Producteur » et « Phase 5 —
> Acheteur » restent non cochées alors que les endpoints backend correspondants existent depuis les
> Phases 2 et 3 (récoltes, commandes, paiements, notifications, prix de marché, contrôles de propriété).
> Ces cases concernent le périmètre backend, hors du champ de cette mise à jour ; elles demandent une
> décision de l'auteur du projet (les cocher, ou les réécrire comme « suite de la Phase 2 »).

### 5.2 — Frontend « données récoltes »
- [x] Alignement de `RecolteResponse` sur le DTO Java réel (nullabilité de `description`, `quantiteMin`,
  `quantiteMax`, `imageUrl`, `localisation`, `dateDisponibilite`)
- [x] Création de `RecolteRequest` (les 12 champs du contrat, **sans `statut`** : `EPUISEE` reste dérivé
  du stock par le serveur)
- [x] Création de `ProducteurResponse` (modèle unique, réutilisé par la suite, jamais dupliqué)
- [x] Extension de `RecolteService` : `lister` (avec filtres), `findById`, `mesRecoltes`, `creer`,
  `modifier`, `supprimer`
- [x] Deux endpoints backend ajoutés et testés pour ces pages : `GET /api/recoltes/mes-recoltes` et
  `GET /api/producteurs/moi` (identité lue du JWT)
- [x] Formateurs partagés dans `core/utilitaires/formatage.ts` (montant FCFA, quantité + unité, date) et
  adoption par la page d'accueil
- [x] Tests de cette étape : `recolte.service.spec.ts` (10) + `formatage.spec.ts` (9)
- [x] Validation exécutée à cette étape : **54/54 tests frontend** (total de la suite), build de
  production réussi

### 5.3 — Catalogue public
- [x] Page catalogue `/recoltes` (liste des récoltes publiées, route publique)
- [x] Page détail `/recoltes/:id` (route publique, 404 et erreurs gérés)
- [x] Filtres alignés sur ce que l'API accepte : statut, filière, recherche sur le produit ; ordre renvoyé
  par le backend conservé
- [x] États chargement / liste vide / erreur, avec bouton « Réessayer » et bouton de réinitialisation des
  filtres
- [x] Valeurs nulles rendues sous silence (aucun `null`, `—` inventé ou zéro faux affiché)
- [x] Navigation catalogue ↔ détail ↔ en-tête et accueil
- [x] Réglages responsifs écrits en SCSS (`@media` sur les points de rupture du design system) — **jamais
  vérifiés dans un navigateur réel**
- [x] Tests de cette étape : `catalogue.spec.ts` (12) + `detail-recolte.spec.ts` (12)
- [x] Validation exécutée : **78/78 tests frontend** (total), 141/141 tests backend, build réussi
- [x] QA de phase rendue : PASS WITH LIMITATIONS (aucun test navigateur, aucun viewport réel disponible)

### 5.4 — Gestion des récoltes côté producteur
- [x] `GET /api/producteurs/moi` (déjà disponible depuis 5.2) utilisé comme **seule** source d'identité ;
  `ProducteurService.moi()` côté frontend, sans aucun paramètre client
- [x] Page « Mes récoltes » (`/producteur/recoltes`) : liste via `GET /api/recoltes/mes-recoltes`, rappels
  du profil et du décompte, fiche publique liée
- [x] Création (`/producteur/recoltes/nouvelle`, `POST /api/recoltes` → 201)
- [x] Modification (`/producteur/recoltes/:id/modifier`, `PUT /api/recoltes/{id}` → 200), formulaire
  **partagé** entre création et modification, prérempli depuis la récolte reçue
- [x] Suppression avec modale de confirmation accessible (`role="dialog"`, `aria-modal`, titre lié, Escape,
  retour du focus, verrou anti double-clic) ; jamais de `window.confirm()`
- [x] Validation frontend reprise du DTO : obligatoires, bornes numériques, règle croisée min ≤ max,
  erreurs de champ renvoyées par le backend réaffichées
- [x] États chargement / vide / succès / erreur avec « Réessayer » ; messages portés par la route après
  création et modification
- [x] Protection des trois routes par `authGuard` puis `roleGuard` avec `data: { roles: ['PRODUCTEUR'] }` ;
  `/producteur` redirige vers la liste
- [x] **Aucun `producteurId` saisi par l'utilisateur** : ni champ visible, ni caché, ni paramètre URL, ni
  lecture dans `localStorage`
- [x] Corrections de la phase : un identifiant non numérique dans l'URL n'ouvre plus un formulaire de
  création (état « récolte introuvable ») ; le focus initial de la modale se pose réellement sur « Annuler »
- [x] Tests de cette étape : `producteur.service.spec.ts` (3) + `mes-recoltes.spec.ts` (28) +
  `formulaire-recolte.spec.ts` (22). Sur les 28 tests de `mes-recoltes.spec.ts`, 5 portent sur les routes
  (garde et rôle attendus pour les trois routes, redirect, catalogue public inchangé)
- [x] Validation exécutée : **131/131 tests frontend**, **141/141 tests backend**, build de production
  réussi
- [x] QA navigateur de la 5.4 : **effectuée** après la 5.4 (parcours producteur complet, isolation d'un
  second produit, responsive et navigation clavier réels dans un navigateur connecté à l'API)
- [x] Renfort d'accessibilité de la modale : piège de focus sur `Tab` **et** `Shift+Tab`, `Escape` écouté
  sur le `document`, retour du focus garanti même quand le déclencheur a été supprimé ; le patron est
  désormais spécifié dans `FRONTEND_DESIGN.md` §31 et réutilisé tel quel. L'arrière-plan n'est pas rendu
  `inert` : le piège de focus et `aria-modal` suffisent, aucune mise à l'écart supplémentaire n'a été
  jugée nécessaire sur ces écrans

### 5.5 — Écrans acheteur (panier, commande, consultation et annulation)

> Périmètre réellement couvert : identité acheteur, modèles et DTO, panier local, tunnel de commande,
> puis consultation et annulation des commandes, **paiement simulé** (5.5.8) et **écran de notifications**
> (5.5.9). Les trois derniers points ont été ajoutés après la rédaction initiale de ce chapeau, qui
> affirmait que « le paiement et les notifications ne sont pas faits » : c'était exact à l'époque, ce ne
> l'est plus. **Ce qui reste non fait** : aucune notification de paiement (le backend n'en envoie aucune).
> La mise à jour des statuts de commande par le producteur, un temps annoncée comme absente, a été livrée
> en 5.6 (écran `/producteur/commandes`) ; elle n'est donc plus une lacune de ce périmètre.

- [x] 5.5.1 — `GET /api/acheteurs/moi` côté backend (identité lue du JWT, `ADMIN` et `PRODUCTEUR` refusés
  par un **403**), testé dans `ProfilApiTest`
- [x] 5.5.2 — `AcheteurResponse` alignée sur le DTO Java, enums et libellés de commande
  (`StatutCommande`, `ModeReception`, `TypePaiement`), `formaterDateHeure` (`JJ/MM/AAAA à HH:MM`) et
  `AcheteurService.moi()` côté frontend
- [x] 5.5.3 — `PanierService` : panier **local** en `localStorage`, signals immuables, quantités bornées
  par le stock affiché, aucun prix calculé côté client comme autorité
- [x] 5.5.4 — Indicateur de panier dans l'en-tête (compteur de **lignes**, badge non cliquable devenu
  lien en 5.5.5) et CTA « Ajouter au panier » dans le catalogue et le détail de récolte ; `aria-current`
  unique vérifié
- [x] 5.5.5 — Page `/acheteur/panier` : lignes, quantités, sous-totaux **indicatifs**, bouton « Passer la
  commande », état vide renvoyant vers le catalogue
- [x] 5.5.6 — Tunnel `/acheteur/commande` : récapitulatif, choix du mode de réception (retrait ou
  livraison avec adresse, téléphone et instructions), étape de révision, puis `POST /api/commandes` ; le
  frontend n'envoie **ni `total`, ni `prixUnitaire`, ni `acheteurId`** — le serveur calcule et force
  `EN_ATTENTE`
- [x] 5.5.7 — Consultation des commandes de l'acheteur :
  - `CommandeService` étendu sans toucher à `creer()` : `lister()` (`GET /api/commandes`),
    `findById(id)` (`GET /api/commandes/{id}`), `changerStatut(id, 'ANNULEE')`
    (`PATCH /api/commandes/{id}/statut`, corps `{ statut }` uniquement) — aucun `acheteurId` envoyé,
    aucun endpoint inventé
  - Liste `/acheteur/commandes` : identifiant, date et heure, statut (§27), mode de réception, nombre de
    lignes, total du serveur, lien « Voir le détail » ; quatre états (chargement, erreur + « Réessayer »,
    vide avec « Vous n'avez pas encore de commande. » et lien « Parcourir le catalogue », liste) ;
    **aucun filtre, tri ou pagination**
  - Détail `/acheteur/commandes/:id` : fiche de commande, réception (`LIVRAISON` détaillée, `RETRAIT`
    expliqué, jamais d'adresse inventée), lignes reprenant `CommandeResponse` et **pas** les instantanés
    du panier, « Total » sans la mention « indicatif » ; 404 rendu comme « Commande introuvable » et 403
    comme un accès refusé, sans déconnexion
  - Annulation : bouton visible seulement pour `EN_ATTENTE` et `CONFIRMEE`, c'est-à-dire exactement les
    transitions qu'admet `CommandeService.TRANSITIONS_AUTORISEES` côté backend ; modale de confirmation
    (§31), **aucun appel avant confirmation**, une seule requête pour deux clics, statut repris de la
    **réponse du serveur** ; le frontend n'appelle aucune route de récolte pour rendre du stock
  - Routes protégées par `authGuard` puis `roleGuard` avec `data: { roles: ['ACHETEUR'] }`, chargement
    paresseux, **aucun nouveau guard** ; `/acheteur` n'est plus une page d'attente mais une redirection
    vers la liste, et le placeholder `EspaceAcheteur` a été supprimé après vérification de son usage unique
  - Navigation : le lien « Mes commandes » de l'en-tête n'existe que pour un acheteur ; `espaceExact()` a
    été retiré puisque le lien d'espace ne chevauche plus le panier
  - `VARIANTES_BADGE_COMMANDE` (map unique statut → variante) et variante globale `.badge--primaire`
    ajoutée pour habiller `PRETE` (§27) ; le libellé reste affiché à côté de la couleur
  - Tests de cette étape : `commande.service.spec.ts` (22, dont 14 nouveaux), `commandes.spec.ts` (23,
    dont les routes), `detail-commande.spec.ts` (33) et `en-tete.spec.ts` (5, dont le lien d'espace)
- [x] 5.5.7 — Clôture :
  - Frontend : `npx ng test --watch=false` → **334 tests dans 22 fichiers, 0 échec** ; `npm run build`
    réussi, avec **un seul** avertissement, déjà connu avant cette sous-phase : `commande.scss` dépasse son
    budget de 192 octets (4,19 ko pour 4,00 ko budgétés). Ni `angular.json` ni les budgets n'ont été
    touchés pour le faire taire.
  - Backend : **aucun fichier modifié** dans `commande`, `paiement` ou `notification` (vérifié par
    `git status`), `./mvnw test` → **146 tests, 0 échec, BUILD SUCCESS**.
  - QA navigateur réelle, sur l'API en cours d'exécution et avec des données créées par le vrai tunnel de
    commande : liste de deux commandes rendues de la plus récente à la plus ancienne (`En attente` puis
    `Annulée`), détail conforme en `LIVRAISON` (adresse, téléphone, instructions) et en `RETRAIT` (notice
    explicative, aucune adresse inventée), annulation d'une commande **réellement** annulable — un seul
    `PATCH /api/commandes/{id}/statut`, aucun appel avant la confirmation de la modale, statut conservé
    après rechargement complet de la page —, identifiant inexistant rendu comme « Commande introuvable. »,
    console sans erreur ni avertissement, aucune requête vers `paiements` ou `notifications`.
  - La QA a révélé un **débordement horizontal de l'en-tête** à la largeur courante (quatre liens,
    l'identité et « Se déconnecter » ne tenaient plus sur une ligne) : le retour à une ligne a été repoussé
    de `--point-mobile` à `--point-tablette` dans `en-tete.scss`, conforme à §10.5 ; le scroll horizontal
    a disparu à la re-mesure.
  - **Non testé** : les largeurs 375 / 768 / 1024 / 1366. L'outil de QA disponible n'émule aucun appareil
    (viewport réel figé à 510 px) ; seule l'absence de scroll horizontal à la largeur courante a été mesurée.
    Les parcours producteur et ADMIN en réel n'ont pas été refaits : ils sont couverts par les tests
    unitaires de cette sous-phase et par `SecuriteApiTest` côté backend.
- [x] 5.5.8 — Paiement simulé après création d'une commande :
  - **Audit backend préalable** : `POST /api/paiements` (201, corps `{ commandeId, moyenPaiement }`),
    `GET /api/paiements/{id}`, `GET /api/paiements/commande/{commandeId}` (404 = aucun paiement).
    `PaiementService.creer` refuse `ANNULEE` (« Impossible d'initier un paiement pour une commande
    annulée. ») et `LIVREE` (« Cette commande est déjà livrée. ») par un 400, refuse un second paiement par
    un 400 (« Un paiement existe déjà pour cette commande. »), contrôle la propriété (403), reprend le
    montant à `commande.getTotal()`, et écrit **toujours** `EN_ATTENTE` avec une référence `SIMU-UUID`.
    `GET /api/paiements/commande/{id}` répond 404 (« Aucun paiement n'existe pour la commande : … »)
    quand l'intention n'a pas encore été créée.
    **Aucune route, aucun service, aucun job n'écrit `REUSSI` ni `ECHOUE`** : ces deux statuts sont
    inaccessibles au frontend, qui ne crée donc **aucun** mécanisme pour les déclencher.
  - `core/services/paiement.service.ts` : trois méthodes, exactement les endpoints réels (`simuler`,
    `findById`, `parCommande`) ; rien n'a été ajouté dans `commande.service.ts`, aucun endpoint inventé.
  - Écran `/acheteur/paiement/:id` (`authGuard` puis `roleGuard` avec `data: { roles: ['ACHETEUR'] }`,
    chargement paresseux, **aucun nouveau guard**) : numéro, date et heure, statut de la commande,
    **total serveur** (`CommandeResponse.total`, jamais `PanierService.totalIndicatif()`), mention
    permanente « Paiement simulé — aucune transaction réelle n'est effectuée. » rendue hors des branches
    d'état, `fieldset` + `legend` et deux radios `WAVE` / `ORANGE_MONEY`. **Aucun** champ carte, CVV,
    IBAN, compte, mot de passe, OTP ou code secret.
  - Ouverture : `GET /api/commandes/{id}` puis `GET /api/paiements/commande/{id}` ; 404 = formulaire
    proposé, 200 = fiche du paiement enregistré **sans formulaire**, autre erreur = soumission bloquée et
    message affiché. `STATUTS_PAYABLES` (`EN_ATTENTE`, `CONFIRMEE`, `PRETE`) reflète les statuts acceptés
    par le service ; `ANNULEE` et `LIVREE` n'affichent ni formulaire ni lien, avec la phrase du motif.
  - Résultat lu dans `PaiementResponse` uniquement : « Simulation enregistrée — paiement en attente. »,
    statut rendu tel quel, `dateConfirmation` absente → `—`, référence `SIMU-` annoncée comme référence de
    simulation. Aucun `setInterval`, aucun polling, aucune notification, aucun rechargement après la
    simulation ; la réponse du serveur suffit.
  - Côté fiche de commande : le lien « Payer la commande » (`#commande-payer`) est piloté par le même
    reflet des trois statuts payables ; le 5.5.7 reste inchangé (aucun vocabulaire de paiement sur
    `LIVREE` / `ANNULEE`, aucun appel `paiements` depuis les écrans de commande).
  - Sécurité : aucun `acheteurId` envoyé, `commandeId` pris sur la réponse du serveur et non sur l'URL ;
    401 laissé à `authInterceptor`, 403 affiché sans déconnexion ni purge, 400 affiché mot pour mot.
  - Tests : `paiement.service.spec.ts` (10), `paiement.spec.ts` (51, dont les routes et les greps
    d'interdiction sur le corps du POST), `detail-commande.spec.ts` porté à 39 par 6 tests sur le CTA.
- [x] 5.5.8 — Clôture :
  - Frontend : `npx ng test --watch=false` → **401 tests dans 24 fichiers, 0 échec** ; `npm run build`
    réussi avec **un seul** avertissement, déjà connu avant cette sous-phase (`commande.scss` 4,19 ko pour
    4,00 ko budgétés). Budgets et `angular.json` intouchés ; chunk paresseux `paiement` 12,95 ko brut /
    3,98 ko transfer.
  - Backend : **aucun fichier modifié** dans `paiement`, `commande` ou `notification` (`git diff HEAD` ne
    remonte que des fichiers `recolte`, `user` et `security` des sous-phases précédentes) ;
    `./mvnw test` → **146 tests, 0 échec, 0 erreur**.
  - QA navigateur réelle (API sur `:8080`, `ng start` sur `:4200`, session de l’acheteur QA « Acheteur
    QA53 », commandes réelles 1123 `EN_ATTENTE` et 1122 `ANNULEE`) :
    - accès direct désauthentifié à `/acheteur/paiement/1123` → redirection réelle vers
      `/connexion?retour=%2Facheteur%2Fpaiement%2F1123`, titre « SunuRecolte — Connexion » ;
    - parcours complet : « Mes commandes » → détail 1123 → lien « Payer la commande » →
      `/acheteur/paiement/1123` ;
    - ouverture : `GET /api/commandes/1123` **200** puis `GET /api/paiements/commande/1123` **404**, et
      alors seulement le formulaire est proposé ;
    - montant affiché **750 FCFA**, identique au total de la fiche de commande (calcul serveur) ;
    - mention « Paiement simulé — aucune transaction réelle n’est effectuée. » présente dans **tous** les
      états observés (formulaire, résultat, refus, commande introuvable) ;
    - soumission sans choix : **aucune requête**, message « Choisissez un moyen de paiement pour
      continuer. » en `role="alert"`, `aria-describedby` posé sur le `fieldset` ;
    - clavier : focus sur la radio « Wave », `ArrowDown` → « Orange Money » cochée, `ArrowUp` → « Wave »
      cochée ; l’état choisi est rendu par bordure épaisse + fond tinté + coche native, pas par la seule
      couleur ;
    - soumission : **un seul** `POST /api/paiements` **201** ; le second clic n’a pas pu partir, le
      bouton ayant été retiré du document ;
    - résultat lu du serveur : « Simulation enregistrée — paiement en attente. », statut « En attente »,
      moyen « Wave », montant 750 FCFA, référence `SIMU-ccbc20d8-13fb-439e-9799-be3639368e44`, date de la
      demande « 29/09/2026 à 02:01 », date de confirmation « — », notice sur la référence ; focus posé sur
      le titre du résultat ; **la commande reste « En attente »** sur la fiche, rien n’est réécrit ;
    - rechargement complet : `GET /api/paiements/commande/1123` **200** → fiche du paiement enregistré,
      **aucun radio, aucun formulaire, aucun POST**, même référence `SIMU-` ;
    - commande 1122 `ANNULEE` : pré-contrôle **404**, aucun formulaire, phrase « Le paiement n’est pas
      disponible : cette commande est annulée. » ; sa fiche n’offre ni « Payer la commande » ni
      « Annuler la commande » (non-régression 5.5.7) ;
    - identifiant inexistant `/acheteur/paiement/999999` : **une seule** requête
      (`GET /api/commandes/999999` **404**), « Commande introuvable. », aucune lecture de paiement ;
    - réseau : uniquement des appels vers `localhost:8080`, **zéro requête externe** ; console : **aucune
      erreur, aucun avertissement** sur les cinq chargements observés ;
    - mesures au viewport réel (510 px) : boutons d’actions à **44 px** de haut,
      `.paiement__option { min-height: 44px }` appliqué, **aucun débordement horizontal**
      (`scrollWidth` = `clientWidth` = 495).
  - Défaut **trouvé et corrigé pendant la QA** : le message « Choisissez un moyen de paiement pour
    continuer. » survivait au choix du moyen et l’écran paraissait rester en erreur ; `valueChanges` sur
    `moyenPaiement` purge maintenant `erreurSoumission` (+1 test, revalidé en navigateur).
  - **Non testé** : les largeurs 375 / 768 / 1024 / 1366 (aucun appareil émlicable, viewport figé à 510 px) ;
    le **403** en navigateur (il faudrait la session d’un second acheteur sur une commande qui n’est pas la
    sienne — couvert par `paiement.spec.ts` côté frontend et `PaiementApiTest` / `SecuriteApiTest` côté
    backend) ; les statuts `REUSSI` et `ECHOUE` : **aucun chemin du backend ne les produit**, aucun
    scénario n’a donc été fabriqué pour les voir à l’écran.

### 5.5.9 — Notifications (écran transversal et compteur d'en-tête)

> **Architecture validée par l'auteur du projet** après l'audit 5.5.9 (verdict « NEEDS ARCHITECTURE
> DECISION ») : la notification est une donnée **transverse** — le backend en écrit pour un producteur
> (nouvelle commande) comme pour un acheteur (suivi de statut), et l'ADMIN voit toutes les notifications.
> L'écran n'est donc **pas** un écran d'espace acheteur : `/notifications`, hors de `features/acheteur`,
> protégé par `authGuard` **seul**, **sans `roleGuard`**. Le compteur de non-lues vit dans l'en-tête mais
> **n'est pas cliquable** et n'ajoute **pas** de cinquième lien (§10.5) : on entre dans la liste depuis le
> Tableau de bord. Décision consignée dans `FRONTEND_DESIGN.md` §29 **avant** le code (§24).

- [x] 5.5.9 — Contrat backend retenu (aucune modification du backend, ce brief l'interdit) :
  - deux endpoints utilisés seulement : `GET /api/notifications` (liste du titulaire du jeton, `dateCreation`
    DESC) et `PUT /api/notifications/{id}/lue` (aucun corps, idempotent, renvoie la notification avec
    `lu = true`) ;
  - `GET /api/notifications/{id}` existe mais **n'est appelé par aucun écran** : aucune méthode `findById`
    n'est créée pour lui ;
  - `NotificationResponse` réel : `id`, `utilisateurId`, `titre`, `message`, `lu`, `dateCreation` — **ni
    `type`, ni `idCommande`** ;
  - **aucun endpoint de comptage** : le nombre de non-lues est une conséquence du calcul frontend, pas une
    donnée serveur ; le frontend n'envoie **jamais** `utilisateurId`.
- [x] 5.5.9 — `core/services/notification.service.ts` : singleton `providedIn: 'root'`, deux méthodes
  (`mesNotifications`, `marquerLue`), état des notifications partagé par signal pour que l'en-tête et la page
  lisent la même source, `PUT` sans corps, aucun retry, aucun polling, un `403` jamais converti en `401`.
- [x] 5.5.9 — Page `/notifications` (`features/notifications/`, chargement paresseux, `authGuard` seul) :
  les six états de §11, texte obligatoire « Non lue » (jamais la couleur seule), bouton « Marquer comme lue »
  (une seule requête, `disabled` + `aria-busy`, état repris de la **réponse du serveur**, échec = état et
  compteur conservés), bouton « Actualiser » **sans** aucun `setInterval` ni `EventSource`, titre recevant le
  focus après une actualisation déclenchée par l'utilisateur.
- [x] 5.5.9 — Compteur de non-lues dans l'en-tête : badge `SPAN` non cliquable, masqué à 0, plafonné `99+`,
  conteneur `aria-live="polite"`, **aucun appel à `/api/notifications` sans session validée** (risque de
  boucle 401/redirection). Les quatre liens existants de l'en-tête restent inchangés.
- [x] 5.5.9 — Entrée « Notifications » depuis le Tableau de bord pour tout utilisateur authentifié.
- [x] 5.5.9 — Tests : `notification.service.spec.ts` (14), `notifications.spec.ts` (25, dont la route),
  `en-tete.spec.ts` (18 — la liste exacte des quatre liens est **conservée**). Exécutés le 2026-09-29 :
  453 tests sur 26 fichiers, build de production sans nouvelle alerte.
- [ ] 5.5.9 — QA navigateur réelle (anonyme, acheteur, producteur, marquage et rechargement, isolement entre
  deux comptes, état vide, erreur, accessibilité clavier, responsive). **Partiellement faite le 2026-09-29** :
  anonyme (redirection `?retour=/notifications`, zéro appel), acheteur QA53 (compteur « 1 », un seul `PUT` pour
  un clic, compteur vidé sans rechargement, « Lue » conservé après rechargement réel), producteur QA53 A
  (compteur « 2 » puis « 1 » après marquage par **Espace**, `Tab` jusqu'au bouton, anneau de focus visible),
  isolement vérifié dans les deux sens, console propre, aucun `utilisateurId` sur le réseau, 44 px de zone
  tactile à 437 px. **Non couvert en réel** : l'état vide (les deux comptes QA ont au moins une notification),
  l'état d'erreur (non déclenchable sans arrêter le backend ni couper le réseau) et les largeurs
  375/768/1024/1366 (viewport intégré figé à 437 px, le redimensionnement de la fenêtre ne changeant pas le
  viewport, comme en 5.5.7 et 5.5.8). Ces trois points restent couverts par les tests unitaires.
- [x] 5.5.9 — **Limites connues** : pas de temps réel (aucun WebSocket, aucun polling — une notification
  créée pendant la session n'apparaît qu'après « Actualiser » ou une navigation) ; aucune notification de
  paiement à afficher (le backend n'en produit pas) ; le producteur n'a **aucune** action sur les statuts de
  commande, donc la notification « Suivi de commande » ne peut naître d'un changement fait depuis
  l'interface ; aucun compteur côté serveur ; l'ADMIN n'a pas d'écran dédié et se voit lister **toutes** les
  notifications par le service. Deux limites constatées en réel le 2026-09-29 : un **rechargement dur** de
  `/notifications` émet **deux** `GET /api/notifications` identiques (l'en-tête et la page lisent chacun la
  liste ; la navigation client n'en émet qu'un) — dédoublonner affaiblirait la recharge à l'ouverture exigée
  par §29 ; après un marquage, le bouton retiré rend le focus à `<body>` (aucune destination de focus n'était
  prescrite pour cette action).

### 5.6 — Mise à jour des statuts de commande côté producteur

> **Périmètre du brief** : frontend uniquement — aucun nouveau backend, aucune entité, aucune migration, aucun
> endpoint, aucune modification du paiement, aucun espace admin, aucun commit ni push. La règle visuelle est
> écrite dans `FRONTEND_DESIGN.md` **§35 avant le code** (§24).

- [x] 5.6 — Contrat backend réellement vérifié (lecture seule, aucun fichier de `sunurecolte-backend/` modifié) :
  - `CommandeService.TRANSITIONS_AUTORISEES` : `EN_ATTENTE → {CONFIRMEE, ANNULEE}`,
    `CONFIRMEE → {PRETE, ANNULEE}`, `PRETE → {LIVREE}`, `LIVREE` et `ANNULEE` terminaux ;
  - `verifierDroitDeChangerStatut` : `CONFIRMEE`, `PRETE` et `LIVREE` sont réservés à un **producteur concerné**
    ou à l'ADMIN — un acheteur qui les demande reçoit un **403**. D'où un écran producteur séparé, et non une
    extension des écrans de §33 ;
  - ordre réel des réponses sur `PATCH /api/commandes/{id}/statut` : 404 (`ResourceNotFoundException("Commande", id)`)
    → 403 (`ControleAcces.accesRefuse()`) → 400 « La commande est déjà au statut X. » → 400
    « Transition de statut interdite : X vers Y. » ;
  - corps exact `{ "statut": … }` (`StatutCommandeRequest`, un seul champ, `@NotNull`) ; réponse =
    `CommandeResponse` complet ;
  - `GET /api/commandes` sans paramètre, pour un PRODUCTEUR, renvoie toute commande contenant au moins une de
    ses lignes, triée par `dateCreation` DESC (`commandesDuProducteur`) ;
  - chaque transition acceptée émet côté serveur la notification « Suivi de commande » à l'acheteur : appel du
    `PATCH` suffit à la conserver, **le frontend n'envoie aucune notification**.
- [x] 5.6 — `FRONTEND_DESIGN.md` §35 : table des actions par statut, raison de l'écran séparé, absence de
  modale (§31 réservé aux confirmations destructives), retour visuel et destination du focus quand le bouton
  disparaît, erreurs 400/403/401/réseau, contenu de carte (§27, §30, §32, §33), six états (§11), entrée de
  navigation sans cinquième lien d'en-tête (§10.5), et **limite du contrat** : `LigneCommandeResponse` ne porte
  aucun `producteurId`, donc aucune ligne n'est filtrée à l'aveugle par le frontend.
- [x] 5.6 — Page `features/producteur/commandes-recues/` (`CommandesRecues`, route `producteur/commandes`,
  `authGuard` puis `roleGuard` `data.roles: ['PRODUCTEUR']`, `loadComponent`, titre « SunuRecolte — Commandes
  reçues ») : cartes de commandes avec lignes, une seule action par commande selon `ETAPES_SUIVANTES` (reflet de
  la table du service), `PATCH` unique par clic (`disabled` + `aria-busy` + garde d'exécution), statut et lignes
  remplacés par **la réponse du serveur**, message de succès par carte avec focus posé dessus quand l'action a
  disparu, message d'erreur du serveur repris tel quel dans la carte, chargement / erreur + « Réessayer » /
  état vide, **aucun** polling, `setInterval`, `WebSocket` ni `EventSource`.
- [x] 5.6 — Navigation sans toucher à l'en-tête global : lien « Commandes reçues » ajouté à l'en-tête de
  « Mes récoltes » (après « Publier une récolte », seule ancre pour que `aria-current` et les tests existants
  restent inchangés) et lien « Mes récoltes » de retour.
- [x] 5.6 — Aucune régression sur le périmètre acheteur : `features/acheteur/**` (liste, détail, annulation,
  paiement), `core/services/commande.service.ts`, `CommandeService` frontend et `features/notifications/`
  **non modifiés** ; aucune action d'annulation ni de paiement exposée au producteur.
- [x] 5.6 — Tests de cette étape : `commandes-recues.spec.ts` (36 nouveaux : liste sans identifiant client,
  ordre, badges des cinq statuts, lignes, réception, une action par étape, `PATCH` unique au corps exact,
  statut et message venus de la réponse, focus après `LIVREE`, transitions interdites rendues 400 tel quel,
  403 sans purge, erreur réseau isolée sur une carte, état vide, erreur de liste + « Réessayer », absence
  d'annulation et de vocabulaire de paiement, aucun polling ni second GET, garde de route) et +1 test dans
  `mes-recoltes.spec.ts` pour l'entrée de navigation sans déplacer « Publier une récolte »
- [x] 5.6 — Validation exécutée : suite producteur **91/91** (dont les 36 nouveaux), suite complète
  **490/490 dans 27 fichiers**, build de production **réussi** (`chunk` `commandes-recues` 11,53 kB), seul
  dépassement de budget toujours présent et non corrigé volontairement : `commande.scss` (4,19 kB pour un
  budget de 4,00 kB, préexistant à 5.6) ; `git status` sur `sunurecolte-backend/` **vide**
  *(le 5.6 note ce dépassement comme non corrigé à cette date ; il l'a été depuis, en 5.9-bis, en réduisant le
  CSS lui-même — plus aucun avertissement au build)*
- [ ] 5.6 — QA navigateur réelle (connexion producteur, confirmation d'une commande, passage en prête puis
  livrée, refus des transitions impossibles, 400 après changement concurrent, isolement des commandes d'un
  autre producteur, responsive 375/768/1024/1366) : **non faite** — hors du brief, qui demande tests
  automatisés et build. À couvrir avant de cocher cette case.

### 5.7 — Notification de paiement aux producteurs (backend)

> **Périmètre du brief** : backend uniquement. Aucun frontend, aucune nouvelle entité, aucune migration, aucun
> nouveau endpoint, aucun statut de paiement ajouté (`REUSSI` ni `ECHOUE` ne sont pas écrits), aucun mécanisme
> temps réel, aucun commit, aucun push.

- [x] 5.7 — Contrat vérifié en lecture seule avant codage : `PaiementController.creer` est la **seule** écriture
  de paiement de l'API ; `PaiementService.creer` persiste `StatutPaiement.EN_ATTENTE` et une référence
  `SIMU-` + UUID, avec un `Paiement` `@OneToOne` unique par commande ; `Notification` ne porte **aucune colonne
  de type** (le type est porté par le `titre`) ; `NotificationService.notifier(Utilisateur, titre, message)` est
  le seul point de création interne, déjà utilisé par `CommandeService`. Le projet n'a **aucun** moment de
  « traitement » du paiement : le seul fait datable est l'**enregistrement** de la simulation.
- [x] 5.7 — `PaiementService` : injection de `NotificationService` et appel de `notifierProducteursConcernes`
  **après** `paiementRepository.save(...)`, dans la même méthode `@Transactional`. Destinataires : chaque
  `Producteur` distinct atteint par `commande.getLignes() → ligne.getRecolte().getProducteur()` et chargé dans
  la transaction, dédupliqué par un `LinkedHashSet<Producteur>` — même motif que `CommandeService.creer`. Les
  gardes existantes (404 commande, 403 accès, 400 commande annulée, 400 commande livrée, 400 paiement déjà
  existant) sont **inchangées**, et `CommandeService` n'a pas été touché.
- [x] 5.7 — Contenu de la notification : titre « Paiement simulé », message
  « Un paiement simulé a été enregistré pour la commande n° {id} : statut {statut persisté}, aucune transaction
  réelle n'a été effectuée. » **Aucune** affirmation de paiement reçu, réussi ou payé (le vocabulaire
  frontend de `FRONTEND_DESIGN.md` §34 est respecté), et **aucun montant** : le total porte sur la commande
  entière, potentiellement plusieurs producteurs.
- [x] 5.7 — `PaiementApiTest` : **+7 tests** (8 → 15), section « Notification de paiement aux producteurs
  concernés » — producteur unique notifié une fois (`lu` faux, message contient le numéro de commande,
  `EN_ATTENTE` et « aucune transaction réelle », et ne contient ni « réussi », ni `REUSSI`, ni `ECHOUE`,
  ni « payé ») ; deux producteurs distincts notifiés chacun une fois ; deux lignes du même producteur sans
  doublon ; second `POST` refusé 400 sans notification supplémentaire ; **acheteur non notifié** ; notifications
  de commande toujours émises (« Nouvelle commande » et « Suivi de commande ») ; notification consultable par le
  producteur sur `GET /api/notifications` sans paramètre client.
- [x] 5.7 — Validation exécutée : `./mvnw test -Dtest=PaiementApiTest` → **15/15** ; suite backend complète
  `./mvnw test` (PostgreSQL réel, aucun mock) → **153/153** (146 avant 5.7) ;
  `./mvnw package -DskipTests` → jar repackagé, **BUILD SUCCESS**. `CommandeServiceTest`, `NotificationApiTest`
  et `SecuriteApiTest` inchangés et toujours verts.
- [x] 5.7 — Frontend **non modifié** (contrainte du brief) : la notification est visible sur l'écran
  `/notifications` et dans le compteur d'en-tête déjà livrés en 5.5.9, qui rendent tous les titres sans
  filtrage. Seule conséquence documentaire : le commentaire de `features/notifications/notifications.ts`, qui ne
  citait que les notifications de commande, est désormais incomplet — correction à valider par l'auteur, hors du
  périmètre autorisé ici.
- [ ] 5.7 — QA navigateur réelle (paiement simulé puis notification visible côté producteur, responsive
  375/768/1024/1366) : **non faite** — le brief demandait les tests backend et le build, et interdit de
  modifier le frontend.
- [ ] 5.7 — Case « Notifications paiement » de la Phase 7 laissée **décochée** : le périmètre backend est livré
  et testé ici, mais les cases de cette phase relèvent d'une décision de l'auteur (même traitement que pour
  « Liste », « Marquer comme lue » et « Notifications commande », voir la divergence signalée en Phase 7).

### 5.8 — Profil producteur (frontend)

> **Périmètre du brief** : frontend uniquement, écran `/producteur/profil`. Interdits explicites : modifier le
> backend, créer un endpoint, créer une migration, créer une entité, toucher à la base, ajouter photo/avatar,
> ajouter le changement de mot de passe, rendre nom/prénom/email/téléphone modifiables, modifier le contrat JWT,
> toucher à l'Admin, commencer le redesign premium, ajouter une fonctionnalité non demandée. Aucun commit,
> aucun push.

- [x] 5.8 — Contrat lu en lecture seule avant codage : `ProducteurController` n'expose que `GET /moi`,
  `GET /{id}` et `PUT /{id}` ; `ProducteurRequest` Java porte exactement `localisationExploitation`,
  `filiere` (`@NotNull`) et `description` ; `ProducteurService.modifier` **réécrit les trois colonnes** sans
  fusion partielle — d'où l'obligation d'envoyer les trois champs à chaque `PUT`. `UtilisateurService.modifier`
  n'existe pas : l'identité reste en lecture seule.
- [x] 5.8 — `FRONTEND_DESIGN.md` **§36 « Profil producteur (Phase 5.8) »** rédigé **avant** le code : structure,
  champs en lecture seule, champs éditables, contrat d'envoi des trois champs, bornage local de
  `localisationExploitation` (colonne `varchar(255)` sans `@Size` côté DTO), validation, six états, accessibilité,
  responsive, comportement après succès/erreur, et ce que l'écran ne fait pas.
- [x] 5.8 — Interface `ProducteurRequest` dans `core/modeles/domaine.modeles.ts` : exactement
  `localisationExploitation: string | null`, `filiere: Filiere` et `description: string | null`, trois
  propriétés non optionnelles pour que l'envoi complet ne puisse pas s'oublier au niveau du type.
- [x] 5.8 — `ProducteurService.modifier(id, requete)` (`PUT /api/producteurs/{id}`, `id` venu de la réponse de
  `moi()`) et sa spec portée de 3 à **8 tests** : cible = identifiant de la réponse, les trois clés toujours
  présentes (`Object.keys(corps).sort()`), `null` et non `''` pour un champ vidé, 400 avec erreurs par champ,
  403 au message backend inchangé.
- [x] 5.8 — Écran `features/producteur/profil/profil-producteur.{ts,html,scss,spec.ts}` : identité en lecture
  seule rendue en `<dl>` (aucun `input` désactivé), trois champs éditables préremplis, filière issue de
  `FILIERES` / `LIBELLES_FILIERE`, six états, garde anti double soumission, succès relu depuis la réponse
  serveur. SCSS de **2 669 octets** (budget 4 kB). Spec de **22 tests**, dont `GET /moi` sans paramètre client,
  `PUT` vers `/api/producteurs/1285` alors que la session porte `utilisateurId` 9, et non-purge de la session
  sur 403.
- [x] 5.8 — Route `producteur/profil` (`authGuard` puis `roleGuard`, `data.roles = ['PRODUCTEUR']`,
  `loadComponent`, titre « SunuRecolte — Profil ») et entrée « Profil » dans `.mes-recoltes__actions`
  (`#lien-profil-producteur`) : **aucun cinquième lien d'en-tête ajouté**. `mes-recoltes.spec.ts` met à jour le
  test des liens d'actions ; `en-tete.spec.ts` gagne **2 tests** (liens producteur de l'en-tête inchangés,
  `aria-current` conservé sur « Mes récoltes » depuis `/producteur/profil`).
- [x] 5.8 — Validation automatisée : **519 tests réussis sur 519** (28 fichiers), soit le baseline de 490 +
  29 tests (5 service nouveaux, 22 écran, 2 en-tête) et **0 test perdu** ; `npm run build` **réussi**, avec le
  seul warning préexistant (`commande.scss` 4,19 kB). Aucun commit, aucun push.
- [ ] 5.8 — QA navigateur réelle : **non faite**. Les six états et le responsive 375/768/1366 sont couverts par
  les tests unitaires et le build, ils n'ont pas été observés dans un navigateur.

### 5.8-bis — Extension du profil producteur (backend + frontend)

> **Périmètre du brief** : rendre modifiables depuis `/producteur/profil` le prénom, le nom, l'e-mail et le
> téléphone, en plus des trois colonnes d'exploitation. Interdits explicites : nouvelle entité, nouvelle
> migration, modification du JWT ou du mécanisme d'authentification, exposition de `id`, `role`, `actif`,
> `dateCreation` ou du mot de passe, endpoint en double, commit, push, reset, rebase.

- [x] 5.8-bis — Audit préalable en lecture seule : `Utilisateur`, `Producteur`, `UtilisateurService`,
  `ProducteurService`, `UtilisateurController`, `ProducteurController`, DTO, repositories, `ControleAcces`,
  `SecurityConfig`, `ProfilApiTest`, `SecuriteApiTest` et migrations Flyway. Conclusions retenues : `Producteur` est
  lié à `Utilisateur` et déjà chargé par `findByUtilisateurId` ; `UtilisateurRepository.findByEmail` existe ;
  **aucune contrainte d'unicité sur `utilisateurs.telephone`**, et `existsByTelephone()` n'est appelé par
  personne ; longueurs réelles `varchar(100)`/`varchar(100)`/`varchar(150)`/`varchar(20)`/`varchar(255)` et
  `description` en `TEXT`.
- [x] 5.8-bis — Backend : DTO d'écriture dédié `ModifierProfilProducteurRequest` (record, **sept** propriétés,
  `@NotBlank`/`@Email`/`@Size`/`@NotNull` aux bornes du schéma, messages français) ; `ProducteurService.modifierMoi`
  (`@Transactional`, 403 hors `PRODUCTEUR`, cible = `findByUtilisateurId(principal.getId())`, e-mail normalisé et
  doublon vérifié hors titulaire → `BusinessException` **400**, jamais 500) ; `ProducteurController`
  `PUT /api/producteurs/moi`. `PUT /{id}` (trois colonnes d'exploitation, propriétaire ou ADMIN) est **conservé** :
  contrat différent, attesté par `DocumentationApiTest`, plus aucun appelant frontend.
- [x] 5.8-bis — Tests backend : `ProfilApiTest` porté de 17 à **27 tests** (sept champs appliqués et relus par
  `GET /moi`, voisin intact, `401` sans jeton, `403` ACHETEUR, `403` ADMIN, `403` sans profil producteur, e-mail
  d'un autre → `400` et non `500`, son propre e-mail conservé et normalisé, six erreurs par champ, champs
  sensibles hors contrat ignorés, `PUT /{id}` d'un autre producteur → `403`, mot de passe jamais exposé).
  `./mvnw -o test` → **163 tests réussis sur 163**, `BUILD SUCCESS` (baseline 153 + 10, 0 échec) ; PostgreSQL réel,
  aucun mock.
- [x] 5.8-bis — Frontend `core` : interface `ModifierProfilProducteurRequest` (sept propriétés) en remplacement de
  `ProducteurRequest` ; `ProducteurService.modifierMonProfil` en remplacement de `modifier(id, …)` ;
  `AuthService.mettreAJourIdentite` rafraîchit prénom/nom/e-mail de la session locale **sans toucher au jeton**.
  Spec du service portée de 8 à **9 tests**, spec d'authentification de 6 à **8 tests**.
- [x] 5.8-bis — Écran `profil-producteur` : deux `<fieldset>` (« Compte » puis « Exploitation »), **sept contrôles**
  préremplis depuis `GET /moi`, `autocomplete` sur les quatre champs de compte, `type="email"` et `type="tel"`,
  note « Le rôle du compte et le mot de passe ne se modifient pas depuis cet écran. », `PUT` toujours complet des
  sept clés, chaînes vides envoyées `null`, `trim()` de l'identité, succès relu de la réponse serveur. Six états,
  garde anti double soumission, `aria-busy` et conservation de la saisie en échec **inchangés**. SCSS ramené à
  **2 091 octets** (retrait du `<dl>` d'identité). Spec réécrite : **29 tests**.
- [x] 5.8-bis — Documentation : `FRONTEND_DESIGN.md` §36 réécrit pour les sept champs, `PUT /api/producteurs/moi`,
  le conflit d'e-mail en 400, l'absence d'unicité du téléphone et le rafraîchissement de la session locale ;
  `README.md` — ligne `PUT /api/producteurs/moi` ajoutée au tableau des routes.
- [x] 5.8-bis — Validation automatisée : `npx ng test --watch=false` → **529 tests réussis sur 529** (28 fichiers),
  soit le baseline de 519 + 10 (1 service producteur, 7 écran, 2 authentification) et **0 test perdu** ;
  `npx tsc -p tsconfig.spec.json --noEmit` sans erreur ; `npm run build` **réussi**, avec le seul warning
  préexistant (`commande.scss` 4,19 kB). Aucun commit, aucun push.
- [x] 5.8-bis — QA navigateur réelle de l'écran étendu (2026-09-29, compte producteur B sur
  `/producteur/profil`, backend relancé avec les nouveaux mappings) : les **sept contrôles** sont rendus et
  préremplis depuis `GET /api/producteurs/moi` **sans paramètre d'URL** ; un `PUT` parti de **deux clics** et son
  corps portait **exactement les sept clés** ; après succès, l'en-tête est passé à l'identité saisie **sans
  rechargement** (preuve de `mettreAJourIdentite`, jeton conservé) ; un rechargement complet + nouvelle connexion
  relit les sept valeurs depuis le serveur (persistance) ; `prenom = '   '` → `400` du serveur, message sous
  `#prenom-erreur`, `aria-invalid="true"`, autres valeurs intactes ; e-mail d'un autre compte → **`400` et non
  `500`**, « Un compte existe déjà avec cette adresse email. » en erreur générale ; e-mail mal formé et champ
  obligatoire vidé → message local (`#email-erreur`, « Ce champ est obligatoire. ») et **aucune requête émise**
  (journal réseau figé) ; sauvegarde déclenchée **au clavier** (deux `Tab` jusqu'à `#profil-soumettre`, puis
  Espace) ; `aria-current="page"` sur « Mes récoltes », liens « Voir mes récoltes » et « Annuler » vers
  `/producteur/recoltes`, **zéro `input[type=password]`**, succès en `.message--succes` `role="status"`, bouton
  réactivé (`aria-busy="false"`) ; **aucune erreur ni avertissement en console** (les seuls messages préservés
  sont les `400` provoqués volontairement) ; à la largeur courante (437 px) **aucun scroll horizontal** et
  **aucun élément hors cadre**. **Non testé : 375 / 768 / 1024 / 1366** — le navigateur intégré n'offre aucune
  émulation d'appareil ni contrôle du viewport (limite d'environnement, pas du composant).

### 5.9 — Espace administrateur (backend puis frontend)

> **Périmètre du brief** : **aucune** nouvelle entité métier, **aucune** migration Flyway, **aucun** champ ajouté,
> **aucune** fonctionnalité hors liste (pas de livraison, transporteur, WebSocket, chat, paiement réel, catalogue
> Produit, export, RBAC supplémentaire, 2FA, journal d'audit, nouvelle bibliothèque UI). **Aucun** endpoint de
> comptage ou d'agrégation : l'espace livré n'a ni dashboard analytique, ni graphique, ni statistique.
> Ni commit ni push demandés.

**Backend (A)**

- [x] A1 — `GET /api/utilisateurs`, réservé ADMIN (`SecurityConfig` **puis** `ControleAcces.exigerAdmin` dans le
  service), avec filtre facultatif `?role=`. Réutilise `UtilisateurResponse` telle quelle : `id`, `nom`, `prenom`,
  `email`, `telephone`, `role`, `dateCreation`, `actif` — **jamais** de mot de passe ni de hash. Tri serveur
  `dateCreation DESC, id DESC` (`findAllByOrderByDateCreationDescIdDesc`, `findByRoleOrderByDateCreationDescIdDesc`).
  Fichiers : `user/controller/UtilisateurController.java`, `user/service/UtilisateurService.java`,
  `user/repository/UtilisateurRepository.java`, `security/SecurityConfig.java`, `security/ControleAcces.java`
- [x] A2 — `PATCH /api/utilisateurs/{id}/actif`, corps `{"actif": true|false}` (DTO
  `user/dto/ModifierActifRequest.java`, `@NotNull`). Un ADMIN ne peut pas modifier son propre compte :
  **400** « Vous ne pouvez pas modifier l'état de votre propre compte. » ; **404** si le compte n'existe pas ;
  **403** pour tout autre rôle, le contrôle du rôle intervenant **avant** le chargement de la ressource.
  `Utilisateur.actif` étant déjà une colonne du schéma, **aucune migration** : la réactivation est le chemin
  inverse du même champ. Effet réel : le rôle et l'état étant relus en base à chaque requête, le jeton déjà émis
  d'un compte désactivé reçoit **401** (`SecuriteApiTest.unJetonDunCompteDesactiveRepond401`)
- [x] A3 — `PATCH /api/recoltes/{id}/statut`, réservé ADMIN, DTO minimal
  `recolte/dto/StatutRecolteRequest.java` (`@NotNull StatutRecolte statut`). `statut` n'a **pas** été ajouté à
  `RecolteRequest` : le formulaire de saisie d'un producteur ne porte toujours pas de statut. Seules les valeurs
  déjà définies par le domaine sont acceptées (`DISPONIBLE`, `EPUISEE` — contrainte `ck_recoltes_statut`), aucune
  valeur inventée. Fichiers : `recolte/controller/RecolteController.java`, `recolte/service/RecolteService.java`
- [x] A4 — `POST /api/prix-marche`, `PUT /api/prix-marche/{id}`, `DELETE /api/prix-marche/{id}` : ADMIN
  uniquement, **la lecture publique des deux routes `GET` est préservée**. DTO
  `prixmarche/dto/PrixMarcheRequest.java` borné colonne par colonne (`produit` 150, `unite` 30,
  `prixMoyen` `0.01` à `99999999.99`, `marcheReference` 150 facultatif) ; `dateMiseAJour` reste alimenté par
  l'entité (`@PrePersist` / `@PreUpdate`), jamais saisi. Aucune nouvelle catégorie ni concept métier
- [x] A5 — `PATCH /api/commandes/{id}/statut` : l'ADMIN **ne contourne aucune transition métier**. Aucun
  embranchement « si ADMIN » n'a été ajouté dans `CommandeService.changerStatut` : la cible est confrontée à
  `TRANSITIONS_AUTORISEES` comme pour un acheteur ou un producteur, un statut déjà atteint répond 400, et
  l'annulation passe toujours par la restauration du stock et l'annulation du paiement en attente
- [x] A6 — Validation backend : `./mvnw -o test` → **207 tests, 0 échec, 0 erreur, BUILD SUCCESS** (163 avant
  cette sous-phase, **+44**). Tests d'intégration PostgreSQL réels, aucun mock :
  `api/UtilisateurApiTest.java` (**nouveau**, 13 méthodes : 401/403 par rôle, liste sans mot de passe, filtre de
  rôle, rôle inconnu en filtre → 400, désactivation/réactivation, auto-désactivation refusée, 404, `actif` manquant
  → 400 avec détail du champ), `api/PrixMarcheApiTest.java` (19), `api/RecolteApiTest.java` (29),
  `api/CommandeApiTest.java` (18), `api/SecuriteApiTest.java` (20)

**Frontend (B)**

- [x] B1 — `/admin` est une **vraie page** (`features/admin/espace-admin.*`), plus le simple titre remplacé :
  trois cartes d'entrée (Utilisateurs, Récoltes, Prix indicatifs) et un lien discret vers `/notifications`.
  **Aucun chiffre, aucun graphique, aucune statistique** : le backend n'expose aucun endpoint de comptage (§17 de
  `FRONTEND_DESIGN.md`)
- [x] B2 — `/admin/utilisateurs` (`features/admin/utilisateurs/`, spec de 28 tests) : nom complet, email,
  téléphone, rôle, date de création et état par compte ; action unique « Désactiver » / « Réactiver » confirmée
  par une **modale accessible** reprenant les conventions de §31 (`role="dialog"`, `aria-modal`,
  `aria-labelledby`, focus sur « Annuler » à l'ouverture, Tab et Shift+Tab piégés, Escape écouté sur le `document`,
  focus rendu au déclencheur) ; un seul `PATCH` en vol, boutons `disabled`, `aria-busy`, libellé « … » ;
  la ligne est remplacée par la réponse du serveur ; 400 / 403 / 404 affichent le message du backend **dans la
  modale restée ouverte**, sans déconnexion ni purge
- [x] B3 — `/admin/recoltes` (`features/admin/recoltes-admin/`, spec de 22 tests) : liste complète de
  `GET /api/recoltes` (récoltes épuisées comprises) et modération de statut par
  `PATCH /api/recoltes/{id}/statut`, aller-retour `DISPONIBLE ⇄ EPUISEE`. Six états (§11) dont chargement
  `aria-busy`, vide, erreur avec « Réessayer » ; un `PATCH` à la fois ; focus conservé sur le bouton de la carte
  traitée. **Pas de modale ici** : la bascule est immédiatement réversible depuis la même carte, et §31 ne demande
  une confirmation que pour ce qui ne peut pas être annulé à l'écran. Ni création, ni modification, ni suppression
  de récolte : le contenu reste la propriété du producteur
- [x] B4 — `/admin/prix-marche` (`features/admin/prix-marche/`, spec de 38 tests) : un seul écran pour les quatre
  opérations du contrat (liste `GET`, formulaire unique création « Ajouter le prix » / modification
  « Enregistrer les modifications », suppression « Retirer le prix » confirmée par modale de §31). Bornes locales
  reprises du DTO et vérifiées avant envoi, `erreurs` par champ du serveur reprenant la main ; conversion
  numérique explicite (`type="number"` livre une chaîne) ; `dateMiseAJour` en lecture seule
- [x] B5 — Les quatre routes sont en `data.roles: ['ADMIN']`, `authGuard` puis `roleGuard`, chargement paresseux.
  **Aucune** route personnelle n'est utilisée pour l'administration (`/api/producteurs/moi`, `/api/acheteurs/moi`,
  `/api/recoltes/mes-recoltes` sont des endpoints de titulaire où un ADMIN reçoit 403). Vérification portée par
  `src/app/routes-admin.spec.ts` (7 tests), fichier qui **n'importe et ne monte aucun composant** : la coexistence
  d'un `import { routes }` et d'un `TestBed.createComponent` dans une même spec rendait le worker Vitest partagé
  instable et cassait le rendu `@for` d'autres fichiers (68 échecs ; bisect réel : 27 échecs avec
  `espace-admin.spec.ts` + `profil-producteur.spec.ts` côte à côte, chacun seul vert). Les assertions de routes ont
  donc été extraites de `espace-admin.spec.ts` (6 tests restants)

**Tests et validation (C)**

- [x] Suite ADMIN : **101 tests dans 5 fichiers** (`routes-admin` 7, `espace-admin` 6, `recoltes-admin` 22,
  `utilisateurs` 28, `prix-marche` 38), 0 échec
- [x] Services créés : `core/services/utilisateur.service.ts` (lister + changerActif, spec de 10 tests) et
  `core/services/prix-marche.service.ts` (les quatre opérations, spec de 11 tests) ;
  `core/services/recolte.service.ts` étendu de `changerStatut` ; types `PrixMarcheRequest` et
  `UtilisateurResponse` alignés sur les DTO Java dans `core/modeles/domaine.modeles.ts`
- [x] Suite complète : `npx ng test --watch=false` → **36 fichiers, 672 tests, 0 échec**
- [x] Types : `npx tsc -p tsconfig.spec.json --noEmit` → **aucune erreur** (exit 0)
- [x] Build : `npm run build` → **réussi**, initial total **324,19 kB**, **aucun avertissement** de budget
- [ ] QA navigateur réelle de `/admin`, `/admin/utilisateurs`, `/admin/recoltes` et `/admin/prix-marche` :
  **non faite au moment de cette écriture** — à exécuter contre l'API locale avec un compte ADMIN amorcé
  (`APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`, procédure README §4 ; le mot de passe est saisi par l'auteur dans le
  navigateur, jamais recopié dans un outil, un fichier ou un journal). À couvrir avant de cocher.

### 5.9-bis — Corrections d'intégration (après Admin)

- [x] **`PanierService.quantiteTotale` supprimé** : aucun consommateur d'interface (grep réel — l'en-tête et les
  pages panier et commande utilisent `lignes().length`, `totalIndicatif` est consommé par `panier.html` et
  `commande.html`). Le calcul n'était lu que par sa propre spec : dead code, **suppression plutôt que
  fonctionnalité artificielle**. Une assertion et le test « additionne les quantités de toutes les lignes »
  retirés de `panier.service.spec.ts` (32 → **31 tests**)
- [x] **Double `GET /api/notifications` réduit à un appel, cause identifiée** : au rechargement du navigateur,
  l'`effect` du composant `EnTete` et le constructeur de la page `Notifications` se montent l'un et l'autre et
  demandent la liste à la même milliseconde — deux consommateurs, deux souscriptions, deux requêtes.
  `NotificationService.mesNotifications()` partage désormais la **lecture en vol** (`shareReplay` +
  `refCount`, champ `lectureEnVol` remis à `null` en `finalize` avec garde d'identité). **Aucun cache** : la
  lecture qui suit une réponse repart au serveur, donc « Actualiser » et « Réessayer » restent des requêtes
  réelles. Preuve par `http.expectOne` (et non `match`, qui retire les requêtes trouvées) :
  `notification.service.spec.ts` 14 → **16 tests**
- [x] **Validation email alignée sur le backend, dans le sens strict** : `Validators.email` comme `@Email`
  (Jakarta) acceptent un domaine sans point — constat de QA 5.8-bis, `mariama@exemple` est passé jusqu'en base
  (HTTP 200). Nouvel utilitaire `core/utilitaires/validation-email.ts` (`domaineEmailComplet`, message unique
  « Il manque l'extension du domaine, par exemple prenom@exemple.sn. »), branché sur les trois formulaires qui
  saisissent une adresse (connexion, inscription, profil producteur). Le contrat backend est **inchangé** : le
  frontend est plus strict que lui, jamais plus permissif. 13 tests unitaires + 1 test d'écran ajouté dans
  chacune des trois specs (connexion 8, inscription 9, profil 30), chaque refus client s'accompagnant d'aucune
  requête
- [x] **Budget de styles de `commande.scss` respecté** : dépassement de **192 octets** réduit par étapes
  (192 → 116 → 25 octets → **plus aucun avertissement**), par des suppressions sans effet visuel et non par un
  changement de configuration — une règle `margin-top` avalée par le
  `margin-bottom` de `.champ` (`styles/_composants.scss`), deux membres `grid-column: auto` et deux jeux de
  déclarations typographiques strictement identiques fusionnés. `angular.json` (4 ko / 8 ko) n'a **pas** été
  touché ; le build ne publie plus aucun avertissement. Les fusions restent à re-vérifier visuellement lors de la
  QA navigateur. Règle pérenne écrite en §18 de `FRONTEND_DESIGN.md`

### État d'intégration (2026-09-29)
- [x] 5.2, 5.3, 5.4 et 5.5 (5.5.1 → 5.5.9) sont **implémentées et validées par les tests automatisés,
  le build et une QA navigateur réelle** (aux limites de viewport signalées en clôture de 5.5.7, 5.5.8 et
  5.5.9)
- [x] 5.6 (statuts de commande côté producteur), 5.7 (notification de paiement, backend), 5.8 et 5.8-bis
  (profil producteur, sept champs) sont **implémentées et testées** ; la QA navigateur réelle de **5.6 n'a pas
  été faite**, celle de **5.8-bis l'a été** (largeurs 375/768/1024/1366 non émules)
- [x] 5.9 (espace administrateur, backend puis frontend) et 5.9-bis (quatre corrections d'intégration) sont
  **implémentées et testées** : backend **207/207**, frontend **672/672**, types **0 erreur**, build **sans
  avertissement**. Leur **QA navigateur reste à faire** (voir la case ouverte en clôture de 5.9)
- [x] Correction de navigation sortie de la QA : les **points d'entrée « Notifications »** manquants ont été ajoutés
  dans les espaces principaux — `/producteur/recoltes`, `/acheteur/commandes`, `/admin` et ses trois sous-écrans
  (5 gabarits + 5 specs) — en plus de celui du Tableau de bord. L'en-tête global, la route `/notifications`, les
  gardes et le backend n'ont **pas** été touchés ; le badge de non-lues de l'en-tête reste **non cliquable** (§29,
  §10.5, §10.7). Frontend **677/677** sur 36 fichiers, types **0 erreur**, build **sans avertissement** ; travail
  **commité le 2026-09-29** avec l'espace administrateur, dans le checkpoint « feat: finalize admin and functional
  integration », que `main` et le dépôt distant portent tous les deux (corrigé le 2026-10-02)
- [x] Le travail est **commité au fur et à mesure** jusqu'à 5.8 : chaque sous-phase achevée a son checkpoint Git,
  et le dépôt distant est à jour de ces checkpoints. **5.9 et 5.9-bis ont été commitées le 2026-09-29**, dans le
  même checkpoint que la correction de navigation ci-dessus (« feat: finalize admin and functional integration »),
  et le dépôt distant les porte (le brief de cette sous-phase interdisait commit et push ; le commit existe et
  `main` le porte — corrigé le 2026-10-02)
- [ ] Le projet n'est **pas terminé** : la QA navigateur de l'espace administrateur (5.9) et celle de 5.6 restent
  à faire, l'intégration de bout en bout (Phase 10) et la finalisation (Phase 11) sont devant. L'espace admin,
  dernier bloc fonctionnel du périmètre approuvé, est **livré et testé** ; la phase de *redesign premium* a été
  **jouée** sous le repère « Phase 5.11 » (LOT 1 → 18, section « Phases 5.10 et 5.11 »), validée par les specs,
  les types et le build — sa **validation en navigateur réelle reste à faire**, consignée dans l'entrée ouverte de
  « Reste à faire à la fin de la campagne » de cette même section (corrigé le 2026-10-02)
- [x] « Phase 5.5 » des consignes de travail (commandes acheteur) : panier, tunnel de commande,
  consultation, annulation et **paiement simulé** **faits** ; les notifications, d'abord **volontairement
  hors périmètre**, ont été livrées ensuite en **5.5.9** (écran transversal et compteur d'en-tête)

## Phases 5.10 et 5.11 — alignement visuel puis refonte (détail réel)

> **Ce que couvre cette section** : les deux campagnes frontend menées après 5.9-bis, consignées d'après
> `git log` (messages, dates et fichiers des commits), les briefs de lots et `FRONTEND_DESIGN.md` §38 à §41.
> « 5.10 » et « 5.11 » sont des **repères de consignes de travail**, dans le même esprit que l'avertissement de
> numérotation de la section « Sous-phases 5.2 → 5.9-bis » : 5.10 correspond à §38 du document de design, les LOT
> 1 → 18 à §39 à §41 (le document intitule ces deux campagnes « Phase 5.11 » en §40 et §41).
>
> **Porte de validation de ces deux campagnes** : specs Vitest/jsdom, `npx tsc -p tsconfig.spec.json --noEmit`
> et `npm run build`. **Aucun écran de cette section n'a été observé dans un navigateur réel** — ni parcours
> cliqué, ni mesure de rendu. Les quatre largeurs de contrôle 375 / 768 / 1024 / 1366 (§38.5) n'ont été
> jouées sur aucun de ces écrans, comme cela avait déjà été consigné en clôture de 5.5.7, 5.5.8 et 5.5.9. Les
> largeurs « utiles » citées par §41.2 à §41.6 sont des **calculs**, pas des mesures.

### 5.10 — Alignement sur les trois maquettes validées (`FRONTEND_DESIGN.md` §38)

- [x] Socle documentaire posé le **2026-09-30** (§38.1 à §38.6, puis `_tokens.scss` et `_composants.scss`) :
  trois maquettes MagicPath (Catalogue des récoltes, Détail commande, Administration) validées comme références
  **visuelles** seulement ; **hiérarchie d'encre** et non nouvelle palette (`--couleur-encre` + `.bouton--encre`
  portent l'action principale des trois écrans maîtres), vert de marque, accents et couleurs d'état conservés,
  `.page--surface` réservé à ces trois écrans ; dates au format livré (`14/09/2024 à 14:30`, §30) **non** alignées
  sur la maquette — écart **voulu et documenté** (§38.2)
- [x] Catalogue et détail de commande alignés le même jour : le catalogue passe en **table dense à sept
  colonnes** et le détail conserve statut, réception, lignes, total, annulation et modale. Aucun élément de
  maquette inventé et aucune donnée retirée (§38.4) — les trois éléments que le contrat ne porte pas (frais de
  livraison, sous-total de marchandises séparé, producteur par ligne) **ne sont pas implémentés**, preuve à
  l'appui dans le tableau de §38.4
- [x] Administration alignée le même jour sur la **navigation partagée** : composant `partage/admin-navigation`
  en `.onglets` (`routerLinkActive` + `ariaCurrentWhenActive`), les **trois routes non fusionnées**, le composant
  purement présentation et navigation (aucun service, aucun DTO, aucune logique d'autorisation) ; `espace-admin`,
  `utilisateurs`, `recoltes-admin` et `prix-marche` reprennent les filets sur blanc et **toutes** les colonnes
  réellement retournées par chaque endpoint (§38.3)
- [x] Règle de responsive consignée et appliquée : sous `$point-tablette`, une table dense passe en
  `.tableau--empile` — un bloc par ligne, en-tête masqué porté par `data-libelle`, `<table>` et `th scope="col"`
  conservés dans le DOM pour que le lecteur d'écran garde l'association cellule / en-tête ; `overflow-x` global
  exclu (§38.5)
- [x] Quatre écrans encore hors patron traités le même jour, après les quatre étapes de §38.6 : `/acheteur/panier`
  et `/producteur/recoltes` (leurs modales migrées sur `.voile` / `.modale` / `.modale__actions` du §31), puis
  `/notifications` et `/acheteur/commandes` (conteneur et plafond §20)

### 5.11 — Campagne de refonte visuelle, LOT 1 → 18 (`FRONTEND_DESIGN.md` §39 à §41)

> Vingt-deux commits sur `refonte-design` entre le **2026-10-01** et le **2026-10-02** : quatre engagements
> préliminaires non numérotés en LOT (ils rédigent §39 au fur et à mesure), puis dix-huit LOT. Chaque LOT est un
> commit unique, à message imposé, à périmètre annoncé avant écriture, et **aucun n'a touché au backend** : sur
> l'ensemble des vingt-deux commits, le seul fichier hors `frontend/` est `FRONTEND_DESIGN.md` (aucun service,
> aucune route, aucun guard, aucun DTO modifié).

- [x] **Engagements préliminaires (2026-10-01)** — accueil, en-tête, pied de page et **panier latéral**
  (`partage/panier-tiroir`) composés sur la maquette Figma (§39 rédigé avec le code) ; tokens, voiles, rayons et
  survols alignés et consignés dans la table §39.1 (`--voile`, `--voile-tiroir`, `--flou-voile`,
  `--rayon-surface` 3 px, `--rayon-pilule`, `--ombre-elevation`, `--ombre-carte-survol`, `--ombre-toast`,
  `--z-toast` 70) ; catalogue converti de la table dense à la **grille de cartes** de l'accueil ; **notice de
  retour d'action** créée (`ToastService` + `partage/toast`, §39.2) avec l'ajout rapide `+` au panier
- [x] **LOT 1 — parcours acheteur vers la notice (2026-10-01)** : `/acheteur/panier` (refus), `/recoltes` et
  `/recoltes/:id` (succès et refus du bouton texte comme du `+`), `/acheteur/commandes/:id` (succès
  d'annulation). Décision §39.2 : sur un écran migré, **le signal du composant reste la source du texte**, mot
  pour mot — `ToastService` n'écrit aucun libellé et n'est jamais l'autorité d'un succès
- [x] **LOT 2 — parcours producteur vers la notice (2026-10-01)** : `/producteur/commandes` (refus de
  transition, `messageErreurApi()` du `PATCH` repris mot pour mot) et `/producteur/profil` (succès
  « Profil mis à jour. »). Décision : un refus **déjà au panier** dans le tiroir ne devient **jamais** une notice
  globale — il reste porté par la ligne (`role="status"` relié au « + » par `aria-describedby`) ; la phrase vient
  de `messageRefusQuantite()`, **source unique** partagée avec `/acheteur/panier`
- [x] **LOT 3 — tiroir du panier aligné sur le blocage des lignes non disponibles (2026-10-01)** : `+` en
  `aria-disabled` (jamais `disabled`), « − » et « Retirer » restent utilisables, rien n'est masqué ni retiré
  automatiquement ; règle `estLigneBloquee()` et phrase `messageLigneBloquee()` migrées en **source unique** dans
  `core/utilitaires/panier-affichage.ts` ; quand statut bloqué et plafond de stock se cumulent, **le statut
  prime** (une seule mention). **Aucune notice n'est rendue pendant que le tiroir est ouvert** : elle est mise en
  attente (`suspendre()` / `reprendre()`), donc rendue une seule fois, jamais perdue ni dupliquée
- [x] **LOT 4 — suppression de récolte vers la notice (2026-10-01)** : « « X » a été supprimée du catalogue. »
  en notice sur `/producteur/recoltes`, `.html` **non touché** — le `messageSucces()` d'arrivée (`?recolteCreee` /
  `?recolteModifiee`) **reste une bannière** : la bannière partagée n'est pas scindée (tableau d'exclusion §39.2)
- [x] **LOT 5 — en-tête refait (2026-10-01)** : trois actions rondes en pilule 44 × 44 px — **sac** (acheteur),
  **cloche** (tout rôle connecté), **burger** (sous 1100 px) — liens repliés en navigation disclosure sous
  `--point-desktop` ; les comptes deviennent des `.badge` en pastille d'angle, jamais des surfaces cliquables
  (§39, §10.5)
- [x] **LOT 6 — fiche récolte `/recoltes/:id` sur la maquette produit (2026-10-01)** : la route reste une
  **page** (lien partageable, aucun piège de focus) et non une modale, deux colonnes dès `$point-tablette`,
  statut posé **sur la photo** et revenant au `.badge` du titre sans photo — **un seul indicateur à la fois** ;
  récolte non ajoutable = bouton **focusable** en `aria-disabled="true"` avec son motif en `role="status"`
- [x] **LOT 7 — catalogue achevé (2026-10-01)** : barre de filtres en **pastilles** (`aria-pressed`, « Toutes »
  et « Tous » portent l'absence de critère) qui notent le critère sans **lancer aucune requête** — la recherche
  part toujours du bouton « Rechercher » avec les mêmes paramètres d'URL ; puce de statut `.recolte__statut`
  **promue à l'identique** dans `styles/_composants.scss` et ses **trois copies locales supprimées** ; bloc
  d'image rendu **seulement** quand `RecolteResponse.imageUrl` est non nul, ni filière ni catégorie sur la carte
  (§38.4)
- [x] **LOT 8 — page `/acheteur/panier` sur le vocabulaire du tiroir (2026-10-02)** : plafond §20 porté par un
  `<div class="conteneur">` **imbriqué** dans la `<section>`, deux colonnes dès `$point-desktop`
  (`.panier__corps`) — proportions et motif repris tels quels par le tunnel au LOT 10 (§41)
- [x] **LOT 9 — `/tableau-de-bord` sur le vocabulaire commun (2026-10-02, §40)** : `.conteneur` imbriqué (jamais
  `.tableau-de-bord.conteneur`), rythme vertical `--espace-5` porté par `.tableau-de-bord .conteneur`,
  `max-width: 36rem` local **retiré**, champs d'identité en `dl` une colonne / deux à `$point-tablette`.
  Décisions : **pas de `.page--surface`** (réservé aux trois écrans maîtres) ; **aucun bloc ni raccourci par
  rôle** ajouté — le rôle n'agit que sur le libellé du badge et le `href` d'« Accéder à mon espace » ; la
  bannière `?compteCree=1` reste bannière (§39.2). `tableau-de-bord.spec.ts` : 17 tests
- [x] **LOT 10 — `/acheteur/commande` et `/acheteur/paiement/:id` (2026-10-02, §41)** : `.conteneur` sur les
  deux écrans, paiement porté de `--espace-4` à `--espace-5`, nouveau `.commande__corps` en deux colonnes dès
  `$point-desktop`, cinq titres de carte ramenés sur la classe globale `.carte__titre`, total et montant à payer
  en `--police-titre` + `--taille-xl`. **Décision — arbitrage des largeurs locales** : un plafond existant se
  **conserve** et se centre (`commande.scss` garde ses `32rem`), un écran sans largeur locale n'en reçoit
  **aucune** (`paiement.scss`) — le plafond ne se décrète pas écran par écran. Notices d'erreur du tunnel
  conservées en bannière (elles portent le focus et l'action). `commande.spec.ts` 34 → 38, `paiement.spec.ts`
  51 → 55, **une seule** assertion re-ciblée, avec la même chaîne
- [x] **LOT 11 — `/acheteur/commandes` et `/acheteur/commandes/:id` (2026-10-02, §41.1)** : les deux écrans
  portaient **déjà** le plafond §20 ; ajustements limités au rythme `--espace-5` du détail, au total en chiffre
  dominant et aux capitules des `dt`. Décisions : les lignes du détail **restent un `<table>`**
  `.tableau.tableau--maitre.tableau--empile` lié par `aria-labelledby` (§38.5) — trois tests de protection écrits
  **avant** le restylage, toute conversion en cartes doit d'abord révoquer §38.5 dans `FRONTEND_DESIGN.md` ;
  **aucun bloc paiement** sur ce détail, `CommandeResponse` n'exposant aucun champ de paiement et
  `detail-commande.ts` n'émettant aucun appel de paiement. `.ts` et `.html` des deux écrans inchangés
- [x] **LOT 12 — formulaires producteur (2026-10-02, §41.2)** : `/producteur/recoltes/nouvelle`,
  `/producteur/recoltes/:id/modifier` et `/producteur/profil` reçoivent la règle **« colonne étroite centrée dans
  le conteneur »** — le `44rem` **existant** passe de la racine de section sur `.conteneur`, `margin-inline: auto`
  **non ajouté** (le socle porte déjà `margin: 0 auto`). Filet de structure écrit **avant** le restylage sur le
  gabarit intact, specs portées à 27 et 35 tests, **aucune assertion existante retouchée**
- [x] **LOT 13 — listes producteur (2026-10-02, §41.3)** : `/producteur/recoltes` et `/producteur/commandes`
  prennent le plafond global **sans largeur nouvelle** (aucun `max-width` local à aligner) ; capitules,
  `tabular-nums`, total de « Commandes reçues » en chiffre dominant, rayon de `.commandes-recues__ligne` passé à
  `--rayon-surface`. Décisions : la **modale de suppression reste hors du `.conteneur`** (`.voile` est en position
  fixe, §31 — un test l'épingle) ; **les lignes de « Commandes reçues » restent une grille** et leur conversion en
  `table.tableau--maitre` est un **point de suivi**, pas une omission
- [x] **LOT 14 — `/recoltes/:id` centré (2026-10-02, §41.4)** : dernier écran à largeur locale non centrée,
  `46rem` **existant** déplacé de la `<section>` sur `.detail-recolte .conteneur`. Décision consignée : le rythme
  vertical **n'a pas** été déplacé vers un `gap` (la racine ne portait que `max-width`), divergence assumée avec
  la formule des autres écrans ; filet écrit avant restylage (26/26 sur le gabarit intact), **un** test de
  conteneur ajouté (27)
- [x] **LOT 15 — deux arbitrages §38.1 consignés (2026-10-02)** : lot **de documentation seule**, aucun fichier
  frontend modifié — `/admin` **ne porte pas** `.page--surface` (page d'entrée à trois cartes, aucune table donc
  aucun filet à faire lire sur blanc ; le fond crème reste voulu, ce n'est pas un écart) et **une confirmation
  destructive reste `.bouton--danger`** (§31, §5 : la hiérarchie d'encre ne repeint pas la désactivation d'un
  compte, non plus que « Retirer le prix »). Ces deux arbitrages **closent les derniers écarts ouverts de §38.1**
- [x] **LOT 16 — pages d'erreur centrées (2026-10-02, §41.5)** : `/acces-interdit` et `/**` (`PageIntrouvable`)
  — le `32rem` **existant** de `.page-interieure` passe de `styles/_composants.scss` sur
  `.page-interieure .conteneur` ; bordure pointillée et patron §20 conservés volontairement. Ces deux écrans
  n'avaient **aucune** spec : filet écrit avant restylage (5 tests par écran sur le gabarit intact, 6 après,
  12 au total), donc **aucune assertion existante n'a été modifiée — il n'y en avait pas**
- [x] **LOT 17 — écrans d'authentification centrés (2026-10-02, §41.6)** : `/connexion` et `/inscription` —
  `.auth` perd son `margin: 0 auto`, les plafonds **conservés** (`26rem` / `30rem`) passent sur
  `.auth .conteneur` ; l'écart de 4 rem entre les deux vient du contenu réel (cinq champs et un `fieldset` d'un
  côté, deux de l'autre). Décisions : la **duplication** des deux feuilles `.scss` est **assumée** (18
  déclarations byte-identiques sur 8 sélecteurs partagés) et sa consolidation est un **refactor hors campagne**.
  Par suite de ce lot, **toute largeur locale plafonnée de l'application passe par un `.conteneur` centré** — il
  ne reste plus une seule largeur locale non centrée
- [x] **LOT 18 — accessibilité des formulaires d'authentification (2026-10-02, §41.6)** : premier lot **de
  comportement** de la campagne, **aucun fichier de style touché** — `required` **et** `aria-required="true"` sur
  les champs réellement validés (le téléphone l'est parce que le composant le valide avec `Validators.required`),
  les deux champs conditionnels déclarés **à l'intérieur** de leur branche `@if`, donc seulement quand ils sont
  affichés ; `focusSurPremierChampInvalide()` parcourt une liste **ordonnée comme le DOM** et pose **un seul**
  focus, après un échec de validation locale **et** après un objet `erreurs` du backend ; une erreur **générale**
  seule ne déplace rien (sa bannière est déjà en `role="alert"`). Décisions : **pas** de `role="alert"` sur
  `.champ__erreur` (zone live `assertive` qui interromprait la lecture à chaque frappe — la perception passe par
  le focus, `aria-required`, `aria-invalid` et `aria-describedby`) ; `novalidate` conservé, donc **aucune bulle
  native**. **Limite consignée** : le `fieldset` du groupe de rôles ne porte ni `id`, ni `aria-describedby`, ni
  `aria-invalid` ; le focus posé sur son premier radio annonce le groupe, pas le texte de l'erreur
- [x] **5.11 — Validation de la campagne** : au terme du LOT 18, suite complète **834 tests dans 42 fichiers**,
  `npx tsc -p tsconfig.spec.json --noEmit` et `tsc` applicatif **sans erreur**, `npm run build` **réussi sans
  aucun avertissement** (ni budget dépassé). Le filet de structure de chaque LOT a été écrit **sur le gabarit
  alors non modifié** et rejoué vert avant tout restylage ; les suites des écrans non touchés sont restées
  inchangées. **Aucune de ces portes n'est une validation en navigateur** : rien dans ces deux campagnes n'a été
  observé rendu, ni mesuré, ni lu par un lecteur d'écran réel

### Décisions d'arbitrage consignées (renvoi, pas de recopiage)

- §38.1 hiérarchie d'encre sans nouvelle palette, `.page--surface` réservé, et les **deux arbitrages LOT 15**
  (surface de `/admin`, couleur du bouton de confirmation destructive)
- §38.2 format des dates livré conservé malgré la maquette — écart **voulu**
- §38.3 navigation partagée au lieu de routes fusionnées
- §38.4 « une maquette n'autorise ni à inventer une donnée, ni à en supprimer une » + tableau des trois éléments
  absents du contrat
- §38.5 « une table dense n'est pas une table transportée » (`.tableau--empile`, quatre largeurs de contrôle)
- §39 / §39.1 refonte visuelle, tokens autorisés et **périmètre de la maquette** (`figma-reference/` ne couvre
  que l'accueil)
- §39.2 notice = mécanisme unique de retour d'action **et son tableau d'exclusion** : ce qui reste bannière, écran
  par écran, avec le motif
- §40 tableau de bord (conteneur imbriqué, pas de surface blanche, aucun bloc par rôle)
- §41 arbitrage des largeurs locales, §41.1 lignes du détail en `<table>` et absence de bloc paiement,
  §41.2 à §41.6 « colonne étroite centrée dans le conteneur », §41.3 grille de « Commandes reçues » conservée,
  §41.6 décisions d'accessibilité du LOT 18 et limite du groupe de rôles

### Reste à faire à la fin de la campagne

- [ ] **QA navigateur réelle des quatre largeurs 375 / 768 / 1024 / 1366** : jamais jouée sur ces deux campagnes
  (§38.5, et rappelé écran par écran en §40 et §41.1 à §41.6) — ni parcours cliqué, ni mesure de centrage, ni
  rendu des capitules et du chiffre dominant vérifiés visuellement
- [ ] **Lignes de `/producteur/commandes` en grille contre table** : point de suivi ouvert (§41.3), la conversion
  en `table.tableau--maitre` étant ce qu'impose §38.5 pour une liste dense ; la grille actuelle est **assumée** et
  ne doit pas être « corrigée » par un alignement implicite
- [ ] **Erreur du groupe de rôles non annoncée à l'inscription** : `fieldset` sans `id`, sans
  `aria-describedby` ni `aria-invalid` (§41.6) ; à traiter si l'obligation d'un `aria-describedby` sur ce groupe
  est décidée un jour
- [ ] **Consolidation des deux feuilles `.auth`** : duplication byte-identique assumée (§41.6) ; refactor **hors
  campagne de design**, à décider séparément
- [ ] **Décision de fusion de `refonte-design`** : la branche porte les commits de conception (quatre préliminaires
  et les lots 1 à 18) et deux lots documentaires ; rien n'a été fusionné dans `main`, et cette décision appartient à
  l'auteur du projet

## Lots paiement P1 → P2d — règle « paiement avant confirmation » (détail réel)

> **Ce que couvre cette section** : les cinq lots menés après la campagne de design, consignés d'après
> `git log` (messages et dates des commits, aucun hash), le code backend et frontend relu sur `main`, et
> `FRONTEND_DESIGN.md` §41.7 à §41.9. « P1 », « P2a », « P2b », « P2c », « P2d » sont des **repères de
> consignes de travail**, dans le même esprit que l'avertissement de numérotation de la section
> « Sous-phases 5.2 → 5.9-bis ».
>
> **Porte de validation de ces cinq lots** : `./mvnw test` sur PostgreSQL réel (aucun mock) pour les deux lots
> backend, specs Vitest/jsdom + `npx tsc -p tsconfig.spec.json --noEmit` + `npm run build` pour les trois lots
> frontend. **Aucun de ces écrans n'a été observé dans un navigateur réel pour ces lots**, et les quatre
> largeurs 375 / 768 / 1024 / 1366 n'y ont pas été jouées. Les comptes de tests sont ceux **rapportés à
> l'exécution de chaque lot** ; aucune suite n'a été relancée pour la rédaction de cette section.

- [x] **LOT P1 — le paiement avant la confirmation, côté serveur (2026-10-03)** : commit
  « feat(paiement): exige le paiement avant confirmation des livraisons » — `CommandeService` refuse
  `CONFIRMEE` et `PRETE` pour une commande en `LIVRAISON` tant que son paiement n'est pas `REUSSI`
  (deux messages `400` distincts, vérifiés **après** « déjà au statut » et « transition interdite », **avant**
  toute écriture ; sans effet en `RETRAIT` ; identiques pour un acheteur, un producteur ou l'ADMIN). La
  simulation pose la réussite à l'enregistrement (`PaiementService.appliquerLaReussiteSimulee` : `REUSSI`,
  `date_confirmation` horodatée, référence `SIMU-…`), une annulation solde `REUSSI` en `REMBOURSE` et
  `EN_ATTENTE` en `ANNULE` en plus de restaurer le stock, et la contrainte `uq_paiements_commande` remonte
  comme le même message métier `400` qu'un contrôle d'existence, jamais en `500`. Migration
  `V2__paiement_statut_rembourse.sql` : **remplace** `ck_paiements_statut` de V1, aucune colonne touchée.
  Suite backend : **207 → 220 tests**
- [x] **LOT P2a — le paiement rendu avec la commande (2026-10-03)** : commit « feat(commande): expose le statut
  et le moyen de paiement » — `CommandeResponse` porte `statutPaiement` et `moyenPaiement` **en fin de
  record** (aucun appelant positionnel cassé), `null` et `null` pour une commande sans paiement : l'API
  n'invente jamais de paiement. En liste, les paiements sont lus par `findByCommandeIdIn`, donc **une seule
  requête de plus quelle que soit la taille de la liste**. Suite backend : **220 → 228 tests**
- [x] **LOT P2b — commandes reçues du producteur (2026-10-03)** : commit « feat(frontend): affiche le paiement
  et bloque la confirmation des livraisons non payées » — une ligne « Paiement » par carte (source unique
  `libellePaiement()` : « Aucun paiement » si `statutPaiement` est `null`, sinon `Moyen — Statut`, le libellé
  « Remboursé (simulé) » pour `REMBOURSE`), et bouton d'étape **neutralisé mais resté focusable**
  (`aria-disabled`, jamais `disabled`) avec son motif en `role="status"` relié par `aria-describedby` quand la
  règle du LOT P1 s'applique. Le frontend **anticipe** le refus du serveur sans le remplacer : la garde TS
  (`core/utilitaires/paiement-commande.ts`) reflète `CIBLES_EXIGEANT_UN_PAIEMENT` et reprend les deux phrases
  du service octet pour octet. Suite frontend : **834 → 871 tests** (42 → 43 fichiers)
- [x] **LOT P2c — l'acheteur peut payer dès la confirmation (2026-10-04)** : commit « feat(frontend): permet de
  payer dès la confirmation et affiche le paiement des deux côtés » — le lien « Payer la commande » reste
  proposé tant que la commande est payable (`EN_ATTENTE`, `CONFIRMEE`, `PRETE`) et qu'aucun paiement n'est
  enregistré, la fiche de l'acheteur affiche le paiement avec **la même source unique** que celle du
  producteur (aucun vocabulaire de paiement dupliqué), et une livraison non payée porte l'annonce de la règle.
  **Trois tests existants** qui interdisaient **tout** vocabulaire de paiement sur la fiche acheteur ont été
  **re-ciblés** (le paiement s'y affiche désormais) et une assertion de lien retirée ; le commit ne retire
  aucun test sans remplacement — décompte statique des `it(` : 796 avant, 812 après. Suite frontend :
  **871 → 906 tests**
- [x] **LOT P2d — finitions de l'écran producteur (2026-10-04)** : commit « feat(frontend): actualise la liste
  producteur, formate la date de paiement et documente le paiement » — bouton « Actualiser » en tête de liste,
  qui relit **sans effacer** ce qui est affiché (`aria-disabled` + garde TS pendant une lecture en vol ou une
  transition, une seule requête pour deux clics, échec = liste conservée et message rendu), et écouteur
  `visibilitychange` sur le `document` qui relit au retour de l'onglet et se retire par `DestroyRef` (le seul
  `addEventListener` hors specs du frontend) ; `date_confirmation` rendue par `formaterDateHeure` sur l'écran
  de paiement au lieu de l'ISO brute ; règles consignées en `FRONTEND_DESIGN.md` §41.7 à §41.9, **ajout pur**,
  aucune règle existante modifiée. Suite frontend : **906 → 918 tests**
- [x] **Clôture Git de la série** : les cinq lots ont été **fusionnés dans `main` par l'auteur** (cinq merges
  de branche, un par lot, d'après `git log`). À la rédaction de cette section, `main` porte **228 méthodes
  `@Test`** dans `sunurecolte-backend/src/test` (décompte statique, concordant avec le total rapporté à la
  clôture du LOT P2a) et **850 déclarations de tests** (`it(` et `it.each(`) dans **43 fichiers** de spec,
  décompte statique qui n'est pas le total exécuté et n'a pas été rejoué ici
- [x] **Ce que ces lots rendent obsolètes** : trois affirmations antérieures de cette liste ne décrivent plus
  l'API — « le serveur n'écrit que `EN_ATTENTE` » (ligne « Paiement simulé » de la Phase 9, **corrigée** car
  c'est une affirmation au présent), « Aucune route, aucun service, aucun job n'écrit `REUSSI` ni `ECHOUE` »
  et « Simulation enregistrée — paiement en attente. » (audit et résultat du lot 5.5.8, **laissés en l'état**
  comme comptes rendus datés du 2026-09-29), et « aucune notification de paiement à afficher (le backend n'en
  produit pas) » (« Limites connues » de 5.5.9, dépassée dès 5.7). La notification de paiement elle-même reste
  portée par la note « Divergence signalée (5.5.9) » de la Phase 7.

### Reste à faire à la fin du lot paiement

- [ ] **Bouton « Annuler » côté producteur** : **décision prise, à faire**. `CommandeService`
  l'admet (une cible `ANNULEE` est acceptée pour toute partie prenante de la commande, donc pour un producteur
  concerné), mais l'écran « Commandes reçues » n'expose aucune annulation
- [ ] **Chargement groupé des lignes de commande (N+1)** : le LOT P2a a groupé les paiements, **pas les
  lignes** — le N+1 `lignes → recoltes` de `CommandeService.versResponse` est préexistant et hors périmètre
  des lots paiement ; le groupement se jouerait en deux temps, les lignes puis les récoltes
- [x] QA manuelle du flux de paiement et du 429 jouée par l'auteur le 2026-10-05 : [Test 429 réalisé et réussi ]
- [ ] **Préparation du déploiement** : rien n'est engagé — un proxy inverse réel avec sa résolution
  d'en-têtes (`server.forward-headers-strategy`, sinon le limiteur de connexions lit l'adresse du proxy pour
  tout le monde et le blocage frapperait tous les clients à la fois), les secrets hors Git
  (`JWT_SECRET`, `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`) et une politique de sauvegardes PostgreSQL
- [ ] **Délai réel de verrou (`lock_timeout`)** : le hint `jakarta.persistence.lock.timeout` est posé par
  `CommandeRepository` mais **mesuré inerte** sur PostgreSQL avec Hibernate / Spring Boot 3.3.4 (aucune ligne
  `SET LOCAL lock_timeout` ni `nowait` dans le SQL émis) ; aucun test ne l'exerce, et une expiration de verrou
  remonterait aujourd'hui au handler générique en `500`
- [ ] **Mot de passe de l'administrateur initial à renforcer** : l'amorçage local accepte encore 6 caractères
  (`AdminInitializer`, constante `LONGUEUR_MINIMALE_MOT_DE_PASSE`) alors que l'inscription publique en exige 8
  depuis le LOT P4 ; remonter ce plancher reste à valider par l'auteur
- [ ] **Vrai prestataire de paiement** : non engagé, et rien dans ce dépôt ne l'annonce — une intégration Wave
  ou Orange Money réelle demanderait un accès API effectif, une configuration et des tests

## Lots concurrence et authentification P3 → P4 — la règle tient-elle sous la charge (détail réel)

> **Ce que couvre cette section** : les trois lots menés après les lots paiement, consignés d'après `git log`
> (messages et dates des commits, aucun hash) et le code backend et frontend relu sur `main`. « P3 », « P3b »
> et « P4 » sont des **repères de consignes de travail**, dans le même esprit que la section
> « Lots paiement P1 → P2d ».
>
> **Porte de validation de ces trois lots** : `./mvnw test` sur PostgreSQL réel (aucun mock) pour les deux lots
> de concurrence et pour la partie backend du lot d'authentification, specs Vitest/jsdom +
> `npx tsc -p tsconfig.spec.json --noEmit` + `npm run build` pour sa partie frontend. **Aucun de ces rendus
> n'a été observé dans un navigateur réel**, et les largeurs 375 / 768 / 1024 / 1366 n'y ont pas été jouées.
> Les comptes de tests sont ceux **rapportés à l'exécution de chaque lot** (207 → 220 → 228 → 234 puis 236 →
> 247 backend, 918 → 922 frontend sur la série complète P1 → P4) ; aucune suite n'a été relancée pour la
> rédaction de cette section.

- [x] **LOT P3 — le stock et le paiement sous requêtes réellement simultanées (2026-10-04)** : commit
  « test: prouve la tenue du stock et du paiement sous concurrence (annulation concurrente : échec connu) » —
  `ConcurrenceApiTest`, six tests qui font **partir deux requêtes en parallèle**. La classe n'étend pas
  `IntegrationTestSupport` : cette base est `@Transactional` donc annulée, et des données rollbackées restent
  invisibles aux autres connexions ; elle est autonome (préparation par `TransactionTemplate`, état final lu
  par `JdbcTemplate`, nettoyage `@AfterEach` en ordre de clés étrangères, contrôlé à zéro résidu après 20
  passages). Stable 20/20 : la dernière unité n'est vendue qu'une seule fois, un stock de trois unités ne se
  vend pas au-delà de trois commandes, deux commandes sur les mêmes récoltes prises dans l'ordre inverse ne
  s'interbloquent pas (l'ordre « récoltes triées par identifiant » tient), deux paiements simultanés laissent
  **un** paiement et un refus métier `400`, et le doublon rejeté par la contrainte `uq_paiements_commande`
  atteint pour de vrai le `catch` de `enregistrerSansDoublon` et rend le **même** message `400` que le contrôle
  d'existence, jamais un `500`. Le sixième test — deux annulations simultanées — est commité **rouge** et le
  reste à chaque exécution. Suite backend : **228 → 234 tests, 1 échec connu**
- [x] **LOT P3b — l'annulation concurrente rendait le stock deux fois (2026-10-04)** : commit
  « fix(commande): verrouille la commande pour que l'annulation et le paiement soient sérialisés » — défaut
  trouvé par le test laissé rouge ci-dessus : `Statuts reçus [200, 200]` et `stock final observé 7.00` là où la
  règle attend `[200, 400]` et `5.00`. Cause unique : **le statut de la commande est lu et validé sans verrou**,
  dans `changerStatut` comme dans `PaiementService.creer`. Trois tests portent sur ce mode et leurs taux
  d'échec ont été mesurés **avant** correctif, dans un worktree détaché : deux annulations simultanées
  `20/20` rouge, paiement contre annulation `12/20`, confirmation contre annulation `18/20` — les cinq autres
  n'ont jamais été rouges. Correctif : `findByIdForUpdate` en `@Lock(PESSIMISTIC_WRITE)` dans
  `CommandeRepository`, contrôle d'accès gardé sur la lecture **sans** verrou (un non-autorisé ne doit pas
  pouvoir verrouiller une commande qui n'est pas la sienne) puis relecture verrouillée par
  `entityManager.refresh` pour toute décision et tout effet, et `PaiementService.creer` qui verrouille la
  commande avant de lire son statut et l'existence d'un paiement. Deux questions restées ouvertes avant
  l'écriture ont été tranchées par la mesure : le hint `lock.timeout` de Jakarta Persistence est **posé mais
  inerte** sur PostgreSQL avec Hibernate / Spring Boot 3.3.4 (aucune ligne `SET LOCAL lock_timeout` dans le SQL
  émis, aucun test ne l'exerce), et une JPQL verrouillée **ne recharge pas** l'instance déjà managée —
  détacher la lecture d'accès corrigeait la relecture mais cassait la transaction de test partagée. Classe
  rejouée **20/20 verte
  sur 20 passages**, huit tests. Suite backend : **234 → 236 tests**
- [x] **LOT P4 — huit caractères à l'inscription, tentatives de connexion limitées (2026-10-04)** : commits
  « feat(auth): impose 8 caractères à l'inscription » puis « feat(auth): limite les tentatives de connexion » —
  `@Size(min = 8)` sur `InscriptionRequest.motDePasse` (« Le mot de passe doit contenir au moins 8 caractères »)
  et **aucune règle de longueur dans `ConnexionRequest`** : la connexion n'impose rien, pour ne fermer aucun
  compte créé plus tôt avec 6 ou 7 caractères — un test le vérifie sur un compte réellement écrit en base. Le
  frontend reprend le même plancher (`Validators.minLength(8)`, attribut `minlength="8"`, aide « 8 caractères
  minimum. ») et **aucun code de production** n'a été nécessaire pour le `429` : l'intercepteur n'agit que sur
  `401` et `messageErreurApi` rend déjà le message du serveur. Limitation : `LimiteTentativesConnexion` — cinq
  tentatives sans succès pour un couple (email normalisé, adresse vue par le serveur) dans une fenêtre de
  quinze minutes arment quinze minutes de blocage, comptage **atomique sur l'état précédent**, placé **avant**
  toute comparaison de mot de passe, email inconnu compté comme email connu, connexion réussie effaçant
  l'historique du couple, refus rendu en `429` avec `Retry-After` en secondes restantes. Limite assumée et
  écrite en README : compteur **en mémoire dans une seule instance**, remis à zéro au redémarrage, et adresse
  du proxy partagée par tous les clients sans résolution d'en-têtes de confiance. Le `400` rendu à sept
  caractères et la séquence `401` cinq fois puis `429` ont été vérifiés en HTTP réel sur l'instance locale le
  2026-10-05 — pas dans un navigateur. Suite backend : **236 → 247 tests** ; suite frontend :
  **918 → 922 tests** (43 fichiers)
- [x] **Clôture Git de cette série** : les deux branches ont été **fusionnées dans `main` par l'auteur**
  (merges de branche visibles dans `git log`)
- [x] **Ce que ces lots rendent obsolètes** : trois affirmations de la section précédente ne décrivent plus le
  code — « **aucun test exécuté ne fait partir deux requêtes en parallèle** » et « ce chemin n'est couvert que
  par le `catch` de `enregistrerSansDoublon` » (le LOT P3 les joue l'une contre l'autre), et « **LOT P4 —
  authentification du paiement** : non engagé » (le LOT P4 porte sur l'authentification des comptes, pas sur le
  module paiement). Le paragraphe de `FRONTEND_DESIGN.md` §34 qui affirmait un paiement **toujours**
  `EN_ATTENTE` et aucun `REUSSI` possible a été corrigé par le présent lot documentaire ; le passage
  « Résultat » du même §34, qui donne
  encore « Simulation enregistrée — paiement en attente. » comme titre rendu après une simulation, est
  **laissé en l'état** et signalé à l'auteur : ce titre reste mappé sur `EN_ATTENTE` dans le composant, mais le
  serveur écrit `REUSSI` à l'enregistrement.

## LOT STAT-1 — statistiques de vente du producteur (2026-10-08)

> **Ce que couvre cette section** : le premier lot de fonctionnalités utilisateur après les lots
> concurrence et authentification, consignés d'après le code réellement en place (backend et frontend
> relus, tests exécutés) et les messages de commits, **aucun hash**.
>
> **Porte de validation** : `./mvnw test` sur PostgreSQL réel (aucun mock) pour le backend ; specs
> Vitest/jsdom + `npx tsc -p tsconfig.app.json --noEmit` + `npx tsc -p tsconfig.spec.json --noEmit` +
> `npx ng build` pour le frontend. **Aucun de ces rendus n'a été observé dans un navigateur réel** : les
> trois pastilles de période, les deux graphiques, l'état vide, la notice d'erreur du bas et les largeurs
> 360 / 768 / 1366 restent à jouer à la main.

- [x] **Backend — `GET /api/producteurs/moi/statistiques`** : paramètre `periode` à trois valeurs
  (`7j`, `30j` par défaut, `mois`), **réservé PRODUCTEUR** (`SecurityConfig` + recontrôle du
  rôle dans le service) : un ACHETEUR reçoit `403`, un ADMIN `403`, un anonyme `401`. Le producteur est
  **toujours déduit du jeton** — aucun identifiant de producteur n'est accepté en paramètre, et un test
  joue exprès un `producteurId` passé en query pour prouver qu'il est ignoré. Règle exacte écrite dans la
  Javadoc de `StatistiquesProducteurService` : le grain est la **ligne de commande** jointée à
  `recolte.producteur`, jamais le `total` de la commande (une commande peut mélanger plusieurs
  producteurs, vérifié dans `CommandeService.creer`) — un test joue réellement une commande mélangeant
  les récoltes de **deux producteurs** et vérifie que chacun ne voit que le montant de ses lignes, et que
  `nombreCommandes` compte cette commande **une seule fois** chez chacun ; `7j` = 7 jours civils courants,
  `30j` (défaut) =
  30, `mois` = du 1ᵉʳ du mois courant à aujourd'hui, borne haute exclusive ; une valeur hors de ces trois
  libellés répond `400` avec un message en français ; les annulées sont **exclues des sommes** et
  **comptées dans le dénominateur** du taux d'annulation ; `panierMoyen` divise le chiffre d'affaires par
  les commandes **retenues** (hors annulées) pour que numérateur et dénominateur soient cohérents ;
  `ventesParJour` rend **une entrée par jour civil, sans trou** (jours à 0 compris) ; `topRecoltes` est
  limité à **5**, revenu décroissant ; `stockFaible` porte sur l'état **actuel** des récoltes (sous le
  seuil `5` ou `EPUISEE`, la période ne s'y applique pas) ; `commandesATraiter` compte EN_ATTENTE,
  CONFIRMEE et PRETE. Cinq projections et un repository dédié (`StatistiquesLigneCommandeRepository`)
  font le travail en requêtes agrégées : **aucune entité chargée pour calculer une somme, aucun N+1**,
  aucune dépendance Maven ajoutée. Suite backend : **247 → 262 tests** (`StatistiquesProducteurApiTest`,
  15 tests, `Failures: 0`)
- [x] **Frontend — écran `/producteur/statistiques`** : route lazy protégée par `authGuard` puis
  `roleGuard` (`roles: ['PRODUCTEUR']`), service `StatistiquesService` typé sur les DTO réels, écran en
  quatre cartes (Chiffre d'affaires, Panier moyen, Commandes, Taux d'annulation), ventes par jour en
  colonnes, top récoltes en barres horizontales avec **quantité + unité puis revenu**, répartition par
  statut, stock à surveiller avec lien vers l'édition de la récolte et rappel des commandes à traiter avec
  lien. **Aucune bibliothèque de graphique** : `app-barres` (`frontend/src/app/partage/graphiques/`) est
  un composant SVG maison, posé dans le dossier partagé parce que le lot statistiques de l'ADMIN doit le
  réutiliser. Un SVG **sans `viewBox`** (largeurs en %, hauteurs en px, `font-size` en tokens) pour
  aucune déformation typographique ; chaque graphique porte `role="img"` + `<title>` et un **tableau
  alternatif** présent en permanence dans le DOM et masqué visuellement. Palettes et tailles viennent des
  tokens ; `formaterMontant` et `formaterQuantite` rendent les montants en FCFA. Les trois périodes sont
  des pastilles du motif catalogue (`aria-pressed`), une région `role="status" aria-live="polite"` rendue
  **hors condition** annonce le changement de période. Erreur : **notice depuis le bas** (`ToastService`,
  §39.2) **et** zone actionnable « Réessayer », jamais de bannière ; états chargement et vide (avec lien
  « Ajouter une récolte ») rendus. Une entrée d'espace ajoutée en markup seul dans `mes-recoltes.html`,
  au même traitement que « Profil » (§36) ; `/tableau-de-bord` et `mes-recoltes.ts` non touchés.
  `npx ng build` rendu **sans aucune ligne** `warning|error|budget|exceed`
- [x] **Limites connues, assumées et non masquées** (écrites dans la Javadoc du service) :
  **(a)** les commandes **EN_ATTENTE sont incluses** dans le chiffre d'affaires et dans le panier
  moyen — une commande enregistrée mais pas encore honorée y figure, ce qui surestime les encaissements si
  l'acheteur renonce ensuite sans annuler ; **(b)** le seuil de stock faible (**5**) est un nombre
  unique comparé à `quantite_disponible` **quelle que soit l'unité** : 5 kg, 5 bottes ou 5 tonnes
  déclenchent la même alerte. Sur l'écran, le chiffre d'affaires et le panier moyen sont libellés
  « Hors commandes annulées. » pour ne pas faire croire à des encaissements définitifs
- [x] **Tests frontend** : **922 → 955 tests (47 fichiers)**, soit **+33** sur quatre nouveaux fichiers —
  `statistiques.service.spec.ts` (7 : URL exacte, `periode` seul paramètre, absence par défaut, aucune clé
  `producteurId`, `403` remonté), `barres.spec.ts` (7 : `role="img"` + `<title>`, tableau alternatif,
  longueurs de barres exactes, colonnes, zéros sans division par zéro, étiquettes sur un trentième),
  `statistiques.spec.ts` (17 : trois états, période par défaut `30j`, montants et taux formatés, deux
  graphiques et leurs entêtes, quantité + unité, aucune requête au second clic sur la pastille active,
  annonce après changement de période, erreur en notice `type 'erreur'` **et absence de `.message--erreur`**,
  « Réessayer » et « Actualiser », état vide, répartition, stock, rappel) et
  `routes-statistiques.spec.ts` (2 : la table de routes lue comme structure, **aucun composant monté**).
  **Une assertion re-ciblée** : `mes-recoltes.spec.ts` numérotait exactement les liens d'en-tête ; le lien
  « Statistiques » demandé par le lot s'y insère, le test attend donc cinq liens avec leur identifiant et
  leur libellé. **Aucune assertion supprimée ni affaiblie** ; la spec du producteur côté commandes reçues
  est inchangée
- [x] **Ce qui reste ouvert** : QA navigateur réelle — **jouée** sur cet écran et reprise par le
  **LOT QA-STAT-1** ci-dessous, qui en traite **cinq** défauts (les huit points du rapport de lot
  n'ont pas été redéroulés un par un) ; les largeurs ont été **mesurées** dans ce même lot, pas
  observées à l’œil hors de la fenêtre pilotée ; reste le lot statistiques de l'**ADMIN** qui doit
  réutiliser `app-barres`, et la remise d'aplomb du seuil de stock par unité si l'auteur le valide.
  Travail porté par la branche `fonctionnalites-statistiques`, **non poussé**

## LOT DEMO-1 — jeu de données de démonstration derrière un profil (2026-10-08)

> **Ce que couvre cette section** : le mécanisme qui remplit une base locale vide pour parcourir les
> écrans et préparer les captures du mémoire, consigné d'après le code réellement en place (composant,
> tests et documentation relus, suite exécutée). **Le jeu a depuis été généré contre une base locale
> vide et parcouru dans le navigateur** : ce que garantit cette section, ce sont les tests
> d'intégration, et les défauts que l'écran a montrés sont traités et consignés par le **LOT QA-STAT-1**
> ci-dessous.
>
> **Porte de validation** : `./mvnw test` sur PostgreSQL réel (aucun mock), la classe dédiée jouant le
> composant dans la transaction du test.

- [x] **Backend — `DemoDataInitializer`** (`config/`, à côté d'`AdminInitializer`) : un
  `CommandLineRunner` annoté `@Profile("demo")`, donc inerte tant que `spring.profiles.active` ne
  contient pas `demo`. Trois garde-fous, vérifiés dans cet ordre et **avant** toute écriture : profil
  à activer explicitement ; `demo` **et** `prod` ensemble refusent le démarrage par une
  `IllegalStateException` en français — contrôle porté sur l'environnement Spring, donc effectif même
  si aucun `application-prod.properties` n'existe encore ; mot de passe absent ou de moins de
  **8 caractères** refuse aussi le démarrage. Le plancher de 8 est celui de l'inscription publique
  (`InscriptionRequest`), puisque ce mot de passe sert également à se connecter. Aucun `data.sql`,
  aucune migration Flyway : le schéma reste la seule autorité
- [x] **Contenu du jeu, écrit par les services réels** : 3 producteurs (maraîchère, élevage, et une
  exploitation céréalière et fruitière), 6 acheteurs (2 commerçants, 2 restaurateurs, 2 particuliers),
  20 récoltes (8 + 4 + 8) et 60 commandes. Chaque écriture passe par `AuthService.inscrire` (hash
  BCrypt, profil créé avec le compte), `ProducteurService.modifierMoi` (profil complet),
  `RecolteService.creer`, `CommandeService.creer` (prix unitaire et totaux calculés serveur, stock
  décrémenté sous verrou, passage à `EPUISEE` à zéro, notification de chaque producteur concerné),
  `PaiementService.creer` (montant repris du total serveur, référence `SIMU-…`) et
  `CommandeService.changerStatut` (transitions autorisées, paiement exigé avant confirmation d'une
  livraison, stock rendu et paiement soldé à l'annulation). **Aucune écriture directe en base, aucun
  contournement** : le modèle approuvé n'admet qu'une filière par producteur, donc l'exploitation
  « mixte » est `AUTRE` et son détail tient dans la description
- [x] **États réellement rendus aux écrans, obtenus par la règle et non par une force** : 10
  `EN_ATTENTE`, 12 `CONFIRMEE`, 8 `PRETE`, 22 `LIVREE`, 8 `ANNULEE` ; les trois **premières** commandes
  mélangent deux producteurs distincts ; `Piment fort` descend à un stock **piloté** de 0 et devient
  `EPUISEE` par la règle de `CommandeService`, `Salade` (3,50 botte) et `Mangue` (4,00 kg) s'arrêtent
  sous le seuil d'alerte **5** de `stockFaible` (LOT STAT-1) — ces trois récoltes sont vendues par des
  commandes **pilotées** (un rang dédié, une quantité calculée pour tomber juste sur le stock visé) et
  sont exclues du tirage libre ; les autres récoltes suivent les tirages, sans garantie de rester
  au-dessus. Le stock restant est suivi côté générateur pour ne **jamais** demander au service
  plus que le disponible, et une quantité hors stock lève une exception au lieu d'être silencieusement
  réduite. Les paiements portent `WAVE` et `ORANGE_MONEY`, les deux seuls que connaisse
  `MoyenPaiement` ; `imageUrl` est vide partout, donc le catalogue rend son état « sans image » — la
  seule image du dépôt (`frontend/public/images/hero.jpg`) n'est pas une photo de récolte et aucun
  lien externe n'a été inventé
- [x] **Génération déterministe et idempotence** : une graine unique (`GRAINE`) rend les mêmes tirages,
  donc deux bases vides obtiennent les mêmes dates, quantités et statuts. Si le premier compte de
  démonstration existe déjà (`existsByEmail` sur `producteur1.demo@sunurecolte.sn`), **rien n'est créé
  et rien n'est supprimé**, une ligne INFO est journalisée ; les journaux ne portent que des adresses
  email, jamais le mot de passe
- [x] **Dates étalées — l'arbitrage consenti par l'auteur** : `Commande.dateCreation` retrouve une
  colonne **modifiable** et le `@PrePersist` ne pose plus qu'une date **absente**. C'est le seul moyen
  d'étaler les 60 commandes sur les 60 derniers jours sans toucher aux DTO ni à l'API :
  `CommandeRequest` ne déclare toujours pas cette valeur, aucun chemin d'API n'accepte une date du
  client. La date est écrite **après** tout le cycle de la commande, sinon le
  `entityManager.refresh()` du verrou pessimiste (LOT P3) l'écraserait. Un test le prouve : une
  commande créée par `CommandeService` en usage normal garde l'horodatage du serveur, et la colonne
  reste malgré tout inscriptible.
  **Pourquoi le retrait de `updatable = false` est indispensable** (et non un réflexe de confort) :
  `@GeneratedValue(strategy = IDENTITY)` force l'INSERT dès `commandeRepository.save(...)` dans
  `CommandeService.creer`, donc le `@PrePersist` fige `dateCreation` **avant** que le générateur
  connaisse l'identifiant — aucune écriture antérieure au premier persist n'est possible sans déclarer
  une date dans `CommandeRequest`, ce qui serait un champ accepté du client, proscrit. Le test a été
  rejoué avec l'attribut rétabli : **2 échecs sur 9**, et surtout **aucune erreur Hibernate** — la
  colonne est silencieusement exclue de l'UPDATE, l'étalement redevient inopérant sans rien prévenir.
- [x] **Tests — `DemoDataInitializerTest`, suite backend 262 → 271** (`Failures: 0`) : 9 tests sur
  PostgreSQL réel, dans la transaction du test pour rien laisser en base. Effectifs (9 utilisateurs,
  3 producteurs, 6 acheteurs, 20 récoltes, 60 commandes, notifications non nulles), les cinq statuts
  avec leurs quantités, commandes mixtes, **aucun stock négatif**, récolte `EPUISEE` et deux récoltes
  sous le seuil, paiements bornés aux statuts que les services écrivent (`EN_ATTENTE`, `ECHOUE` et
  `ANNULE` explicitement **absents**, `REMBOURSE` = 4, total = `REUSSI` + 4), étalement des dates
  (aucune dans le futur, aucune avant les 60 jours, et des commandes aux deux bouts de la fenêtre —
  au-delà de 30 jours comme dans les 7 derniers ; l'horodatage de référence est pris **après** la
  génération), deuxième exécution sans doublon, refus `demo` + `prod`, refus sans mot de passe ou trop
  court **avec rien de créé**. Deux précautions :
  **aucun test n'active le profil `demo`** (un runner de profil tournerait hors transaction et
  committerait ses écritures) — le composant est instancié avec les beans réels et un
  `StandardEnvironment` ; et les compteurs JPQL sont restreints au suffixe `%.demo@sunurecolte.sn`,
  pour ignorer les données de QA déjà présentes en base locale. Vérifié en sus : aucun autre test du
  dépôt ne mentionne `@ActiveProfiles` ni `spring.profiles.active`, et la CI ne pose que `JWT_SECRET`
- [x] **Documentation** : README §9 « Données de démonstration (profil `demo`) » — commande exacte
  (Git Bash et PowerShell), comptes en **adresses email seulement**, contenu du jeu, trois garde-fous,
  idempotence, remise à zéro par recréation de la base locale (signalée comme destructive des données
  de test), limites ; bloc de commentaires dans `application.properties` qui **ne déclare aucune
  valeur** ; Javadoc du composant portant la méthode et les règles
- [x] **Limites connues, assumées et non masquées** : **(a)** seules les **commandes** sont étalées —
  paiements et notifications gardent l'horodatage de génération, une capture de l'historique de
  paiement ou du centre de notifications les montrera donc tous le même jour ; **(b)** les statuts de
  paiement `EN_ATTENTE`, `ECHOUE` et `ANNULE` n'existent pas dans le jeu, parce qu'aucun service ne
  sait les écrire et qu'une écriture directe serait une invention ; **(c)** le mot de passe des neuf
  comptes est celui de la variable d'environnement, commun à tous — ce jeu n'est pas une démonstration
  de l'isolation par compte ; **(d)** le profil demo ne crée **aucun** ADMIN, l'amorçage du README §4
  reste nécessaire pour `/admin` ; **(e)** une récolte dont la vente est pilotée refuse le prélèvement
  libre, le catalogue des commandes mélangeuses est donc plus restreint sur ces trois lignes ; **(f)**
  depuis la génération du jeu, **seul `/producteur/statistiques` a été observé en navigateur** — et il y
  a montré cinq défauts, traités par le LOT QA-STAT-1 ci-dessous
- [x] **Ce qui reste ouvert** : parcourir en navigateur les autres écrans que le jeu doit nourrir
  (catalogue, commandes reçues, espace acheteur, notifications) avant les captures du mémoire, et
  **régénérer la base** pour qu'elle porte l'arrondi au demi-unité décidé au LOT QA-STAT-1 — la
  régénération est destructive, donc menée par l'auteur ; décider si l'étalement des paiements et des
  notifications vaut un lot supplémentaire. Travail porté par la branche
  `fonctionnalites-statistiques`, **non poussé**

### Ajustement du jeu demandé par l'écran statistiques (2026-10-09)

> **Ce que couvre cette sous-section** : les trois demandes de l'auteur (stocks de départ plus larges
> pour ne pas noyer l'écran sous les alertes, annulations réparties et lisibles, tests existants
> conservés), ce qui a été changé, ce que la mesure a réellement donné, et les deux points où la mesure
> a forcé à dévier du plan validé. **Aucune règle métier n'a été touchée** : le jeu continue de passer
> par `AuthService`, `RecolteService`, `CommandeService` et `PaiementService`.

- [x] **Stocks relevés et quota de vente libre** : les quantités de départ de `RECOLTES_PAR_PRODUCTEUR`
  passent à 12 → 300 selon le produit, et chaque récolte ne peut plus céder en prélèvement libre que
  **45 % de son stock initial** (`PART_MAXIMALE_VENDUE`, suivi par récolte dans `RecoltePilotee`). Le
  tirage « l'acheteur prend tout le reste » sur un coup sur dix est supprimé, remplacé par des fractions
  du stock **initial** (donc bornées) avec un gros acheteur à 20 % sur un tirage sur huit. Résultat
  mesuré et verrouillé : **au plus deux récoltes par producteur** `EPUISEE` ou sous le seuil d'alerte 5
  (deux chez le premier, aucune chez le deuxième, une chez le troisième), alors qu'avant le quota les
  prélèvements libres descendaient librement les stocks vers zéro
- [x] **Huit `ANNULEE` planifiées** (`ANNULATIONS_PILOTEES`) : chacune désigne le producteur de son
  unique ligne et dit si sa date tombe **dans** la fenêtre des trente derniers jours (`dateAnnulation`,
  jours 1 à 27) ou franchement **dehors** (jours 30 à 59) ; une annulation massive fausserait la remise
  en stock observée à l'écran. Quatre sont en fenêtre (deux chez le premier
  producteur, une chez chacun des deux autres), quatre dehors. `premierRangAnnulation()` refuse toute
  génération dont la répartition des statuts ne couvre pas exactement ce plan : le plan ne peut pas
  glisser silencieusement sur d'autres statuts
- [x] **Deux déviations du plan validé, imposées par la mesure** : à la première exécution, **7 erreurs**
  « Plus aucune récolte vendable dans la limite de son quota » — les fractions alors prévues
  (0,02 à 0,12 plus le gros acheteur à 0,20) reviennent, sur sept tirages par récolte, à demander environ
  59 % du stock initial, au-delà du quota de 45 % : il ne restait plus rien à vendre aux rangs
  d'annulation. D'où : fractions libres abaissées à **{0,01 ; 0,02 ; 0,03 ; 0,05}**, et
  lignes d'annulation **dispensées du quota** (justifié par la règle du service : l'annulation rend la
  quantité au stock, une vente annulée ne peut donc pas créer d'alerte). Les 13 tests sont verts après
  ces deux changements
- [x] **Valeurs réellement lues après génération** (service `StatistiquesProducteurService`, fenêtre de
  trente jours, premier producteur) : chiffre d'affaires **87 425,00**, **18** commandes, panier moyen
  **5 464,06**, taux d'annulation **11,11 %** (2 annulées sur 18) — donc dans la fourchette demandée de
  8 à 15 %, **aucun ajustement du nombre d'annulées en fenêtre n'a été nécessaire** ; 9 commandes à
  traiter ; top 5 Oignon 57,00 kg / 37 050, Piment fort 12,00 kg / 14 400, Tomate 16,00 kg / 12 800,
  Aubergine 13,50 kg / 6 750, Chou 15,50 kg / 6 200 ; stock faible = Piment fort 0,00 kg `EPUISEE` et
  Salade 3,50 botte. Chez les deux autres : 811 400,00 / 12 commandes / 8,33 % et 121 425,00 /
  17 commandes / **5,88 %** — ce dernier taux est hors de la fourchette, qui ne visait que le premier
  producteur. La somme des trente montants quotidiens tombe **exactement** à 87 425,00 : l'écart
  d'arrondi d'un FCFA constaté en QA STAT-1 ne se reproduit pas sur ce jeu
- [x] **Ce que l'ajustement fait perdre en amplitude** : le chiffre d'affaires du premier producteur
  passe de **375 886** (constaté à l'écran lors de la QA STAT-1) à **87 425,00**, conséquence directe de
  l'abaissement des fractions. Consigné plutôt que masqué, parce que les captures du mémoire montreront
  ce second nombre
- [x] **Tests — `DemoDataInitializerTest` 10 → 13, suite backend 275** (`./mvnw -o clean test`, 23 classes,
  `Failures: 0`, `Errors: 0`, PostgreSQL réel) : trois nouveaux verrous reprennent la formule de
  l'écran au lieu de la constater (alertes `EPUISEE` ou sous le seuil comptées **par producteur**, au
  moins une annulée **dans la fenêtre** par producteur, taux d'annulation du premier producteur
  recalculé comme `StatistiquesProducteurService` et refusé hors de 8,00–15,00). **Deux assertions
  existantes ont été re-ciblées, pas affaiblies** : `recoltesAuStatut(EPUISEE)` de `>= 1` à
  `isEqualTo(1)` et `recoltesDisponiblesSousLeSeuil()` de `>= 2` à `isEqualTo(2)`, le quota rendant
  maintenant ces effectifs contrôlables
- [x] **Documentation** : README §9 réécrit — base de démonstration **dédiée `sunurecolte_demo`** (et
  plus `sunurecolte`, celle des tests), avertissement « **ne jamais lancer le profil `demo` sur une base
  contenant des données réelles** », lancement en PowerShell avec `SPRING_DATASOURCE_URL`,
  `SPRING_PROFILES_ACTIVE`, `APP_DEMO_MOT_DE_PASSE`, `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`, remise à
  zéro par `DROP DATABASE sunurecolte_demo` / `CREATE DATABASE sunurecolte_demo`, quota de 45 %,
  annulées planifiées et ADMIN venant de l'amorçage du §4 plutôt que du profil
- [x] **Reste ouvert après cet ajustement** : la base locale `sunurecolte_demo` n'est **pas encore
  régénérée** (opération destructive, donc jouée par l'auteur) — le nouveau jeu n'a été lu que par le
  service en base de test, jamais dans un navigateur, et `verif-stat1.sql` devra être rejoué contre la
  base régénérée avec les valeurs ci-dessus comme attendus

## LOT QA-STAT-1 — corrections demandées par l’écran réel (2026-10-09)

> **Ce que couvre cette section** : les **cinq** défauts constatés sur `/producteur/statistiques` rendu
> par le navigateur, la correction de chacun, et ce que les tests verrouillent. Les constats viennent
> de **captures réelles** et d’une **QA jouée dans le navigateur**, pas d’une relecture de code : les
> trois premiers se lisaient sur les captures, les deux derniers (constats 4 et 5) ne sont apparus
> qu’en mesurant l’écran rendu. Les proportions des graphiques n’ont pas été touchées, seule la mise
> en page et l’écriture des nombres le sont.
>
> **Porte de validation** : `npm test -- --no-watch` et `npm run build` côté frontend,
> `./mvnw -o test` côté backend, sur PostgreSQL réel.

- [x] **Constat 1 — les barres horizontales ne rattachent plus leur libellé** : chaque barre partait à
  34 % de la largeur et chaque étiquette était posée **22 px au-dessus** de sa barre, de l’autre côté
  du texte de valeur aligné à droite. La règle de LOT STAT-1 (« une classe n’existe que si un écran
  l’utilise ») est respectée : le défaut est **dans le composant partagé** `app-barres`, donc la
  correction y est faite et non dans l’écran, pour que le futur lot ADMIN en profite
- [x] **Correction — `partage/graphiques/barres.ts` et `.html`** : une ligne horizontale devient un
  `<g transform="translate(0 …)">` qui porte son libellé à gauche, sa valeur à droite et sa barre
  **sous les deux**, sur la pleine largeur (`longueur()` = `pourcentage()` sans partage avec le
  texte). Le pas de ligne passe de 34 à 52 pour que le texte et la barre ne se chevauchent jamais.
  **`pourcentage()` est inchangé** : les proportions affichées restent exactement celles calculées.
  Chaque `<rect>` vertical porte un `<title>libellé : valeur</title>` (confort visuel seulement, `role
  = "img"` tenant la subtree hors de l’arbre accessible — le tableau alternatif reste la voie machine)
  et un **repère de maximum** en HTML au-dessus de la trace, alimenté par une `etiquetteMaximum()`
  fournie par l’appelant : aucun mot de métier n’entre dans le composant partagé
- [x] **Constat 3 et correction — `core/utilitaires/formatage.ts`** : `Intl.NumberFormat('fr-FR')`
  rend le séparateur de milliers en **fine insécable U+202F**, glyphe absente de la police du projet,
  donc « 151 736 » se lisait « 151736 » pendant qu’un nombre sans millier restait espacé. Le
  séparateur est maintenant écrit à la main (`formatToParts` puis remplacement des parties `group`
  par U+00A0). Un **écart assumé et signalé** : les deux formatteurs sont appelés par une quinzaine
  d’écrans (catalogue, détail, panier, tiroir, commande, commandes, paiement, admin, accueil), qui
  changent tous de caractère de séparateur, sans aucune autre modification
- [x] **Décimales de la synthèse** : `formaterMontantEntier` s’ajoute pour un écran de chiffres —
  chiffre d’affaires, panier moyen, montants des deux graphiques, tableau alternatif et annonce —
  tandis qu’une **quantité vendue garde sa décimale** (`formaterQuantite`, 233,5 kg reste lisible).
  L’arrondi n’est que d’affichage : la valeur du serveur reste exacte et `StatistiquesProducteurService`
  n’est pas touché
- [x] **Backend — `DemoDataInitializer`** : le tirage libre est arrondi **au demi-unité inférieur**
  (`PAS_DE_VENTE`), jamais à deux décimales, pour qu’une ligne ne sorte plus à 233,44 kg et qu’un
  sous-total garde au plus une décimale. **Un plancher tenté puis écarté, consigné pour ne pas y
  revenir** : borner chaque prélèvement au `quantiteMin` de la récolte vidait les petites récoltes trop
  vite et faisait tomber le jeu à **50 commandes sur 60** (deux tests en échec, `ANNULEE` absent,
  `REMBOURSE` à 0). Le repli d’un tirage trop petit prend donc le plus petit prélèvement du jeu
  (0,5), et non la totalité du stock restant
- [x] **Constat 4 — les étiquettes de l’axe des colonnes se chevauchent (constaté en réel, à 353 px)** :
  « 05/10 » et « 09/10 » étaient écrits l’un sur l’autre. La borne finale de la période est toujours
  rendue (décision de LOT STAT-1, gardée) et le pas d’intervalles tombait juste avant elle. **Dans le
  composant partagé**, `etiquetteColonne()` arrête désormais le pas à un pas de colonne de la dernière
  étiquette : les deux bornes se lisent, aucune ne touche sa voisine. Mesuré après correction :
  30 jours → 6 étiquettes (10/09, 15/09, 20/09, 25/09, 30/09, 09/10), 7 jours → 4, « ce mois » (9 jours)
  → 5, **aucun chevauchement** aux quatre largeurs observées
- [x] **Constat 5 — une barre de défilement horizontale apparaissait à 375 px (constaté en réel)** :
  le voile qui masque le tableau alternatif était posé **sur le `<table>` lui-même**, or une table ne
  peut pas être plus étroite que son contenu — `width: 1px` est ignoré, le tableau rendait 549 px et
  élargissait la page (`scrollWidth` 605 pour 338 px visibles). Le voile est devenu un `<div>` parent :
  la table garde sa sémantique de tableau, ses valeurs restent dans l’arbre d’accessibilité (vérifié
  sur le snapshot après correction) et `scrollWidth` est revenu à la largeur visible. **Le futur lot
  ADMIN hérite des deux corrections, faites dans `app-barres` et non dans l’écran**
- [x] **Écart assumé et non masqué — 1 FCFA entre la carte et la somme des jours** : la carte annonce
  « Chiffre d’affaires 375 886 FCFA » et les trente montants quotidiens affichés somment à
  **375 887 FCFA**. Cause identifiée : chaque jour est arrondi **indépendamment** à l’affichage
  (`formaterMontantEntier`), pas la somme. L’écart ne vient pas du serveur — il est d’arrondi visible,
  et il peut rester après régénération du jeu puisqu’un sous-total peut légitimement porter une
  décimale. **La décision reste à l’auteur** : consigner l’écart, ou rendre aux valeurs quotidiennes
  leurs décimales exactes (le graphique et son tableau alternatif, pas la synthèse)
- [x] **Tests frontend — 955 → 963 (47 fichiers)** : `barres.spec.ts` **7 → 12** (association
  structurelle libellé-barre, géométrie sans chevauchement, infobulles, repère de maximum présent et
  muet à zéro, étiquettes d’axe à distance de la borne finale, voile parent du tableau) et
  `statistiques.spec.ts` +1 (montants entiers, quantité gardant sa décimale) et +2
  assertions (repère sur le graphique des ventes, absent du second). **Sept assertions re-ciblées**,
  toutes déclarées ici parce qu’elles portent sur la géométrie que le lot corrige volontairement :
  trois largeurs de barres `46/23/11,5 %` → `100/50/25 %`, une largeur et un `x` du second test
  (`46 %` → `100 %`, `34 %` → `0`), et la paire d’assertions d’étiquettes de colonnes, retouchée **deux
  fois** (6 → 7 quand les deux bornes se lisent, puis 7 → 6 après le constat 4). Les autres changements
  (`transform` de ligne, hauteur du `<svg>`, parent du tableau alternatif) sont des **assertions
  ajoutées**, pas d’existant retouché. **Aucune assertion supprimée
  ni affaiblie** ; `formatage.spec.ts` passe à 16 tests et vérifie le caractère échappé (`U+00A0`
  présent, `U+202F` absent)
- [x] **Tests backend — 271 → 272** (`Failures: 0` sur les deux suites) : `DemoDataInitializerTest`
  vérifie que **toute** quantité vendue est multiple de 0,5 ; les effectifs du jeu (60 commandes, cinq
  statuts, 4 remboursements) restent exacts avec l’arrondi
- [x] **QA navigateur réellement jouée sur `/producteur/statistiques`** (profil `demo`, base
  `sunurecolte_demo`, compte `producteur1.demo@sunurecolte.sn`) :
  **association libellé ↔ barre** mesurée ligne par ligne — 44 à 54 px d’air entre le libellé et la
  valeur, **la barre rendue sous les deux** sur les cinq lignes, et des largeurs de barres
  225/213/56/21/17 px pour des revenus 151 736/144 000/38 025/14 400/11 570 FCFA, soit exactement les
  proportions du serveur (le calcul n’est pas touché) ; **repère de maximum** présent au-dessus des
  colonnes (« Maximum encaissé sur une journée : 93 220 FCFA ») ; **séparateur de milliers** vérifié au
  codepoint (`1` `U+00A0` `274`), plus de chiffre agglutiné ; **montants entiers** à la synthèse et aux
  deux graphiques, **quantité gardant sa décimale** (233,44 kg, jeu non régénéré) ; les **trois
  périodes** changent réellement la fenêtre (7 jours → 7 colonnes et 4 étiquettes, 30 jours → 30
  colonnes et 6, « ce mois » → 9 colonnes et 5) avec l’annonce mise à jour et l’état `aria-pressed`
  qui suit ; **console sans erreur** (uniquement les journaux Vite et le mode développement) ;
  **réseau** : à l’ouverture une seule `GET /api/producteurs/moi/statistiques?periode=30j` (200) avec le
  `GET /api/notifications` de l’en-tête, et le clic sur « 7 derniers jours » n’émet **rien d’autre** que
  `?periode=7j` en 200. **Comment les largeurs ont été obtenues** : 353 px est la largeur **réelle** de la fenêtre
  pilotée (la sienne, non contrôlable par l’agent) ; les passes 375, 768, 1024 et 1366 px ont été
  mesurées dans une **iframe de même origine** chargée sur le même écran — la mise en page est réelle
  (les cartes passent de 4 par ligne à 1 colonne empilée à 375 px) mais le rendu n’est pas une fenêtre
  native, et le contrôle visuel à l’œil de ces quatre largeurs **reste à faire par l’auteur**
- [x] **Marges résiduelles mesurées, déclarées** : à 353 px les six étiquettes d’axe laissent **3 à 6 px
  d’air** entre elles (aucun chevauchement, mais lisible de justesse — à 375 px mesurées en iframe,
  7 à 9 px) ; et l’espace entre le montant et « FCFA » reste une **espace simple U+0020** (seul le
  séparateur de milliers a été remplacé), hérité des quinze écrans qui appellent les formatteurs
- [x] **Limites de ce lot** : la base de démonstration porte encore le jeu à deux décimales, sa
  **régénération est destructive** donc à la main de l’auteur, et les mesures ci-dessus ont été prises
  **avant** cette régénération ; le repère de maximum n’existe que sur le graphique vertical, le
  graphique horizontal garde ses valeurs écrites sur chaque ligne ; une seule identité de producteur a
  été observée (celle du compte connecté), les autres comptes du jeu non
- [x] **Ce qui reste ouvert** : vérification SQL indépendante des agrégats affichés — les trois blocs
  de requêtes ont été **remis à l’auteur**, `psql` refusant de se connecter sans mot de passe et la
  consigne étant de **ne jamais taper ce secret dans un outil** ; aucun écart toléré ni masqué, et
  l’écart d’arrondi de 1 FCFA signalé ci-dessus attend sa décision ; régénération du jeu puis
  re-contrôle visuel ; parcourir en navigateur les autres écrans que le jeu nourrit ; et le lot
  statistiques **ADMIN** qui doit réutiliser `app-barres`. Travail porté par la branche
  `fonctionnalites-statistiques`, **non poussé**

## Phase 10 — Intégration
- [ ] Angular ↔ backend
- [ ] Flux Producteur → Récolte
- [ ] Flux Acheteur → Panier → Commande
- [ ] Commande → Paiement
- [ ] Paiement → Notification
- [ ] Tests Admin — les **tests automatisés existent** depuis 5.9 (intégration backend PostgreSQL 207/207,
  unitaires frontend 101 tests ADMIN sur 672) ; ce qui manque est la **QA navigateur** de l'espace admin

## Phase 11 — Finalisation
- [ ] Tests complets
- [ ] Nettoyage
- [ ] Sécurité
- [ ] README
- [ ] Déploiement
- [ ] Captures finales
- [ ] Mise à jour mémoire
- [ ] Préparation soutenance
