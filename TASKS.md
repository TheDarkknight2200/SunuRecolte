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
- [ ] DTO
- [ ] Validation
- [ ] @ControllerAdvice
- [ ] Codes HTTP cohérents
- [ ] Swagger/OpenAPI

## Phase 3 — Auth
- [ ] Inscription
- [x] Inscription : rôle restreint par construction (ADMIN impossible)
- [ ] Connexion
- [ ] Hash mots de passe
- [ ] JWT
- [ ] SecurityFilterChain
- [ ] Autorisation par rôle
- [ ] Tests auth

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
- [ ] Initialiser Angular
- [ ] Structure features
- [ ] Services API
- [ ] Auth
- [ ] Intercepteur JWT
- [ ] Guards
- [ ] Auth UI
- [ ] Producteur UI
- [ ] Acheteur UI
- [ ] Admin UI
- [ ] Catalogue
- [ ] Panier
- [ ] Commandes
- [ ] Paiement
- [ ] Notifications
- [ ] Responsive

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
