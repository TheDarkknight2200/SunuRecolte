# PROJECT_RULES.md — Règles universelles du projet SunuRecolte

> Document de référence commun à toute IA ou tout outil de développement utilisé sur le projet. Ce fichier ne dépend d'aucun assistant particulier.

## 1. Règle fondamentale

Avant toute modification du code :
1. Lire `PROJECT_RULES.md`.
2. Lire `CONTEXTE.md`.
3. Lire `ARCHITECTURE.md`.
4. Lire `TASKS.md`.
5. Lire `REGLES_DEVELOPPEMENT.md`.
6. Vérifier les fichiers réellement concernés avant de modifier quoi que ce soit.
7. Ne pas inventer de fonctionnalités, d'entités, de relations, d'endpoints ou de règles métier.
8. Ne pas modifier le modèle de données ou l'architecture sans validation de l'équipe.
9. Effectuer les tests appropriés après chaque modification significative.
10. Signaler clairement ce qui a été modifié et ce qui a été testé.

## 2. Identité du projet

Nom officiel : **SunuRecolte**

Objectif : concevoir et développer une plateforme web de mise en relation entre producteurs agricoles et acheteurs, ciblée sur la région de Dakar.

La plateforme permet notamment :
- aux producteurs de publier leurs récoltes disponibles ;
- aux acheteurs de consulter les offres ;
- aux acheteurs de passer des commandes ;
- de gérer le paiement mobile selon une approche progressive ;
- de suivre le cycle de vie des commandes ;
- de consulter des prix de marché indicatifs ;
- à l'administrateur de gérer les utilisateurs, les offres et les prix de marché.

## 3. Stack technique officielle

- Frontend : Angular
- Backend : Spring Boot 3.x
- Langage backend : Java 17
- Base de données : PostgreSQL
- ORM : Spring Data JPA / Hibernate
- Sécurité : Spring Security + JWT
- API : REST
- Documentation API : Swagger / OpenAPI
- Validation : Jakarta Bean Validation avec `@Valid`
- Gestion globale des erreurs : `@ControllerAdvice`

Package backend de référence : `com.sunurecolte`

Architecture générale : `Angular → Spring Boot REST → PostgreSQL`

## 4. Modèle de données approuvé

Les 9 entités approuvées sont :
1. `Utilisateur`
2. `Producteur`
3. `Acheteur`
4. `Récolte`
5. `Commande`
6. `LigneCommande`
7. `Paiement`
8. `Notification`
9. `PrixMarche`

### Règles importantes
- `Producteur` et `Acheteur` ne sont pas des sous-classes de `Utilisateur`.
- Ils sont liés à `Utilisateur` par `utilisateur_id`.
- Le prix historique d'une transaction est conservé dans `LigneCommande`.
- Le MVP prévoit un paiement par commande.
- Les prix de marché sont indicatifs et administrés.
- Les notifications utilisent REST dans le MVP ; pas de WebSocket.

## 5. Architecture backend

Organisation de référence :

```text
com.sunurecolte
├── SunuRecolteApplication.java
├── config/
├── security/
├── user/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   └── dto/
├── recolte/
├── commande/
├── paiement/
├── notification/
├── prixmarche/
└── exception/
```

La logique métier doit rester dans les services.

Flux : `Controller → Service → Repository → PostgreSQL`

Les contrôleurs ne doivent pas contenir de logique métier complexe.

## 6. Paiement

Approche progressive obligatoire :
1. Simulation / sandbox.
2. Intégration Wave si les conditions d'accès sont disponibles.
3. Intégration Orange Money si les conditions d'accès sont disponibles.

Ne jamais prétendre qu'une intégration réelle est fonctionnelle tant qu'elle n'a pas été réellement développée et testée.

## 7. Fonctionnalités hors MVP

Ne pas ajouter spontanément :
- table `Produit` séparée ;
- table `Livraison` ;
- entité `Transporteur` ;
- géolocalisation avancée ;
- WebSocket ;
- prédiction des prix par IA ;
- application mobile native ;
- recommandations complexes ;
- microservices ;
- USSD / WhatsApp ;
- logistique avancée ;
- système complexe d'avis vérifiés.

Ces éléments peuvent être mentionnés comme perspectives, mais ne doivent pas être ajoutés au MVP sans validation.

## 8. Philosophie de développement

Le projet est un projet universitaire L3. Le code doit être fonctionnel, simple à comprendre, sécurisé, testable, maintenable, explicable devant un jury et proportionné au besoin.

Éviter le surengineering. Une solution simple et correctement testée est préférable à une architecture inutilement complexe.

## 9. Règles de collaboration avec une IA

Toute IA utilisée sur le projet doit :
- lire les documents de référence avant de modifier le projet ;
- respecter le modèle de données approuvé ;
- respecter l'architecture approuvée ;
- demander une validation lorsqu'une décision dépasse les règles documentées ;
- ne pas supprimer ou renommer arbitrairement des éléments existants ;
- ne pas installer de dépendance inutile ;
- ne pas introduire une nouvelle technologie sans justification ;
- ne pas déclarer une tâche terminée sans l'avoir réellement vérifiée ;
- signaler les hypothèses lorsqu'une information manque.

### Hiérarchie de référence

En cas de doute :
1. `PROJECT_RULES.md`
2. `CONTEXTE.md`
3. `ARCHITECTURE.md`
4. `REGLES_DEVELOPPEMENT.md`
5. `TASKS.md`
6. code existant et tests

Une IA ne doit pas résoudre silencieusement une contradiction importante. Elle doit la signaler.

## 10. Utilisation avec différents assistants

Ce document est volontairement indépendant de Claude, ChatGPT, Codex, Gemini, Copilot ou autre outil.

Pour une IA qui ne charge pas automatiquement les fichiers Markdown, lui demander explicitement de lire :

```text
PROJECT_RULES.md
CONTEXTE.md
ARCHITECTURE.md
TASKS.md
REGLES_DEVELOPPEMENT.md
```

`CLAUDE.md` reste présent comme fichier spécifique au workflow Claude Code, mais les règles fondamentales du projet sont définies ici.
