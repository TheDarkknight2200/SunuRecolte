# SunuRecolte 🌾

Plateforme web de mise en relation directe entre producteurs agricoles et acheteurs dans la région de Dakar.
*Projet de fin d'études — Licence 3 Informatique.*

---

## 📌 Présentation

**SunuRecolte** facilite la commercialisation des produits agricoles locaux en éliminant les intermédiaires superflus. La plateforme permet :
- Aux **producteurs** de publier leurs récoltes disponibles, de gérer leurs stocks et de suivre leurs commandes.
- Aux **acheteurs** (commerçants, restaurateurs, particuliers) de parcourir le catalogue, filtrer les récoltes, commander (retrait ou livraison) et payer via mobile money.
- Aux **administrateurs** de modérer les utilisateurs, les offres de récoltes, et de gérer les prix indicatifs du marché.

---

## 🛠 Stack Technique

- **Frontend** : Angular
- **Backend** : Spring Boot 3.x (Java 17)
- **Base de données** : PostgreSQL
- **ORM** : Spring Data JPA / Hibernate
- **Sécurité** : Spring Security 6 + JWT (stateless)
- **Validation** : Jakarta Bean Validation (`@Valid`)
- **Documentation API** : OpenAPI 3 / Swagger
- **Paiement** : Approche progressive (Simulation/Sandbox d'abord, puis Wave / Orange Money selon disponibilité API)

---

## 📐 Architecture & Modèle de Données

Architecture générale : **Angular → Spring Boot REST API → PostgreSQL**

### 9 Entités approuvées :
1. `Utilisateur` : identité, rôles (`PRODUCTEUR`, `ACHETEUR`, `ADMIN`), statut actif.
2. `Producteur` : exploitation, filière (`MARAICHAGE`, `ELEVAGE`, `CEREALES`, `AUTRE`), description.
3. `Acheteur` : type d'acheteur (`COMMERÇANT`, `RESTAURATEUR`, `PARTICULIER`).
4. `Récolte` : produit, quantité disponible, prix unitaire, localisation, statut (`DISPONIBLE`, `EPUISEE`).
5. `Commande` : statut (`EN_ATTENTE`, `CONFIRMEE`, `PRETE`, `LIVREE`, `ANNULEE`), mode réception (`RETRAIT`, `LIVRAISON`), adresse.
6. `LigneCommande` : récolte, quantité, prix unitaire historique, sous-total.
7. `Paiement` : référence, montant, moyen (`WAVE`, `ORANGE_MONEY`), statut (`EN_ATTENTE`, `REUSSI`, `ECHOUE`, `ANNULE`).
8. `Notification` : utilisateur destinataire, titre, message, statut de lecture (MVP REST).
9. `PrixMarche` : prix indicatifs moyens de référence administrés.

---

## 📚 Documents de Référence

- [`PROJECT_RULES.md`](./PROJECT_RULES.md) : Règles universelles et strictes du projet (périmètre, contraintes).
- [`CONTEXTE.md`](./CONTEXTE.md) : Contexte académique, acteurs, priorités du MVP.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) : Détail des flux et découpage en packages.
- [`TASKS.md`](./TASKS.md) : Suivi détaillé de l'avancement par phases.
- [`REGLES_DEVELOPPEMENT.md`](./REGLES_DEVELOPPEMENT.md) : Bonnes pratiques de code, tests et commits.

---

## ⚙️ Prérequis

- **Java JDK 17** (testé avec Eclipse Adoptium Temurin 17)
- **Apache Maven 3.9+**
- **PostgreSQL 17**
- **Node.js 18+** / **Angular CLI**
