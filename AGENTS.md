# AGENTS.md — SunuRecolte

Point d'entrée pour tout agent (IA ou développeur) travaillant sur ce dépôt. À lire avant toute modification.

## Le projet

SunuRecolte est une plateforme web de mise en relation directe entre producteurs agricoles et acheteurs
de la région de Dakar. Projet de fin d'études (Licence 3 Informatique).
Stack : Angular (frontend) + Spring Boot 3.3 / Java 17 (backend) + PostgreSQL 17.

## Référence prioritaire

**`PROJECT_RULES.md` est la référence prioritaire du projet.** En cas de contradiction entre ce fichier et
un autre document, c'est lui qui tranche — il n'est pas résumé ici, il doit être lu.

Hiérarchie de référence (PROJECT_RULES.md §9) :
`PROJECT_RULES.md` > `CONTEXTE.md` > `ARCHITECTURE.md` > `REGLES_DEVELOPPEMENT.md` > `TASKS.md` > code et tests.

Autres documents utiles :
- `CLAUDE.md` : spécification détaillée du modèle de données (9 entités, champs, enums) ;
- `TASKS.md` : avancement réel par phase (une case n'est cochée que si la tâche est testée).

## Règles de travail

- Ne pas modifier l'architecture, le modèle de données approuvé (9 entités) ou les dépendances
  structurantes sans validation explicite de l'auteur du projet.
- Ne rien inventer : entité, champ, endpoint, fonctionnalité, règle métier, intégration externe,
  ni résultat de test.
- Changements petits et vérifiables ; pas de refactoring massif, pas de surengineering.
- Respecter le flux `Controller → Service → Repository` : la logique métier reste dans les services.
- Une tâche n'est terminée que lorsque le test a réellement été exécuté (voir `REGLES_DEVELOPPEMENT.md`).
- Toute évolution du schéma passe par une migration Flyway versionnée dans
  `sunurecolte-backend/src/main/resources/db/migration/` — jamais par `ddl-auto` autre que `validate`.
- Ne jamais supprimer ou renommer un élément existant sans vérifier ses usages.

## Règles de la couche API (Phase 2)

- Les controllers ne manipulent **que des DTO** (`record`), jamais les entités JPA : ils reçoivent la requête,
  appellent le service, renvoient la réponse. Aucune règle métier et aucun accès repository dans un controller.
- `spring.jpa.open-in-view=false` : le chargement paresseux est résolu dans les services `@Transactional`,
  où les entités sont converties en DTO. Ne jamais renvoyer une entité hors d'une transaction.
- Erreurs métier : `BusinessException` (400), `ResourceNotFoundException` (404), `ForbiddenException` (403),
  traduites par `GlobalExceptionHandler` en JSON `{"statut", "message", "timestamp"}` ; les erreurs de
  validation ajoutent un objet `erreurs` par champ. Ne pas créer une exception par cas d'erreur.
- Toute évolution d'API se répercute dans les tests d'intégration PostgreSQL réels
  (`src/test/java/com/sunurecolte/api/`) et dans le tableau des routes du `README.md`.

## Sécurité (non négociable)

- Aucun secret dans Git : mot de passe PostgreSQL et clé JWT restent dans
  `sunurecolte-backend/src/main/resources/application-local.properties` (ignoré par Git, ne pas retirer cette protection).
- Aucun mot de passe stocké en clair (hashage à la phase authentification).
- Les permissions et validations sont vérifiées côté backend, jamais uniquement côté frontend.
- Une inscription publique ne peut créer que `PRODUCTEUR` ou `ACHETEUR` : `ADMIN` est impossible
  par construction (enum `RoleInscription`), et non par une simple validation.
- Ne jamais exposer les détails internes d'une exception dans une réponse HTTP ; les journaliser côté serveur.
- **État provisoire (Phase 2)** : `SecurityConfig` autorise actuellement toutes les requêtes (`permitAll`),
  CSRF désactivé, sessions `STATELESS`, sans JWT — c'est volontaire et temporaire jusqu'à la phase
  authentification. Ne pas en déduire que l'API est protégée : aucune route ne vérifie l'identité ni la
  propriété d'une ressource. Le contrôle de propriétaire (un producteur ne modifie que ses récoltes, un
  acheteur ne voit que ses commandes) fait partie des phases suivantes, pas de la Phase 2.
- Les montants et quantités ne sont **jamais** acceptés depuis le client : `total`, `sousTotal`,
  `prixUnitaire` et le décrément de stock sont calculés ou vérifiés côté serveur (voir `CommandeService`).
- Le paiement est **simulé** (référence `SIMU-...`) : aucune transaction réelle Wave / Orange Money
  n'est effectuée, et il est interdit de le laisser croire dans le code, les logs ou les documents.

## Contrainte frontend (phases Angular)

Éviter l'interface générique typique des rendus IA : gradients violets inutiles, cartes excessivement
arrondies, glassmorphism gratuit, ombres multiples, animations décoratives, emojis utilisés comme éléments
d'interface, faux témoignages, fausses statistiques, lorem ipsum, sections génériques sans utilité.
Objectif : une interface sobre, crédible et réellement utile.

## Structure du dépôt

```text
SunuRecolte/
├── PROJECT_RULES.md, CONTEXTE.md, ARCHITECTURE.md, REGLES_DEVELOPPEMENT.md, TASKS.md, CLAUDE.md
└── sunurecolte-backend/            # API Spring Boot (Java 17), Maven Wrapper 3.9.15
    └── src/main/java/com/sunurecolte/
        ├── user/                   # Utilisateur, Producteur, Acheteur
        ├── recolte/                # Recolte
        ├── commande/               # Commande, LigneCommande
        ├── paiement/               # Paiement
        ├── notification/           # Notification
        ├── prixmarche/             # PrixMarche
        ├── exception/              # exceptions métier + gestion centralisée des erreurs
        ├── config/                 # OpenApiConfig
        └── security/               # SecurityConfig (provisoire, voir ci-dessous)
    └── src/main/resources/
        ├── application.properties          # configuration versionnée
        ├── application-local.properties    # secrets locaux, hors Git
        └── db/migration/                   # migrations Flyway versionnées
```

Chaque domaine backend suit la même organisation : `controller/`, `service/`, `repository/`, `entity/`, `dto/`.

## Commandes utiles

```bash
cd sunurecolte-backend
./mvnw test              # tests (nécessitent PostgreSQL local démarré)
./mvnw spring-boot:run   # lancement de l'API sur http://localhost:8080
```

Installation détaillée : voir la section « Installation » du `README.md`.
