# SUNURECOLTE — Contexte du projet

## Contexte
Projet de fin d'études de Licence 3 en informatique.

SunuRecolte est une plateforme web de mise en relation directe entre producteurs agricoles et acheteurs dans la région de Dakar.

## Acteurs

### Producteur
- inscription / connexion
- profil
- publication et gestion des récoltes
- gestion du stock
- consultation des commandes
- mise à jour du statut des commandes

### Acheteur
- inscription / connexion
- catalogue
- recherche et filtres
- détail récolte
- panier
- commande
- retrait ou livraison
- paiement
- historique
- notifications
- prix indicatifs du marché

### Administrateur
- gestion utilisateurs
- modération récoltes
- gestion prix indicatifs
- statistiques

## Architecture
Angular → Spring Boot REST API → PostgreSQL

Sécurité : Spring Security + JWT.
ORM : JPA/Hibernate.
Documentation : Swagger/OpenAPI.

## Paiement
Développement progressif :
- simulation/sandbox d'abord ;
- Wave ensuite si les accès techniques existent ;
- Orange Money ensuite si les accès techniques existent.

Toujours distinguer dans le code et la documentation :
simulation / sandbox / intégration réelle / fonctionnalité future.

## Notifications
REST uniquement dans le MVP. Pas de WebSocket.

## Prix marché
Prix indicatifs administrés dans le MVP. Automatisation et IA = perspectives futures.

## Philosophie
Le projet doit être :
- fonctionnel ;
- sécurisé ;
- testable ;
- maintenable ;
- compréhensible à une soutenance L3 ;
- sans sur-ingénierie.

Priorité :
fonctionnel → sécurisé → testé → propre → esthétique.
