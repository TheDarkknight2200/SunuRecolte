package com.sunurecolte.config;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.paiement.dto.PaiementRequest;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.service.PaiementService;
import com.sunurecolte.recolte.dto.RecolteRequest;
import com.sunurecolte.recolte.service.RecolteService;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.InscriptionRequest;
import com.sunurecolte.user.dto.ModifierProfilProducteurRequest;
import com.sunurecolte.user.dto.RoleInscription;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.TypeAcheteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import com.sunurecolte.user.service.AuthService;
import com.sunurecolte.user.service.ProducteurService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Jeu de données de démonstration, activé à la demande par le profil Spring {@code demo}.
 *
 * But : remplir une base locale vide avec des données réalistes pour parcourir les tableaux de
 * bord, les statistiques (LOT STAT-1) et préparer les captures d'écran du mémoire. Ce composant
 * ne doit jamais tourner contre une base de production.
 *
 * Trois garde-fous, vérifiés dans cet ordre :
 * <ul>
 *   <li>{@code @Profile("demo")} : rien ne s'exécute tant que {@code spring.profiles.active} ne
 *       contient pas {@code demo} ;</li>
 *   <li>{@code demo} et {@code prod} actifs ensemble sont refusés au démarrage, même si aucun
 *       {@code application-prod.properties} n'existe encore : la protection ne dépend pas de
 *       l'existence d'un fichier ;</li>
 *   <li>sans mot de passe de démonstration (variable d'environnement {@code APP_DEMO_MOT_DE_PASSE}
 *       ou ligne {@code app.demo.mot-de-passe} de application-local.properties), le démarrage est
 *       refusé : aucun mot de passe par défaut n'est fourni, donc aucun n'est inventé.</li>
 * </ul>
 *
 * Toutes les écritures passent par les services réels et leurs règles métier :
 * {@link AuthService#inscrire} (hash BCrypt, profil créé avec le compte),
 * {@link ProducteurService#modifierMoi} (profil complet), {@link RecolteService#creer} (statut mis
 * par le service, cohérence des quantités), {@link CommandeService#creer} (prix unitaire et totaux
 * calculés serveur, stock décrémenté sous verrou, passage automatique à EPUISEE à zéro,
 * notification de chaque producteur concerné), {@link PaiementService#creer} (paiement SIMULÉ,
 * montant repris du total serveur) et {@link CommandeService#changerStatut} (transitions
 * autorisées, paiement exigé avant la confirmation d'une livraison, stock rendu et paiement soldé
 * à l'annulation). Aucune écriture directe en base, aucun contournement de ces règles : les
 * statuts que les services ne savent pas écrire — un paiement ÉCHOUÉ ou EN_ATTENTE — ne sont pas
 * inventés ici non plus.
 *
 * Génération déterministe : une graine unique ({@link #GRAINE}) rend les mêmes tirages à chaque
 * exécution. Les commandes sont étalées sur les {@value #JOURS_ETALES} derniers jours par
 * {@link Commande#setDateCreation} ; les paiements et les notifications gardent l'horodatage de
 * génération (limite consignée dans TASKS.md, LOT DEMO-1).
 *
 * Idempotence : si le premier compte de démonstration existe déjà, rien n'est créé et rien n'est
 * supprimé, une ligne INFO est journalisée. Les journaux ne portent que des adresses email, jamais
 * le mot de passe. Lancement et remise à zéro : README.md, section « Données de démonstration ».
 */
@Slf4j
@Component
@Profile("demo")
public class DemoDataInitializer implements CommandLineRunner {

    /** Graine unique de la génération : deux exécutions produisent les mêmes tirages. */
    private static final long GRAINE = 20261008L;

    /** Nombre de jours sur lesquels les commandes sont étalées. */
    private static final int JOURS_ETALES = 60;

    /**
     * Même plancher que l'inscription publique ({@code InscriptionRequest}) : le mot de passe de
     * démonstration sert aussi à se connecter, un mot de passe refusé à l'inscription serait
     * inutilisable.
     */
    private static final int LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

    /** Deux moyens, les seuls que connaisse le domaine : {@code MoyenPaiement} n'en admet aucun autre. */
    private static final MoyenPaiement[] MOYENS_DE_PAIEMENT = {
            MoyenPaiement.WAVE, MoyenPaiement.ORANGE_MONEY};

    /** Parts du stock restant qu'un acheteur de démonstration peut prendre d'un coup. */
    private static final BigDecimal[] FRACTIONS_DE_VENTE = {
            new BigDecimal("0.10"), new BigDecimal("0.25"), new BigDecimal("0.40"), new BigDecimal("0.55")};

    /**
     * Récoltes dont la vente est pilotée : produit -> stock final visé. Zéro rend la récolte ÉPUISÉE
     * par la règle réelle de {@link CommandeService}, une valeur sous le seuil d'alerte de stock faible
     * (5, LOT STAT-1) donne quelque chose à signaler aux statistiques. Ces récoltes sont exclues du
     * tirage libre et ne passent que par leur commande dédiée.
     */
    private static final Map<String, BigDecimal> STOCKS_FINAUX_PILOTES = Map.of(
            "Piment fort", BigDecimal.ZERO,
            "Salade", new BigDecimal("3.50"),
            "Mangue", new BigDecimal("4.00"));

    /** Rang de la commande qui joue chaque vente pilotée — un seul produit par rang. */
    private static final Map<String, Integer> COMMANDES_PILOTEES = Map.of(
            "Piment fort", 7,
            "Salade", 19,
            "Mangue", 41);

    private static final List<ProducteurDemo> PRODUCTEURS = List.of(
            new ProducteurDemo("producteur1.demo@sunurecolte.sn", "Ndiaye", "Fatou", "770000001",
                    Filiere.MARAICHAGE, "Thiès — plateau de Bandiagara",
                    "Culture maraîchère de plein champ : tomates, oignons et feuilles, revendues au "
                            + "panier sur les marchés de Thiès et de Dakar."),
            new ProducteurDemo("producteur2.demo@sunurecolte.sn", "Fall", "Moussa", "770000002",
                    Filiere.ELEVAGE, "Rufisque — Khorné",
                    "Élevage de volaille et de petit ruminant, avec un atelier de lait : oeufs, "
                            + "poulets de chair, moutons et lait cru."),
            new ProducteurDemo("producteur3.demo@sunurecolte.sn", "Sow", "Awa", "770000003",
                    Filiere.AUTRE, "Mbour — Ndiagane",
                    "Exploitation mixte : céréales vivrières (mil, arachide, maïs), fruits de saison "
                            + "et feuilles séchées pour la tisane. Le modèle approuvé n'admet qu'une "
                            + "filière par producteur : elle est ici AUTRE, et le détail des activités "
                            + "tient dans cette description."));

    /** Trois listes, dans l'ordre de {@link #PRODUCTEURS} : 8 + 4 + 8 = 20 récoltes. */
    private static final List<List<RecolteDemo>> RECOLTES_PAR_PRODUCTEUR = List.of(
            List.of(
                    new RecolteDemo("Tomate", "Tomates rondes cueillies le matin", "180.00", "10.00", "100.00", "kg", "800"),
                    new RecolteDemo("Oignon", "Oignons de Thiaré, filets de 25 kg", "240.00", "10.00", "150.00", "kg", "650"),
                    new RecolteDemo("Salade", "Salades vertes en bottes", "22.00", "2.00", "20.00", "botte", "300"),
                    new RecolteDemo("Piment fort", "Piments verts de saison", "12.00", "1.00", "10.00", "kg", "1200"),
                    new RecolteDemo("Aubergine", "Aubergines violettes", "90.00", "5.00", "60.00", "kg", "500"),
                    new RecolteDemo("Chou", "Choux cabus", "75.00", "5.00", "50.00", "kg", "400"),
                    new RecolteDemo("Carotte", "Carottes de pleine terre", "130.00", "10.00", "80.00", "kg", "900"),
                    new RecolteDemo("Concombre", "Concombres", "45.00", "3.00", "30.00", "botte", "350")),
            List.of(
                    new RecolteDemo("Poulet de chair", "Poulets locaux engraissés", "60.00", "1.00", "30.00", "tete", "3500"),
                    new RecolteDemo("Oeufs frais", "Plateaux de 30 oeufs", "200.00", "2.00", "100.00", "plateau", "1800"),
                    new RecolteDemo("Mouton", "Moutons de l'exploitation", "8.00", "1.00", "6.00", "tete", "120000"),
                    new RecolteDemo("Lait cru", "Lait de la bergerie, en bidon", "50.00", "5.00", "40.00", "litre", "700")),
            List.of(
                    new RecolteDemo("Mil", "Mil blanc décortiqué", "150.00", "10.00", "100.00", "kg", "500"),
                    new RecolteDemo("Arachide", "Arachides en coque séchées", "120.00", "10.00", "80.00", "kg", "900"),
                    new RecolteDemo("Maïs", "Maïs grain sec", "90.00", "10.00", "60.00", "kg", "450"),
                    new RecolteDemo("Mangue", "Mangues Kent de fin de saison", "70.00", "5.00", "50.00", "kg", "600"),
                    new RecolteDemo("Papaye", "Papayes forme soleil", "40.00", "3.00", "30.00", "kg", "350"),
                    new RecolteDemo("Banane plantain", "Bananes plantain", "35.00", "3.00", "25.00", "kg", "400"),
                    new RecolteDemo("Bissap", "Feuilles d'hibiscus séchées", "25.00", "2.00", "20.00", "kg", "1500"),
                    new RecolteDemo("Kinkeliba", "Feuilles de tisane séchées", "18.00", "2.00", "15.00", "kg", "800")));

    private static final List<AcheteurDemo> ACHETEURS = List.of(
            new AcheteurDemo("acheteur1.demo@sunurecolte.sn", "Diallo", "Amadou", "771000001",
                    TypeAcheteur.COMMERCANT, "Marché d'Ouakam, Dakar"),
            new AcheteurDemo("acheteur2.demo@sunurecolte.sn", "Ba", "Ndeye", "771000002",
                    TypeAcheteur.COMMERCANT, "Grand Marché de Mbour"),
            new AcheteurDemo("acheteur3.demo@sunurecolte.sn", "Gueye", "Cheikh", "771000003",
                    TypeAcheteur.RESTAURATEUR, "Point E, Dakar"),
            new AcheteurDemo("acheteur4.demo@sunurecolte.sn", "Sarr", "Mariama", "771000004",
                    TypeAcheteur.RESTAURATEUR, "Ngor, Dakar"),
            new AcheteurDemo("acheteur5.demo@sunurecolte.sn", "Cisse", "Ibrahima", "771000005",
                    TypeAcheteur.PARTICULIER, "Yeumbeul, Dakar"),
            new AcheteurDemo("acheteur6.demo@sunurecolte.sn", "Diatta", "Coumba", "771000006",
                    TypeAcheteur.PARTICULIER, "Mermoz, Dakar"));

    private final Environment environment;
    private final AuthService authService;
    private final ProducteurService producteurService;
    private final RecolteService recolteService;
    private final CommandeService commandeService;
    private final PaiementService paiementService;
    private final UtilisateurRepository utilisateurRepository;
    private final ProducteurRepository producteurRepository;
    private final AcheteurRepository acheteurRepository;
    private final CommandeRepository commandeRepository;
    private final String motDePasse;

    public DemoDataInitializer(Environment environment,
                               AuthService authService,
                               ProducteurService producteurService,
                               RecolteService recolteService,
                               CommandeService commandeService,
                               PaiementService paiementService,
                               UtilisateurRepository utilisateurRepository,
                               ProducteurRepository producteurRepository,
                               AcheteurRepository acheteurRepository,
                               CommandeRepository commandeRepository,
                               @Value("${app.demo.mot-de-passe:}") String motDePasse) {
        this.environment = environment;
        this.authService = authService;
        this.producteurService = producteurService;
        this.recolteService = recolteService;
        this.commandeService = commandeService;
        this.paiementService = paiementService;
        this.utilisateurRepository = utilisateurRepository;
        this.producteurRepository = producteurRepository;
        this.acheteurRepository = acheteurRepository;
        this.commandeRepository = commandeRepository;
        this.motDePasse = motDePasse;
    }

    @Override
    @Transactional
    public void run(String... args) {
        verifierGardeFous();

        String emailDeControle = PRODUCTEURS.get(0).email();
        if (utilisateurRepository.existsByEmail(emailDeControle)) {
            log.info("Données de démonstration : le compte {} existe déjà, aucune donnée n'est "
                    + "créée et aucune n'est supprimée.", emailDeControle);
            return;
        }

        Random random = new Random(GRAINE);
        List<CompteProducteur> producteurs = creerProducteurs();
        List<CompteAcheteur> acheteurs = creerAcheteurs();
        List<RecoltePilotee> catalogue = creerRecoltes(producteurs);
        int commandes = creerCommandes(random, catalogue, producteurs, acheteurs);

        log.info("Données de démonstration créées : {} producteurs, {} acheteurs, {} récoltes, "
                        + "{} commandes étalées sur {} jours. Comptes : {} .",
                producteurs.size(), acheteurs.size(), catalogue.size(), commandes, JOURS_ETALES,
                String.join(", ", emailsDeDemonstration()));
    }

    // ------------------------------------------------------------------ garde-fous

    /**
     * Refuse tout démarrage dangereux. Le contrôle {@code demo} + {@code prod} passe avant
     * l'idempotence : une base déjà garnie ne doit jamais masquer une configuration de production.
     */
    private void verifierGardeFous() {
        if (environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("Le profil « demo » est actif en même temps que le profil "
                    + "« prod » : les données de démonstration ne doivent jamais alimenter une base de "
                    + "production. Retirez « demo » de spring.profiles.active.");
        }
        if (motDePasse.isBlank()) {
            throw new IllegalStateException("Le profil « demo » exige un mot de passe pour les comptes "
                    + "de démonstration : renseignez la variable d'environnement APP_DEMO_MOT_DE_PASSE "
                    + "(ou la ligne app.demo.mot-de-passe de application-local.properties, hors Git). "
                    + "Aucun mot de passe par défaut n'est fourni.");
        }
        if (motDePasse.length() < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
            throw new IllegalStateException("Le mot de passe des comptes de démonstration doit contenir "
                    + "au moins " + LONGUEUR_MINIMALE_MOT_DE_PASSE + " caractères, comme à l'inscription "
                    + "réelle.");
        }
    }

    // ------------------------------------------------------------------ comptes

    /**
     * Un compte producteur = une inscription réelle (compte et profil, mot de passe haché par
     * {@link AuthService}) puis {@link ProducteurService#modifierMoi} pour le profil complet :
     * l'inscription ne porte ni la localisation de l'exploitation ni la description.
     */
    private List<CompteProducteur> creerProducteurs() {
        List<CompteProducteur> comptes = new ArrayList<>();
        for (ProducteurDemo demo : PRODUCTEURS) {
            authService.inscrire(new InscriptionRequest(demo.nom(), demo.prenom(), demo.email(),
                    demo.telephone(), motDePasse, RoleInscription.PRODUCTEUR, demo.filiere(), null));

            Utilisateur utilisateur = utilisateurOuErreur(demo.email());
            UtilisateurPrincipal principal = UtilisateurPrincipal.depuis(utilisateur);
            producteurService.modifierMoi(new ModifierProfilProducteurRequest(
                    demo.prenom(), demo.nom(), demo.email(), demo.telephone(),
                    demo.localisation(), demo.filiere(), demo.description()), principal);

            Producteur producteur = producteurRepository.findByUtilisateurId(utilisateur.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Profil producteur absent pour le compte de démonstration " + demo.email()));
            comptes.add(new CompteProducteur(principal, producteur.getId(), demo.localisation()));
        }
        return comptes;
    }

    private List<CompteAcheteur> creerAcheteurs() {
        List<CompteAcheteur> comptes = new ArrayList<>();
        for (AcheteurDemo demo : ACHETEURS) {
            authService.inscrire(new InscriptionRequest(demo.nom(), demo.prenom(), demo.email(),
                    demo.telephone(), motDePasse, RoleInscription.ACHETEUR, null, demo.typeAcheteur()));

            Utilisateur utilisateur = utilisateurOuErreur(demo.email());
            Acheteur acheteur = acheteurRepository.findByUtilisateurId(utilisateur.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Profil acheteur absent pour le compte de démonstration " + demo.email()));
            comptes.add(new CompteAcheteur(UtilisateurPrincipal.depuis(utilisateur), acheteur.getId(),
                    demo.telephone(), demo.quartier()));
        }
        return comptes;
    }

    private Utilisateur utilisateurOuErreur(String email) {
        return utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Compte de démonstration absent après inscription : " + email));
    }

    // ------------------------------------------------------------------ récoltes

    /**
     * Chaque récolte passe par {@link RecolteService#creer} : le service pose le statut DISPONIBLE et
     * contrôle la cohérence des quantités. Aucune image n'est référencée — le projet ne contient
     * qu'une photo d'accueil, et aucun lien externe nouveau n'est autorisé : {@code imageUrl} reste null.
     */
    private List<RecoltePilotee> creerRecoltes(List<CompteProducteur> producteurs) {
        List<RecoltePilotee> catalogue = new ArrayList<>();
        for (int indexProfil = 0; indexProfil < producteurs.size(); indexProfil++) {
            CompteProducteur compte = producteurs.get(indexProfil);
            for (RecolteDemo demo : RECOLTES_PAR_PRODUCTEUR.get(indexProfil)) {
                var recolte = recolteService.creer(new RecolteRequest(
                        compte.profilId(), demo.produit(), demo.description(),
                        new BigDecimal(demo.quantiteDisponible()), new BigDecimal(demo.quantiteMin()),
                        new BigDecimal(demo.quantiteMax()), demo.unite(), new BigDecimal(demo.prixUnitaire()),
                        null, compte.localisation(), LocalDate.now()), compte.principal());
                catalogue.add(new RecoltePilotee(recolte.id(), compte.profilId(), demo.produit(),
                        new BigDecimal(demo.quantiteDisponible()), STOCKS_FINAUX_PILOTES.get(demo.produit())));
            }
        }
        return catalogue;
    }

    // ------------------------------------------------------------------ commandes

    /**
     * Une commande par rang de {@link #repartitionDesStatuts()}. Le cycle est joué dans l'ordre réel :
     * création par l'acheteur, paiement simulé quand la règle l'exige, transitions par un producteur
     * concerné. La date est posée en dernier : {@link CommandeService#changerStatut} recharge la
     * commande sous verrou, ce qui écraserait une date pas encore écrite en base.
     *
     * @return le nombre de commandes réellement créées
     */
    private int creerCommandes(Random random, List<RecoltePilotee> catalogue,
                               List<CompteProducteur> producteurs, List<CompteAcheteur> acheteurs) {
        List<StatutCommande> statutsCibles = repartitionDesStatuts();
        int commandesCrees = 0;
        for (int index = 0; index < statutsCibles.size(); index++) {
            List<Ligne> lignes = choisirLignes(random, catalogue, index,
                    producteursAMelanger(producteurs, index));
            if (lignes.isEmpty()) {
                // Plus aucune récolte en stock : mieux vaut une commande de moins qu'une commande vide.
                continue;
            }
            CompteAcheteur acheteur = acheteurs.get(random.nextInt(acheteurs.size()));
            ModeReception mode = random.nextInt(100) < 65 ? ModeReception.LIVRAISON : ModeReception.RETRAIT;
            CompteProducteur premier = producteurConcernne(producteurs, lignes.get(0).recolte());

            var commande = commandeService.creer(new CommandeRequest(
                    acheteur.profilId(), mode,
                    mode == ModeReception.LIVRAISON ? acheteur.quartier() : null,
                    mode == ModeReception.LIVRAISON ? acheteur.telephone() : null,
                    instructions(mode, premier.localisation()),
                    lignes.stream().map(Ligne::request).toList()), acheteur.principal());
            commandesCrees++;

            jouerLeCycle(commande.id(), statutsCibles.get(index), index, mode, acheteur, premier, random);
            daterCommande(commande.id(), dateEtalee(random));
        }
        return commandesCrees;
    }

    /**
     * Répartition figée des statuts : 10 EN_ATTENTE, 12 CONFIRMEE, 8 PRETE, 22 LIVREE, 8 ANNULEE.
     * Ces nombres sont écrits plutôt que tirés au sort pour que chaque statut soit nécessairement
     * présent sur les écrans et dans les statistiques.
     */
    private List<StatutCommande> repartitionDesStatuts() {
        List<StatutCommande> statuts = new ArrayList<>();
        ajouterStatuts(statuts, StatutCommande.EN_ATTENTE, 10);
        ajouterStatuts(statuts, StatutCommande.CONFIRMEE, 12);
        ajouterStatuts(statuts, StatutCommande.PRETE, 8);
        ajouterStatuts(statuts, StatutCommande.LIVREE, 22);
        ajouterStatuts(statuts, StatutCommande.ANNULEE, 8);
        return statuts;
    }

    private static void ajouterStatuts(List<StatutCommande> statuts, StatutCommande statut, int nombre) {
        for (int i = 0; i < nombre; i++) {
            statuts.add(statut);
        }
    }

    /**
     * Un paiement simulé est initié quand la règle « paiement avant confirmation » l'exige (livraison
     * vers CONFIRMEE, PRETE ou LIVREE), quand une annulation doit laisser un remboursement derrière
     * elle (une annulation sur deux, par rang pair), et pour la moitié des retraits qui avancent. Le
     * statut du paiement est toujours REUSSI après {@link PaiementService#creer} ; c'est l'annulation
     * de la commande qui en fait un REMBOURSE, jamais ce composant.
     */
    private void jouerLeCycle(Long commandeId, StatutCommande cible, int index, ModeReception mode,
                              CompteAcheteur acheteur, CompteProducteur pilote, Random random) {
        boolean enMarche = cible != StatutCommande.EN_ATTENTE && cible != StatutCommande.ANNULEE;
        boolean paiementSoldeParAnnulation = cible == StatutCommande.ANNULEE && index % 2 == 0;
        boolean paiementExige = mode == ModeReception.LIVRAISON && enMarche;
        boolean paiementSurRetrait = mode == ModeReception.RETRAIT && enMarche && random.nextInt(2) == 0;

        if (paiementExige || paiementSoldeParAnnulation || paiementSurRetrait) {
            paiementService.creer(new PaiementRequest(commandeId,
                    MOYENS_DE_PAIEMENT[random.nextInt(MOYENS_DE_PAIEMENT.length)]), acheteur.principal());
        }

        if (cible == StatutCommande.ANNULEE) {
            commandeService.changerStatut(commandeId, new StatutCommandeRequest(StatutCommande.ANNULEE),
                    acheteur.principal());
            return;
        }
        if (!enMarche) {
            return;
        }
        for (StatutCommande etape : etapesVers(cible)) {
            commandeService.changerStatut(commandeId, new StatutCommandeRequest(etape), pilote.principal());
        }
    }

    /** Le cycle réel ne permet de sauter aucune étape : EN_ATTENTE → CONFIRMEE → PRETE → LIVREE. */
    private List<StatutCommande> etapesVers(StatutCommande cible) {
        return switch (cible) {
            case CONFIRMEE -> List.of(StatutCommande.CONFIRMEE);
            case PRETE -> List.of(StatutCommande.CONFIRMEE, StatutCommande.PRETE);
            case LIVREE -> List.of(StatutCommande.CONFIRMEE, StatutCommande.PRETE, StatutCommande.LIVREE);
            default -> List.of();
        };
    }

    /**
     * Date d'une commande : un jour parmi les {@value #JOURS_ETALES} derniers, à une heure ouvrable,
     * toujours dans le passé. La colonne {@code date_creation} n'est rendue modifiable que pour cet
     * étalement (voir {@link Commande}).
     */
    private LocalDateTime dateEtalee(Random random) {
        return LocalDateTime.now()
                .minusDays(random.nextInt(JOURS_ETALES))
                .minusHours(random.nextInt(10))
                .withMinute(random.nextInt(60))
                .withSecond(0)
                .withNano(0);
    }

    /**
     * Imposer la date après tout le cycle : l'entité relue est l'instance suivie de la transaction,
     * l'UPDATE part donc au vidage automatique, sans écriture SQL directe.
     */
    private void daterCommande(Long commandeId, LocalDateTime date) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new IllegalStateException(
                        "Commande de démonstration absente de la base : id " + commandeId));
        commande.setDateCreation(date);
    }

    // ------------------------------------------------------------------ tirage des lignes

    /**
     * Une à trois récoltes distinctes encore en stock. Les trois premières commandes prennent une
     * récolte chez deux producteurs différents : ce sont les commandes mixtes, celles qu'un producteur
     * voit dans « Mes commandes reçues » avec deux exploitations engagées.
     */
    private List<Ligne> choisirLignes(Random random, List<RecoltePilotee> catalogue, int index,
                                      List<CompteProducteur> producteursAMelanger) {
        List<Ligne> lignes = new ArrayList<>();
        for (CompteProducteur compte : producteursAMelanger) {
            auHasard(recoltesEnStock(catalogue, compte.profilId()), random)
                    .ifPresent(recolte -> lignes.add(tirerQuantite(recolte, random)));
        }

        int nombreVoulu = 1 + random.nextInt(3);
        List<RecoltePilotee> candidates = recoltesEnStock(catalogue, null);
        Collections.shuffle(candidates, random);
        for (RecoltePilotee recolte : candidates) {
            if (lignes.size() >= nombreVoulu) {
                break;
            }
            boolean dejaPrise = lignes.stream().anyMatch(ligne -> ligne.recolte() == recolte);
            if (!dejaPrise) {
                lignes.add(tirerQuantite(recolte, random));
            }
        }

        for (Map.Entry<String, Integer> entree : COMMANDES_PILOTEES.entrySet()) {
            if (entree.getValue() == index) {
                vendreJusquaLaCible(catalogue, entree.getKey()).ifPresent(lignes::add);
            }
        }
        return lignes;
    }

    /**
     * Vente pilotée : amène exactement la récolte citée à son stock final visé. Si le stock restant ne
     * dépasse plus cette cible, rien n'est demandé : la commande dédiée devient inutile plutôt que
     * fautive, et le stock ne peut jamais passer sous zéro.
     */
    private Optional<Ligne> vendreJusquaLaCible(List<RecoltePilotee> catalogue, String produit) {
        RecoltePilotee recolte = catalogue.stream()
                .filter(candidate -> candidate.produit.equals(produit))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Récolte de démonstration absente : " + produit));
        BigDecimal quantite = recolte.stockRestant.subtract(recolte.stockFinalVise);
        return quantite.signum() > 0 ? Optional.of(vendre(recolte, quantite)) : Optional.empty();
    }

    /** Prélèvement libre : une part du reste, la totalité sur un tirage sur dix. */
    private Ligne tirerQuantite(RecoltePilotee recolte, Random random) {
        BigDecimal quantite = random.nextInt(10) == 0
                ? recolte.stockRestant
                : recolte.stockRestant
                        .multiply(FRACTIONS_DE_VENTE[random.nextInt(FRACTIONS_DE_VENTE.length)])
                        .setScale(2, RoundingMode.DOWN);
        if (quantite.signum() <= 0) {
            // Reste trop petit pour une fraction : l'acheteur prend la totalité.
            quantite = recolte.stockRestant;
        }
        return vendre(recolte, quantite);
    }

    /**
     * Enregistre le prélèvement côté générateur : le stock suivi ici ne sert qu'à ne jamais demander au
     * service plus que ce qu'il reste. L'autorité du stock reste la colonne de la base, décrémentée par
     * {@link CommandeService#creer}.
     */
    private Ligne vendre(RecoltePilotee recolte, BigDecimal quantite) {
        if (quantite.signum() <= 0 || quantite.compareTo(recolte.stockRestant) > 0) {
            throw new IllegalStateException("Quantité « " + quantite + " » hors du stock restant ("
                    + recolte.stockRestant + ") de la récolte « " + recolte.produit + " ».");
        }
        recolte.stockRestant = recolte.stockRestant.subtract(quantite);
        return new Ligne(new LigneCommandeRequest(recolte.recolteId, quantite), recolte);
    }

    /** Récoltes libres de stock, hors celles dont la vente est pilotée, filtrées par producteur si demandé. */
    private List<RecoltePilotee> recoltesEnStock(List<RecoltePilotee> catalogue, Long producteurId) {
        return catalogue.stream()
                .filter(recolte -> recolte.stockFinalVise == null)
                .filter(recolte -> producteurId == null || recolte.producteurId.equals(producteurId))
                .filter(recolte -> recolte.stockRestant.signum() > 0)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private Optional<RecoltePilotee> auHasard(List<RecoltePilotee> candidates, Random random) {
        return candidates.isEmpty() ? Optional.empty()
                : Optional.of(candidates.get(random.nextInt(candidates.size())));
    }

    /** Les trois premières commandes sont mixtes : deux producteurs distincts, dans l'ordre de création. */
    private List<CompteProducteur> producteursAMelanger(List<CompteProducteur> producteurs, int index) {
        if (index >= 3) {
            return List.of();
        }
        return List.of(producteurs.get(index), producteurs.get((index + 1) % producteurs.size()));
    }

    /**
     * Le producteur qui pilote les transitions est celui de la première ligne :
     * {@link CommandeService#changerStatut} n'admet qu'un producteur concerné ou l'administrateur, et
     * la démonstration reste du côté producteur.
     */
    private CompteProducteur producteurConcernne(List<CompteProducteur> producteurs, RecoltePilotee recolte) {
        return producteurs.stream()
                .filter(compte -> compte.profilId.equals(recolte.producteurId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Aucun producteur de démonstration pour la récolte " + recolte.recolteId));
    }

    private static String instructions(ModeReception mode, String localisationExploitation) {
        return mode == ModeReception.LIVRAISON
                ? "Livrer le matin, appeler à l'arrivée."
                : "Retrait à l'exploitation : " + localisationExploitation + ".";
    }

    private List<String> emailsDeDemonstration() {
        List<String> emails = new ArrayList<>();
        PRODUCTEURS.forEach(demo -> emails.add(demo.email()));
        ACHETEURS.forEach(demo -> emails.add(demo.email()));
        return emails;
    }

    // ------------------------------------------------------------------ supports de données

    private record ProducteurDemo(String email, String nom, String prenom, String telephone,
                                  Filiere filiere, String localisation, String description) {}

    private record AcheteurDemo(String email, String nom, String prenom, String telephone,
                                TypeAcheteur typeAcheteur, String quartier) {}

    private record RecolteDemo(String produit, String description, String quantiteDisponible,
                               String quantiteMin, String quantiteMax, String unite, String prixUnitaire) {}

    private record CompteProducteur(UtilisateurPrincipal principal, Long profilId, String localisation) {}

    private record CompteAcheteur(UtilisateurPrincipal principal, Long profilId,
                                  String telephone, String quartier) {}

    /** Ligne tirée pour une commande : la requête telle que le service la reçoit, et sa récolte. */
    private record Ligne(LigneCommandeRequest request, RecoltePilotee recolte) {}

    /**
     * Récolte telle que le générateur la suit. {@code stockRestant} ne sert qu'à ne jamais demander au
     * service plus que ce qu'il reste : l'autorité du stock reste la colonne de la base, décrémentée
     * par {@link CommandeService}.
     */
    private static final class RecoltePilotee {
        private final Long recolteId;
        private final Long producteurId;
        private final String produit;
        private final BigDecimal stockFinalVise;
        private BigDecimal stockRestant;

        private RecoltePilotee(Long recolteId, Long producteurId, String produit, BigDecimal stockInitial,
                               BigDecimal stockFinalVise) {
            this.recolteId = recolteId;
            this.producteurId = producteurId;
            this.produit = produit;
            this.stockRestant = stockInitial;
            this.stockFinalVise = stockFinalVise;
        }
    }
}
