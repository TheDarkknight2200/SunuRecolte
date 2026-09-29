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
> et la **création automatique** est en place dans `CommandeService` uniquement — une notification
> « Nouvelle commande » à chaque producteur distinct à la création d'une commande, une notification
> « Suivi de commande » à l'acheteur à chaque changement de statut. « Liste » et « Marquer comme lue » sont
> donc livrés côté API, et « Notifications commande » aussi.
>
> **Ce qui manque réellement** : « Notifications paiement » — `PaiementService` n'importe aucune notification
> et **aucune** notification de paiement n'existe dans le projet. Ni l'espace producteur (aucune action sur
> les statuts), ni une pagination, ni un endpoint de comptage n'existent non plus.
>
> **L'interface frontend de ces notifications a été réalisée dans la sous-phase 5.5.9**, pas ici : un écran
> transversal `/notifications` et son compteur d'en-tête, qui n'utilisent que deux des trois endpoints.
> Ces cases ne sont pas cochées : leur statut historique (périmètre backend, déjà testé mais jamais validé
> dans cette liste) demande une décision de l'auteur du projet, comme pour « Phase 4 » et « Phase 5 ».

## Phase 8 — Admin
- [ ] Dashboard
- [ ] Utilisateurs
- [ ] Modération récoltes
- [ ] Prix indicatifs
- [ ] Statistiques

## Phase 9 — Angular
- [x] Initialiser Angular
- [x] Identité visuelle et design system (`FRONTEND_DESIGN.md`, logo, favicon, tokens SCSS)
- [x] Structure features (`core/`, `partage/`, `features/`, styles globaux)
- [x] Services API (`AuthService`, `RecolteService`, `UtilisateurService` ; URL centralisée)
- [x] Auth (inscription, connexion, déconnexion, jeton en `localStorage`)
- [x] Intercepteur JWT (Bearer, 401 → purge et redirection, 403 non transformé)
- [x] Guards (`authGuard` puis `roleGuard`)
- [x] Auth UI (connexion, inscription, tableau de bord, pages d'erreur)
- [ ] Producteur UI (partiel : gestion des récoltes faite — voir 5.4 ; profil et commandes restants)
- [ ] Acheteur UI (partiel : panier, commande, consultation, annulation et paiement simulé faits —
  voir 5.5 ; notifications restantes)
- [x] Catalogue (page publique `/recoltes` + détail `/recoltes/:id` — voir 5.3)
- [ ] Admin UI
- [x] Panier (5.5.3 et 5.5.5 : `PanierService` local + page `/acheteur/panier`)
- [ ] Commandes (passer : 5.5.6 ; consulter et annuler : 5.5.7 ; mise à jour des statuts côté producteur
  non faite)
- [x] Paiement **simulé** (5.5.8 : `/acheteur/paiement/:id` et `POST /api/paiements` ; le serveur n'écrit
  que `EN_ATTENTE` avec une référence `SIMU-…`, aucun paiement réel n'existe dans le projet)
- [ ] Notifications
- [ ] Responsive (vérifié écran par écran au fil des pages métier)

## Sous-phases frontend 5.2 → 5.5 (détail réel)

> **Avertissement de numérotation** : « 5.2 », « 5.3 », « 5.4 » et « 5.5 » sont les repères des consignes
> de travail, pas les phases de ce fichier. Elles portent sur le frontend Angular (Phase 9) et n'ont aucun
> rapport avec la « Phase 5 — Acheteur » ni avec la « Phase 4 — Producteur » décrites plus haut.
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
> l'est plus. **Ce qui reste non fait** : aucune notification de paiement (le backend n'en envoie aucune),
> et aucune mise à jour des statuts de commande par le producteur.

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

### État d'intégration (2026-09-29)
- [x] 5.2, 5.3, 5.4 et 5.5 (5.5.1 → 5.5.9) sont **implémentées et validées par les tests automatisés,
  le build et une QA navigateur réelle** (aux limites de viewport signalées en clôture de 5.5.7, 5.5.8 et
  5.5.9)
- [x] Le travail est **commité au fur et à mesure** : les commits Git locaux sont les checkpoints des
  phases 5.2 à 5.5.9. Le dépôt distant peut rester en retard tant qu'aucun push n'est demandé
- [ ] Le projet n'est **pas terminé** : l'espace admin reste à faire, la mise à jour des statuts de commande
  par le producteur non plus, les notifications de paiement n'existent pas côté backend, et l'intégration de
  bout en bout reste à couvrir (Phase 9 puis Phases 10 et 11)
- [x] « Phase 5.5 » des consignes de travail (commandes acheteur) : panier, tunnel de commande,
  consultation, annulation et **paiement simulé** **faits** ; les notifications, d'abord **volontairement
  hors périmètre**, ont été livrées ensuite en **5.5.9** (écran transversal et compteur d'en-tête)

## Phase 10 — Intégration
- [ ] Angular ↔ backend
- [ ] Flux Producteur → Récolte
- [ ] Flux Acheteur → Panier → Commande
- [ ] Commande → Paiement
- [ ] Paiement → Notification
- [ ] Tests Admin

## Phase 11 — Finalisation
- [ ] Tests complets
- [ ] Nettoyage
- [ ] Sécurité
- [ ] README
- [ ] Déploiement
- [ ] Captures finales
- [ ] Mise à jour mémoire
- [ ] Préparation soutenance
