# SUNURECOLTE — Architecture technique de référence

## Vue globale

Navigateur
  ↓ HTTPS / REST JSON
Angular
  ↓
Spring Boot / Java 17
  ├── Controllers
  ├── Services
  ├── Repositories
  └── Spring Security + JWT
  ↓ JPA/Hibernate
PostgreSQL

Spring Boot
  ↓
Service de paiement externe
(Wave / Orange Money selon disponibilité)

## Architecture backend

com.sunurecolte
├── config
├── security
├── user
├── recolte
├── commande
├── paiement
├── notification
├── prixmarche
└── exception

Chaque domaine peut contenir :
controller / service / repository / entity / dto

## Principe
Controller → Service → Repository

Controller : HTTP et orchestration légère.
Service : règles métier.
Repository : accès aux données.
Security : authentification et autorisation.

## Implémentation en place (Phase 2)

Le flux `Controller → Service → Repository` est effectivement appliqué :

- **Controller** (`@RestController`, un par domaine, routes sous `/api/...`) : reçoit la requête,
  déclenche la validation (`@Valid`), délègue au service et renvoie un DTO. Aucune règle métier.
- **Service** (`@Service`, `@Transactional`) : applique les règles métier — vérification des références,
  contrôle du stock, calcul du total et des sous-totaux, transitions de statut, notifications — puis
  convertit les entités en DTO.
- **Repository** (Spring Data JPA) : accès aux données uniquement, avec quelques requêtes JPQL
  (`rechercher`, `findByIdForUpdate` en verrou pessimiste) ; aucune logique métier.

Les entités JPA ne sont jamais exposées directement (conversion en DTO dans les services,
`open-in-view` désactivé). Les erreurs sont centralisées dans `exception/GlobalExceptionHandler`
(`@RestControllerAdvice`) : 400 `BusinessException`, 403 `ForbiddenException`,
404 `ResourceNotFoundException`, 500 sans détail interne.

Le contrôle de propriété (un utilisateur ne modifie que ses propres ressources) n'est pas encore en
place : il dépend de l'authentification (Phase 3).

## Authentification

Angular
→ POST /api/auth/login
→ AuthController
→ AuthService
→ UserRepository
→ PostgreSQL
→ JWT
→ Angular

Les requêtes protégées utilisent ensuite le JWT.

## Commande

Acheteur
→ Angular
→ CommandeController
→ CommandeService
→ vérification récolte/stock
→ création commande
→ paiement
→ confirmation
→ notification producteur

## Paiement
Le workflow doit fonctionner en simulation/sandbox avant toute intégration réelle.

## Frontend

src/app/
├── core/
│   ├── auth/
│   ├── guards/
│   ├── interceptors/
│   └── services/
├── features/
│   ├── auth/
│   ├── producteur/
│   ├── acheteur/
│   └── admin/
└── shared/

## Déploiement cible
Navigateur → Frontend Angular → API Spring Boot → PostgreSQL
                                      ↘ Service paiement

Pas de microservices pour le MVP.
