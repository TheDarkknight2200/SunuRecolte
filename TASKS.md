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
- [x] Paiement **simulé** (5.5.8 : `/acheteur/paiement/:id` et `POST /api/paiements` ; le serveur n'écrit
  que `EN_ATTENTE` avec une référence `SIMU-…`, aucun paiement réel n'existe dans le projet)
- [x] Notifications (5.5.9 : écran transversal `/notifications` et compteur d'en-tête, QA navigateur réelle faite ;
  les cases **backend** de la Phase 7 restent en attente d'une décision de l'auteur, voir la note de cette phase)
- [ ] Responsive (vérifié écran par écran au fil des pages métier)

## Sous-phases 5.2 → 5.9 (détail réel)

> **Avertissement de numérotation** : « 5.2 », « 5.3 », « 5.4 », « 5.5 », « 5.6 », « 5.7 », « 5.8 » et « 5.9 »
> sont les repères des consignes de travail, pas les phases de ce fichier. Les cinq premiers et les deux derniers
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
  **non commité**
- [x] Le travail est **commité au fur et à mesure** jusqu'à 5.8 : chaque sous-phase achevée a son checkpoint Git,
  et le dépôt distant est à jour de ces checkpoints. **5.9 et 5.9-bis ne sont pas commitées** — le brief de cette
  sous-phase l'interdit (ni commit automatique, ni push)
- [ ] Le projet n'est **pas terminé** : la QA navigateur de l'espace administrateur (5.9) et celle de 5.6 restent
  à faire, l'intégration de bout en bout (Phase 10) et la finalisation (Phase 11) sont devant. L'espace admin,
  dernier bloc fonctionnel du périmètre approuvé, est **livré et testé** ; il reste la phase de *redesign premium*
- [x] « Phase 5.5 » des consignes de travail (commandes acheteur) : panier, tunnel de commande,
  consultation, annulation et **paiement simulé** **faits** ; les notifications, d'abord **volontairement
  hors périmètre**, ont été livrées ensuite en **5.5.9** (écran transversal et compteur d'en-tête)

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
