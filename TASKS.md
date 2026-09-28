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
- [ ] Producteur UI
- [ ] Acheteur UI
- [ ] Admin UI
- [ ] Catalogue
- [ ] Panier
- [ ] Commandes
- [ ] Paiement
- [ ] Notifications
- [ ] Responsive (vérifié écran par écran au fil des pages métier)

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
