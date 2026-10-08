# CLAUDE.md — Instructions spécifiques à Claude Code

Les règles universelles du projet sont définies dans `PROJECT_RULES.md`. Ce fichier doit être lu en complément.

# SUNURECOLTE — Instructions pour l'IA

Lire ce fichier AVANT toute modification du projet.

## Projet
SunuRecolte est une plateforme web responsive mettant en relation producteurs agricoles et acheteurs dans la région de Dakar.

## Stack imposée
- Frontend : Angular 21 (composants standalone, SCSS, Reactive Forms ; tests Vitest) — identité visuelle
  et règles d'interface dans `FRONTEND_DESIGN.md`
- Backend : Spring Boot 3.x, Java 17
- Base : PostgreSQL
- ORM : Spring Data JPA / Hibernate
- Sécurité : Spring Security + JWT
- API : REST + Swagger/OpenAPI
- Validation : Bean Validation (@Valid) + @ControllerAdvice

Architecture :
Angular → API REST Spring Boot → PostgreSQL

Paiement :
1. simulation/sandbox
2. Wave si accès API disponible
3. Orange Money si accès API disponible

Ne jamais prétendre qu'un paiement réel est intégré s'il n'a pas réellement été configuré et testé.

## Modèle de données approuvé
9 entités :
1. Utilisateur
2. Producteur
3. Acheteur
4. Récolte
5. Commande
6. LigneCommande
7. Paiement
8. Notification
9. PrixMarche

### Utilisateur
id, nom, prenom, email, telephone, mot_de_passe, role, date_creation, actif

Role : PRODUCTEUR, ACHETEUR, ADMIN

### Producteur
id, utilisateur_id, localisation_exploitation, filiere, description

Filiere : MARAICHAGE, ELEVAGE, CEREALES, AUTRE

### Acheteur
id, utilisateur_id, type_acheteur

TypeAcheteur : COMMERCANT, RESTAURATEUR, PARTICULIER

### Récolte
id, producteur_id, produit, description, quantite_disponible, quantite_min, quantite_max, unite, prix_unitaire, image_url, localisation, date_disponibilite, statut, date_creation

StatutRecolte : DISPONIBLE, EPUISEE

### Commande
id, acheteur_id, date_creation, statut, total, mode_reception, adresse_livraison, telephone_livraison, instructions_livraison

StatutCommande : EN_ATTENTE, CONFIRMEE, PRETE, LIVREE, ANNULEE

ModeReception : RETRAIT, LIVRAISON

Transitions réellement appliquées par `CommandeService.changerStatut` (`TRANSITIONS_AUTORISEES`) :
EN_ATTENTE → {CONFIRMEE, ANNULEE}, CONFIRMEE → {PRETE, ANNULEE}, PRETE → {LIVREE}, LIVREE et
ANNULEE terminaux. Un statut déjà atteint et une transition interdite sont deux 400 distincts
(« La commande est déjà au statut … », « Transition de statut interdite : … vers … »), et ces bornes
s'appliquent aussi à l'ADMIN.

Règle « paiement avant confirmation » : pour une commande en LIVRAISON, les cibles CONFIRMEE et
PRETE exigent un paiement au statut REUSSI, quel que soit le rôle qui les demande ; sinon 400 au
message près : « Une commande en livraison doit être payée avant d'être confirmée. » pour
CONFIRMEE, et « Une commande en livraison doit être payée avant d'être marquée prête. » pour PRETE.
Un paiement en attente, échoué, remboursé ou annulé ne débloque pas le cycle, et une
commande sans paiement reste soumise à la même exigence. La règle ne s'applique pas au RETRAIT.
Elle est vérifiée après le statut déjà atteint et après la transition interdite, avant toute
écriture. Une annulation restaure le stock (un EPUISEE repasse en DISPONIBLE) et solde le paiement. Le
statut de la commande est lu et validé **sous verrou pessimiste d'écriture** (`findByIdForUpdate`, puis
relecture de l'instance par `refresh`) : sans lui, deux annulations simultanées rendaient le stock deux
fois. Ordre des verrous : la commande d'abord, puis les récoltes triées par identifiant. Le délai
d'attente du verrou (`lock.timeout`) est déclaré mais mesuré inerte sur PostgreSQL avec Hibernate.

`CommandeResponse` expose en fin de record `statutPaiement` et `moyenPaiement` : nullables, une
commande sans paiement rend les deux `null`. En liste, ces paiements sont chargés en une seule
requête (`findByCommandeIdIn`), quelle que soit la taille de la liste.

### LigneCommande
id, commande_id, recolte_id, quantite, prix_unitaire, sous_total

IMPORTANT : prix_unitaire conserve le prix historique de la transaction.

### Paiement
id, commande_id, reference_transaction, montant, moyen_paiement, statut, date_creation, date_confirmation

MoyenPaiement : WAVE, ORANGE_MONEY
StatutPaiement : EN_ATTENTE, REUSSI, ECHOUE, ANNULE, REMBOURSE

Flux réel du paiement (`PaiementService`, simulation) :
- `POST /api/paiements` est la seule écriture d'un paiement de l'API. Il refuse une commande
  ANNULEE (« Impossible d'initier un paiement pour une commande annulée. ») et une commande LIVREE
  (« Cette commande est déjà livrée. ») par un 400, et refuse un second paiement par un 400
  (« Un paiement existe déjà pour cette commande. ») ; la contrainte `uq_paiements_commande`
  traduit la course concurrente en ce même message, jamais en 500.
- le montant est repris de `commande.getTotal()` calculé côté serveur, jamais de la requête.
- un paiement enregistré est posé REUSSI, avec une référence `SIMU-<uuid>` et une date de
  confirmation horodatée par le serveur (`appliquerLaReussiteSimulee`, seul endroit qui écrit
  REUSSI) : la réussite fait partie de la simulation, aucune transaction réelle n'a lieu.
- EN_ATTENTE reste la valeur initiale de l'entité mais n'est écrit par aucun endpoint ; ECHOUE
  n'est écrit par aucun chemin de l'API.
- l'annulation d'une commande solde son paiement : REUSSI devient REMBOURSE (remboursement simulé,
  comme la réussite), EN_ATTENTE devient ANNULE, les autres statuts restent inchangés.
- la migration `V2__paiement_statut_rembourse.sql` remplace la contrainte `ck_paiements_statut` de
  V1 pour y ajouter REMBOURSE ; elle ne modifie aucune colonne.

### Notification
id, utilisateur_id, titre, message, lu, date_creation

MVP sans WebSocket (les trois endpoints réels de `NotificationController`) :
- GET /api/notifications (liste du titulaire du jeton, triée date_creation DESC ; l'ADMIN sans paramètre
  reçoit toutes les notifications ; `utilisateurId` en paramètre = id de compte `Utilisateur`, jamais un id de
  profil, et un `utilisateurId` d'un autre compte renvoie 403)
- GET /api/notifications/{id} (404 si inconnue, 403 si elle appartient à un autre compte)
- PUT /api/notifications/{id}/lue (aucun corps, idempotent, renvoie la notification avec lu = true)

Aucun endpoint de comptage des non-lues, aucune pagination, aucune suppression.
Création automatique : dans `CommandeService` (une notification « Nouvelle commande » à chaque
producteur distinct à la création d'une commande, une « Suivi de commande » à l'acheteur à chaque changement
de statut) et dans `PaiementService` (une notification « Paiement simulé » à chaque producteur distinct
concerné, à l'enregistrement du paiement). Le message rend le statut **persisté** du paiement
(`REUSSI`, depuis que la simulation pose la réussite à l'enregistrement) et rappelle qu'aucune
transaction réelle n'est effectuée : aucune notification n'affirme un paiement réellement reçu ou
réellement encaissé.

### PrixMarche
id, produit, unite, prix_moyen, marche_reference, date_mise_a_jour

Les prix sont indicatifs et gérés par l'administrateur dans le MVP.

## Relations
- Utilisateur 1 → 0..1 Producteur
- Utilisateur 1 → 0..1 Acheteur
- Producteur 1 → 0..* Récolte
- Acheteur 1 → 0..* Commande
- Commande 1 → 1..* LigneCommande
- Récolte 1 → 0..* LigneCommande
- Commande 1 → 1 Paiement
- Utilisateur 1 → 0..* Notification

Producteur et Acheteur NE SONT PAS des sous-classes de Utilisateur. Ce sont des profils liés par utilisateur_id.

## Structure backend
com.sunurecolte
├── config/
├── security/
├── user/
├── recolte/
├── commande/
├── paiement/
├── notification/
├── prixmarche/
└── exception/

Séparation obligatoire :
Controller → Service → Repository

La logique métier importante reste dans les Services.

## Sécurité
- mots de passe hashés ;
- 8 caractères minimum exigés à l'inscription (`InscriptionRequest`) ; la connexion n'impose aucune longueur, pour ne fermer aucun compte créé plus tôt avec 6 ou 7 caractères ; l'amorçage local du compte ADMIN accepte encore 6 caractères (`AdminInitializer`) ;
- tentatives de connexion limitées : cinq échecs pour un couple (email normalisé, adresse vue par le serveur) dans une fenêtre de quinze minutes arment quinze minutes de blocage, refus rendu en 429 avec `Retry-After` ; compteur en mémoire dans une seule instance, remis à zéro au redémarrage ;
- JWT stateless ;
- autorisation par rôle côté backend ;
- validation des entrées ;
- DTO lorsque nécessaire ;
- @ControllerAdvice ;
- aucun secret dans Git.

## Règles métier
- Une récolte appartient à un seul producteur.
- Un producteur ne peut modifier/supprimer que ses propres récoltes.
- Une récolte indisponible ne peut pas être commandée.
- Quantités et prix positifs.
- La quantité commandée ne peut pas dépasser le stock.
- Si LIVRAISON : adresse et téléphone obligatoires.
- Une commande en livraison ne peut être confirmée ni marquée prête sans un paiement au statut REUSSI ; la règle ne s'applique pas au RETRAIT (voir « Commande »).
- Paiement réussi → REUSSI. Dans la simulation, l'enregistrement d'un paiement pose REUSSI.
- Paiement échoué → ECHOUE. Aucun chemin de l'API actuelle n'écrit ECHOUE.
- Annulation d'une commande payée → REMBOURSE (remboursement simulé, comme la réussite).

## HORS MVP
Ne pas ajouter sans validation :
- table Produit séparée
- Livraison
- Transporteur
- microservices
- WebSocket
- application mobile native
- IA de prédiction
- recommandations complexes
- USSD
- WhatsApp
- logistique avancée
- géolocalisation avancée
- système complexe d'avis

## Règle fondamentale
Avant toute modification :
1. Lire CLAUDE.md
2. Lire CONTEXTE.md
3. Lire TASKS.md
4. Vérifier ARCHITECTURE.md
5. Identifier les fichiers concernés
6. Modifier seulement le nécessaire
7. Tester réellement
8. Décrire exactement les changements

Ne jamais réécrire massivement le projet sans raison.
Ne jamais inventer une fonctionnalité.
Ne jamais modifier le modèle de données approuvé sans validation de l'équipe.
