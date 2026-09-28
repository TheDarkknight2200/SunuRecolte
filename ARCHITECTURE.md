# SUNURECOLTE — Architecture technique de référence

## Vue globale

Navigateur
  ↓ HTTPS / REST JSON
Angular
  ↓
Spring Boot / Java 17
  └── Chaîne de filtres de sécurité (JwtAuthenticationFilter)
        ↓
      Controllers
        ↓
      Services
        ↓
      Repositories
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

## Authentification et autorisation (Phase 3)

Requête protégée — l'identité vient uniquement du jeton, jamais d'un identifiant transmis par le client :

```text
Client (Angular)
  → en-tête Authorization: Bearer <jeton>
  → JwtAuthenticationFilter      lit le jeton, vérifie signature et expiration
  → CustomUserDetailsService     recharge l'utilisateur en base (rôle et statut réels)
  → SecurityContext              identité authentifiée
  → SecurityConfig               autorisation par rôle sur l'URL
  → Controller
  → Service                      contrôle de propriété (403 si refus)
  → Repository
  → PostgreSQL
```

Émission du jeton :

```text
Angular
  → POST /api/auth/inscription ou /api/auth/connexion
  → AuthController
  → AuthService
  → PasswordEncoder (BCrypt) + UtilisateurRepository
  → PostgreSQL
  → JWT signé (HS256)
  → Angular
```

Points clés :

- **Sans état** : `SessionCreationPolicy.STATELESS`, aucun cookie de session ; CSRF désactivé car sans
  objet (justification détaillée dans la Javadoc de `SecurityConfig`).
- **Rôle relu en base** à chaque requête : un rôle forgé dans le jeton n'accorde aucun droit.
- **Refus en JSON** : `RestAuthenticationEntryPoint` (401) et `RestAccessDeniedHandler` (403), jamais de
  page HTML ni de détail interne.
- **CORS** restreint aux origines de `app.cors.origines-autorisees` (`http://localhost:4200`), sans
  credentials puisque le jeton circule dans l'en-tête `Authorization`.
- **Secret JWT hors Git**, validé au démarrage (≥ 32 octets, minimum HS256), jamais journalisé.
- **Compte ADMIN** amorcé par `AdminInitializer` : aucune migration Flyway ne contient de secret,
  l'amorçage est idempotent.

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

## Frontend (Phase 4)

Angular 21, composants standalone, SCSS, Reactive Forms, tests Vitest. Flux d'une requête authentifiée :

```text
Composant (features/…)
  → Service Angular (core/services)          construit la requête HTTP
  → authInterceptor (core/intercepteurs)     ajoute Authorization: Bearer <jeton>
  → HttpClient
  → API Spring Boot
```

Arborescence réelle :

```text
frontend/src/
├── app/
│   ├── core/
│   │   ├── intercepteurs/   authInterceptor
│   │   ├── guards/          authGuard (authentifié), roleGuard (rôles autorisés)
│   │   ├── modeles/         modèles TypeScript alignés sur les DTO Java réels
│   │   ├── services/        AuthService, RecolteService, UtilisateurService
│   │   └── utilitaires/     message d'erreur API, résolution de l'espace par rôle
│   ├── features/            accueil, auth, tableau-de-bord, producteur, acheteur, admin, erreurs
│   └── partage/             en-tête, pied de page
├── environments/            environment.ts / environment.production.ts
├── styles/                  tokens, base, composants, icônes
└── public/                  logo, favicon, police d'icônes Material Symbols
```

Points clés :

- **URL de l'API centralisée** dans `environment.apiUrl` (`http://localhost:8080/api` en développement,
  `/api` en production) : aucune URL d'API en dur dans les services.
- **Le jeton n'est lu que par `AuthService`** (clés `sunurecolte.jeton` / `sunurecolte.utilisateur`) ;
  l'`authInterceptor` l'ajoute à chaque requête sortante. Il n'est jamais journalisé ni affiché.
- **Le frontend n'est jamais l'autorité de sécurité** : guards et intercepteur ne sont qu'un confort
  d'usage (navigation, redirection, purge locale) ; toute autorisation est rendue par l'API.
- **401** : purge de la session locale puis redirection vers `/connexion` (avec paramètre `retour`).
  **403** : message d'erreur affiché, session conservée — un 403 n'est jamais transformé en 401.
- **Design** : l'identité visuelle, les tokens et les règles d'interface font foi dans
  `FRONTEND_DESIGN.md`.

## Déploiement cible
Navigateur → Frontend Angular → API Spring Boot → PostgreSQL
                                      ↘ Service paiement

Pas de microservices pour le MVP.
