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
