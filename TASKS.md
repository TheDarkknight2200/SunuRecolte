# SUNURECOLTE — Plan de développement

Une tâche n'est cochée que lorsqu'elle est réellement terminée et testée.

## Phase 0 — Préparation
- [ ] Dépôt Git
- [ ] README.md
- [ ] CLAUDE.md
- [ ] CONTEXTE.md
- [ ] TASKS.md
- [ ] ARCHITECTURE.md
- [ ] REGLES_DEVELOPPEMENT.md
- [ ] .gitignore
- [ ] Vérifier Java 17
- [ ] Vérifier Maven
- [ ] Vérifier PostgreSQL

## Phase 1 — Backend
- [ ] Initialiser Spring Boot
- [ ] Configurer Java 17
- [ ] Configurer PostgreSQL
- [ ] Configurer JPA/Hibernate
- [ ] Créer enums
- [ ] Créer les 9 entités
- [ ] Créer repositories
- [ ] Vérifier relations JPA

## Phase 2 — API
- [ ] DTO
- [ ] Validation
- [ ] @ControllerAdvice
- [ ] Codes HTTP cohérents
- [ ] Swagger/OpenAPI

## Phase 3 — Auth
- [ ] Inscription
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
