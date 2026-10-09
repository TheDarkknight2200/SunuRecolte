package com.sunurecolte.config;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.paiement.dto.PaiementRequest;
import com.sunurecolte.paiement.dto.PaiementResponse;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
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
 * exécution. Les commandes sont étalées sur les {@value #JOURS_ETALES} derniers jours, puis une
 * passe finale ({@link #etalerDansLePasse}) recule de la même façon les comptes, les récoltes et les
 * paiements, avec sa propre graine ({@link #GRAINE_ETALAGE}) pour ne déplacer aucun tirage du
 * catalogue. Les dates passent toutes par un {@link JdbcTemplate} : {@link CommandeService} et les
 * autres services écrivent les lignes, le générateur ne fait que les reculer ensuite, et les
 * colonnes de date des entités restent figées après insertion comme en usage normal.
 *
 * <p>Deux limites assumées de l'étalement :
 * <ul>
 *   <li>{@code notifications.date_creation} garde l'horodatage de génération. La table ne porte aucune
 *       référence à la commande qu'elle annonce, seulement un destinataire, et deviner de quelle commande
 *       il s'agit serait une invention ; les notifications de la démonstration restent donc datées du
 *       jour de lancement ;</li>
 *   <li>aucun des neuf comptes ne tombe dans la fenêtre des {@value #JOURS_FENETRE_STATISTIQUES} derniers
 *       jours (mesuré : zéro sur neuf). Le graphique « inscriptions par semaine » de l'administration
 *       rend donc des semaines à zéro sur le jeu de démonstration : les comptes sont assez anciens pour
 *       précéder leurs propres commandes, pas assez récents pour tomber dans une période de trente jours.
 *       Les historiques de ventes, eux, sont bien nourris (mesuré : vingt-neuf commandes sur soixante en
 *       fenêtre).</li>
 * </ul>
 * <p>Consigné dans TASKS.md et README.md, LOT DEMO-2.
 *
 * Deux mécanismes rendent le jeu lisible à l'écran sans toucher aux règles métier :
 * <ul>
 *   <li>les ventes libres se lisent sur le <b>stock initial</b> et sont bornées à 45 % de celui-ci
 *       ({@link #PART_MAXIMALE_VENDUE}), donc une récolte garde toujours assez pour rester en vente
 *       au-dessus du seuil d'alerte des statistiques ;</li>
 *   <li>les huit {@code ANNULEE} sont <b>planifiées</b> ({@link #ANNULATIONS_PILOTEES}) : chacune porte
 *       une seule ligne chez un producteur désigné, et quatre d'entre elles sont datées dans la fenêtre
 *       des {@value #JOURS_FENETRE_STATISTIQUES} derniers jours. Chaque producteur a donc une annulation
 *       visible sur l'écran statistiques, et le taux affiché reste dans une fourchette qu'on peut écrire
 *       dans un mémoire.</li>
 * </ul>
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
     * Graine de la passe d'étalement, séparée de {@link #GRAINE} : les comptes, les récoltes et les
     * paiements tirent leurs dates dans leur propre suite aléatoire, donc la séquence du catalogue et
     * des commandes n'est décalée d'aucun cran. Les valeurs lues par l'écran statistiques avant cette
     * passe restent les mêmes après.
     */
    private static final long GRAINE_ETALAGE = 20261009L;

    /**
     * Bandes de tirage des comptes, en jours avant l'instant du lancement. Le tirage garde les
     * producteurs nettement plus anciens que les acheteurs ; la règle de cohérence
     * ({@link #MARGE_JOURS_COMPTE}) prime pourtant sur la bande : un compte ne peut pas être postérieur à la
     * commande qu'il rend possible. Avec la graine actuelle, cette primauté invertit l'ordre voulu :
     * cinq des six acheteurs, dont la première commande remonte à au moins cinquante-deux jours, sont
     * plus anciens que le second producteur, dont la première vente date de quarante-six jours, et le
     * compte le plus ancien du jeu est un acheteur, placé soixante-deux jours avant le lancement — trois
     * jours avant sa première commande. C'est consigné dans TASKS.md et dans le README plutôt que masqué
     * par une date incohérente.
     */
    private static final int RECUL_MIN_PRODUCTEUR = 40;
    private static final int RECUL_MAX_PRODUCTEUR = 59;
    private static final int RECUL_MIN_ACHETEUR = 10;
    private static final int RECUL_MAX_ACHETEUR = 39;

    /** Jours entre l'inscription d'un compte et la plus ancienne commande qu'il passe : il existe avant de vendre ou d'acheter. */
    private static final int MARGE_JOURS_COMPTE = 3;

    /** Jours entre la publication d'une récolte et sa première vente, et entre le compte du producteur et sa récolte. */
    private static final int MARGE_JOURS_RECOLTE = 1;

    /** Le paiement suit sa commande de une heure, sa confirmation de douze minutes : le même jour, dans cet ordre. */
    private static final int HEURES_APRES_COMMANDE = 1;
    private static final int MINUTES_APRES_PAIEMENT = 12;

    /**
     * Période par défaut de l'écran statistiques (LOT STAT-1) : les annulations planifiées y sont
     * jouées ou exclues, jamais laissées au tirage, sinon le taux d'annulation d'un producteur ne
     * se contrôle plus.
     */
    private static final int JOURS_FENETRE_STATISTIQUES = 30;

    /**
     * Même plancher que l'inscription publique ({@code InscriptionRequest}) : le mot de passe de
     * démonstration sert aussi à se connecter, un mot de passe refusé à l'inscription serait
     * inutilisable.
     */
    private static final int LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

    /** Deux moyens, les seuls que connaisse le domaine : {@code MoyenPaiement} n'en admet aucun autre. */
    private static final MoyenPaiement[] MOYENS_DE_PAIEMENT = {
            MoyenPaiement.WAVE, MoyenPaiement.ORANGE_MONEY};

    /**
     * Parts du stock <b>initial</b> qu'un acheteur de démonstration peut prendre d'un coup. Le tirage se
     * lit sur le stock de départ et non sur le reste : une récolte bien garnie reste garnie après
     * plusieurs ventes, au lieu de fondre de 55 % puis de 40 % de ce qu'il en restait. Les parts sont
     * petites parce qu'une même récolte est tirée plusieurs fois sur la période : le total vendu doit
     * rester sous le quota, non le consommer.
     */
    private static final BigDecimal[] FRACTIONS_DE_VENTE = {
            new BigDecimal("0.01"), new BigDecimal("0.02"), new BigDecimal("0.03"), new BigDecimal("0.05")};

    /** Un acheteur sur huit commande en gros : part plus franche, mais jamais la totalité de l'étal. */
    private static final BigDecimal FRACTION_GROS_ACHETEUR = new BigDecimal("0.20");
    private static final int UN_ACHETEUR_SUR_HUIT = 8;

    /** Part prise par la ligne d'une annulation planifiée : la plus petite du jeu, l'achat est minime. */
    private static final BigDecimal FRACTION_ANNULATION = FRACTIONS_DE_VENTE[0];

    /**
     * Part maximale du stock initial qu'une récolte libre peut céder sur toute la période. Le plancher
     * qui en découle (55 % du départ) garde chaque récolte largement au-dessus du seuil d'alerte de
     * stock faible (5, LOT STAT-1) : seules les trois ventes pilotées descendent jusqu'à leur cible.
     */
    private static final BigDecimal PART_MAXIMALE_VENDUE = new BigDecimal("0.45");

    /** Le jeu ne vend que des quantités entières ou de demi-unités : jamais 233,44 kg. */
    private static final BigDecimal PAS_DE_VENTE = new BigDecimal("0.5");

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

    /**
     * Les huit commandes annulées, dans l'ordre de {@link #repartitionDesStatuts()}, planifiées :
     * producteur de l'unique ligne et présence ou non dans la fenêtre de
     * {@value #JOURS_FENETRE_STATISTIQUES} jours lue par l'écran statistiques. Chaque producteur reçoit
     * donc au moins une annulation visible, et le taux d'annulation de {@code producteur1} — deux
     * annulations sur sa fenêtre — reste dans la fourchette qu'un mémoire accepte de montrer.
     */
    private static final List<AnnulationPilotee> ANNULATIONS_PILOTEES = List.of(
            new AnnulationPilotee(0, true),
            new AnnulationPilotee(1, true),
            new AnnulationPilotee(2, true),
            new AnnulationPilotee(0, true),
            new AnnulationPilotee(1, false),
            new AnnulationPilotee(2, false),
            new AnnulationPilotee(0, false),
            new AnnulationPilotee(1, false));

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

    /**
     * Trois listes, dans l'ordre de {@link #PRODUCTEURS} : 8 + 4 + 8 = 20 récoltes. Les stocks de
     * départ sont larges (de 12 têtes à 300 plateaux) pour que soixante commandes laissent l'essentiel
     * du catalogue en vente : {@link #PART_MAXIMALE_VENDUE} borne ce qu'une récolte libre peut céder,
     * et seules les trois récoltes pilotées descendent jusqu'au seuil d'alerte ou jusqu'à zéro.
     */
    private static final List<List<RecolteDemo>> RECOLTES_PAR_PRODUCTEUR = List.of(
            List.of(
                    new RecolteDemo("Tomate", "Tomates rondes cueillies le matin", "240.00", "10.00", "100.00", "kg", "800"),
                    new RecolteDemo("Oignon", "Oignons de Thiaré, filets de 25 kg", "300.00", "10.00", "150.00", "kg", "650"),
                    new RecolteDemo("Salade", "Salades vertes en bottes", "22.00", "2.00", "20.00", "botte", "300"),
                    new RecolteDemo("Piment fort", "Piments verts de saison", "12.00", "1.00", "10.00", "kg", "1200"),
                    new RecolteDemo("Aubergine", "Aubergines violettes", "150.00", "5.00", "60.00", "kg", "500"),
                    new RecolteDemo("Chou", "Choux cabus", "130.00", "5.00", "50.00", "kg", "400"),
                    new RecolteDemo("Carotte", "Carottes de pleine terre", "180.00", "10.00", "80.00", "kg", "900"),
                    new RecolteDemo("Concombre", "Concombres", "90.00", "3.00", "30.00", "botte", "350")),
            List.of(
                    new RecolteDemo("Poulet de chair", "Poulets locaux engraissés", "120.00", "1.00", "30.00", "tete", "3500"),
                    new RecolteDemo("Oeufs frais", "Plateaux de 30 oeufs", "300.00", "2.00", "100.00", "plateau", "1800"),
                    new RecolteDemo("Mouton", "Moutons de l'exploitation", "12.00", "1.00", "6.00", "tete", "120000"),
                    new RecolteDemo("Lait cru", "Lait de la bergerie, en bidon", "120.00", "5.00", "40.00", "litre", "700")),
            List.of(
                    new RecolteDemo("Mil", "Mil blanc décortiqué", "200.00", "10.00", "100.00", "kg", "500"),
                    new RecolteDemo("Arachide", "Arachides en coque séchées", "180.00", "10.00", "80.00", "kg", "900"),
                    new RecolteDemo("Maïs", "Maïs grain sec", "150.00", "10.00", "60.00", "kg", "450"),
                    new RecolteDemo("Mangue", "Mangues Kent de fin de saison", "70.00", "5.00", "50.00", "kg", "600"),
                    new RecolteDemo("Papaye", "Papayes forme soleil", "90.00", "3.00", "30.00", "kg", "350"),
                    new RecolteDemo("Banane plantain", "Bananes plantain", "80.00", "3.00", "25.00", "kg", "400"),
                    new RecolteDemo("Bissap", "Feuilles d'hibiscus séchées", "60.00", "2.00", "20.00", "kg", "1500"),
                    new RecolteDemo("Kinkeliba", "Feuilles de tisane séchées", "45.00", "2.00", "15.00", "kg", "800")));

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
    private final JdbcTemplate jdbcTemplate;
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
                               JdbcTemplate jdbcTemplate,
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
        this.jdbcTemplate = jdbcTemplate;
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
        CommandesCrees commandes = creerCommandes(random, catalogue, producteurs, acheteurs);
        etalerDansLePasse(commandes, producteurs, acheteurs, catalogue);

        log.info("Données de démonstration créées : {} producteurs, {} acheteurs, {} récoltes, "
                        + "{} commandes étalées sur {} jours, comptes et paiements reculés avec elles. "
                        + "Comptes : {} .",
                producteurs.size(), acheteurs.size(), catalogue.size(), commandes.nombre(), JOURS_ETALES,
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
                        new BigDecimal(demo.quantiteDisponible()),
                        STOCKS_FINAUX_PILOTES.get(demo.produit())));
            }
        }
        return catalogue;
    }

    // ------------------------------------------------------------------ commandes

    /**
     * Une commande par rang de {@link #repartitionDesStatuts()}. Le cycle est joué dans l'ordre réel :
     * création par l'acheteur, paiement simulé quand la règle l'exige, transitions par un producteur
     * concerné.
     *
     * <p>La date tirée n'est pas écrite ici : elle est collectée avec l'identifiant de la commande, son
     * acheteur et ses récoltes, et posée en une passe finale par {@link #etalerDansLePasse}. Écrire par
     * l'entité serait obligé de laisser la colonne {@code date_creation} modifiable pendant tout le
     * cycle — {@link CommandeService#changerStatut} recharge la commande sous verrou et la vidange de
     * fin de transaction imposerait de poser la date en dernier. Le SQL natif, lui, part après le
     * {@code flush()} des services : la colonne reste figée après insertion, comme en usage normal.
     *
     * <p>Les tirages gardent exactement le même ordre qu'avant la passe : la séquence aléatoire du
     * catalogue et des dates de commandes est inchangée, donc les montants déjà mesurés sur les écrans
     * statistiques le restent.
     */
    private CommandesCrees creerCommandes(Random random, List<RecoltePilotee> catalogue,
                                          List<CompteProducteur> producteurs, List<CompteAcheteur> acheteurs) {
        List<StatutCommande> statutsCibles = repartitionDesStatuts();
        int premierRangAnnulation = premierRangAnnulation(statutsCibles);
        Map<Long, LocalDateTime> datesParCommande = new LinkedHashMap<>();
        Map<Long, LocalDateTime> premiereCommandeParAcheteur = new LinkedHashMap<>();
        Map<Long, LocalDateTime> premiereVenteParRecolte = new LinkedHashMap<>();
        List<PaiementCommande> paiements = new ArrayList<>();
        int commandesCrees = 0;

        for (int index = 0; index < statutsCibles.size(); index++) {
            AnnulationPilotee annulation = index < premierRangAnnulation ? null
                    : ANNULATIONS_PILOTEES.get(index - premierRangAnnulation);
            List<Ligne> lignes = annulation == null
                    ? choisirLignes(random, catalogue, index, producteursAMelanger(producteurs, index))
                    : ligneAnnulee(random, catalogue, producteurs.get(annulation.indexProducteur()));
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

            jouerLeCycle(commande.id(), statutsCibles.get(index), index, mode, acheteur, premier, random,
                    paiements);
            LocalDateTime date = annulation == null ? dateEtalee(random) : dateAnnulation(random,
                    annulation.dansLaFenetre());
            datesParCommande.put(commande.id(), date);
            premiereCommandeParAcheteur.merge(acheteur.profilId(), date, DemoDataInitializer::plusAncienne);
            for (Ligne ligne : lignes) {
                premiereVenteParRecolte.merge(ligne.recolte().recolteId, date,
                        DemoDataInitializer::plusAncienne);
            }
        }
        return new CommandesCrees(commandesCrees, datesParCommande, premiereCommandeParAcheteur,
                premiereVenteParRecolte, paiements);
    }

    /**
     * Rang du premier {@code ANNULEE} de la répartition. Le plan d'annulations se lit à partir de ce
     * rang : s'il ne couvre pas exactement les annulations prévues, le générateur s'arrête plutôt que
     * de produire un jeu dont le taux d'annulation ne veut plus rien dire.
     */
    private int premierRangAnnulation(List<StatutCommande> statutsCibles) {
        int rang = statutsCibles.indexOf(StatutCommande.ANNULEE);
        if (rang < 0 || statutsCibles.size() - rang != ANNULATIONS_PILOTEES.size()) {
            throw new IllegalStateException("Le plan d'annulations attend " + ANNULATIONS_PILOTEES.size()
                    + " commandes ANNULEE en fin de répartition, la répartition réelle est différente.");
        }
        return rang;
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
                              CompteAcheteur acheteur, CompteProducteur pilote, Random random,
                              List<PaiementCommande> paiements) {
        boolean enMarche = cible != StatutCommande.EN_ATTENTE && cible != StatutCommande.ANNULEE;
        boolean paiementSoldeParAnnulation = cible == StatutCommande.ANNULEE && index % 2 == 0;
        boolean paiementExige = mode == ModeReception.LIVRAISON && enMarche;
        boolean paiementSurRetrait = mode == ModeReception.RETRAIT && enMarche && random.nextInt(2) == 0;

        if (paiementExige || paiementSoldeParAnnulation || paiementSurRetrait) {
            PaiementResponse paiement = paiementService.creer(new PaiementRequest(commandeId,
                    MOYENS_DE_PAIEMENT[random.nextInt(MOYENS_DE_PAIEMENT.length)]), acheteur.principal());
            paiements.add(new PaiementCommande(paiement.id(), commandeId));
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
     * toujours dans le passé.
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
     * Date d'une annulation planifiée : à l'intérieur de la fenêtre des {@value
     * #JOURS_FENETRE_STATISTIQUES} derniers jours, ou franchement dehors. Un taux d'annulation affiché
     * sur trente jours ne se contrôle que par les commandes qui tombent dans ces trente jours.
     */
    private LocalDateTime dateAnnulation(Random random, boolean dansLaFenetre) {
        int joursAvant = dansLaFenetre
                ? 1 + random.nextInt(JOURS_FENETRE_STATISTIQUES - 3)
                : JOURS_FENETRE_STATISTIQUES
                        + random.nextInt(JOURS_ETALES - JOURS_FENETRE_STATISTIQUES - 1);
        return LocalDateTime.now()
                .minusDays(joursAvant)
                .minusHours(random.nextInt(10))
                .withMinute(random.nextInt(60))
                .withSecond(0)
                .withNano(0);
    }

    /**
     * Passe finale d'étalement : recule les dates que la génération a posées à l'instant du lancement,
     * pour que les graphiques d'évolution des deux écrans statistiques aient un historique. Quatre
     * {@code UPDATE} ciblés, tous bornés aux lignes de démonstration, alors que la commande a déjà sa
     * date définitive :
     * <ol>
     *   <li>les commandes, avec les dates tirées pendant le cycle ;</li>
     *   <li>les neuf comptes (producteurs puis acheteurs, dans les bandes {@link #RECUL_MIN_PRODUCTEUR}
     *       à {@link #RECUL_MAX_ACHETEUR}) ;</li>
     *   <li>les récoltes, et leur {@code date_disponibilite} au même jour — cette colonne se lit
     *       « Disponible à partir du » sur le catalogue, le détail, « Mes récoltes » et l'écran
     *       d'administration ; elle ne participe à aucun filtre, aucun tri ni aucune validation ;</li>
     *   <li>les paiements, une heure après leur commande, confirmés douze minutes plus tard.</li>
     * </ol>
     *
     * <p>Règle de cohérence, la seule que la demande laisse choisir : une date ne peut pas être
     * postérieure à ce qu'elle rend possible. Un compte est antérieur d'au moins
     * {@link #MARGE_JOURS_COMPTE} jours à sa plus ancienne commande, une récolte à sa première vente et
     * postérieure à l'inscription de son producteur ; un paiement jamais antérieur à sa commande. Le recul
     * d'un compte est donc le plus ancien entre sa bande tirée et cette contrainte, ce qui peut le mener
     * trois jours au-delà de la fenêtre des commandes — un compte plus vieux que la fenêtre est réaliste,
     * l'inverse ne l'est pas.
     *
     * <p>Le {@code flush()} ouvre la passe : les services travaillent dans la même transaction et leurs
     * écritures (statut de commande, stock rendu, {@code date_confirmation} du paiement) partent au
     * vidage de fin de course. Sans lui, une de ces UPDATE réécrirait par-dessus la date native. Avec le
     * {@code flush()}, plus aucune entité n'est modifiée après la passe et le vidage ne rouvre pas ces
     * colonnes : {@code date_creation} est {@code updatable = false} partout.
     *
     * <p>Les notifications ne sont pas touchées : {@code notifications} ne rattache un message qu'à son
     * destinataire, jamais à la commande qu'il annonce, et deviner cette commande serait une invention.
     */
    private void etalerDansLePasse(CommandesCrees commandes, List<CompteProducteur> producteurs,
                                   List<CompteAcheteur> acheteurs, List<RecoltePilotee> catalogue) {
        commandeRepository.flush();

        Random random = new Random(GRAINE_ETALAGE);
        LocalDateTime maintenant = LocalDateTime.now();

        Map<Long, LocalDateTime> plusAncienneParProducteur = new LinkedHashMap<>();
        for (RecoltePilotee recolte : catalogue) {
            LocalDateTime vente = commandes.premiereVenteParRecolte().get(recolte.recolteId);
            if (vente != null) {
                plusAncienneParProducteur.merge(recolte.producteurId, vente, DemoDataInitializer::plusAncienne);
            }
        }

        Map<Long, Integer> reculParProducteur = new LinkedHashMap<>();
        List<Object[]> lignesComptes = new ArrayList<>();
        for (int index = 0; index < producteurs.size(); index++) {
            Long profilId = producteurs.get(index).profilId();
            int recul = reculDeCompte(random, maintenant, RECUL_MIN_PRODUCTEUR, RECUL_MAX_PRODUCTEUR,
                    plusAncienneParProducteur.get(profilId));
            reculParProducteur.put(profilId, recul);
            lignesComptes.add(new Object[]{dateReculee(random, maintenant, recul), PRODUCTEURS.get(index).email()});
        }
        for (int index = 0; index < acheteurs.size(); index++) {
            LocalDateTime plusAncienne = commandes.premiereCommandeParAcheteur()
                    .get(acheteurs.get(index).profilId());
            int recul = reculDeCompte(random, maintenant, RECUL_MIN_ACHETEUR, RECUL_MAX_ACHETEUR, plusAncienne);
            lignesComptes.add(new Object[]{dateReculee(random, maintenant, recul), ACHETEURS.get(index).email()});
        }

        List<Object[]> lignesRecoltes = new ArrayList<>();
        for (RecoltePilotee recolte : catalogue) {
            LocalDateTime premiereVente = commandes.premiereVenteParRecolte().get(recolte.recolteId);
            int plancher = premiereVente == null ? MARGE_JOURS_RECOLTE
                    : (int) Math.max(MARGE_JOURS_RECOLTE,
                            reculEnJours(maintenant, premiereVente) + MARGE_JOURS_RECOLTE);
            int plafond = Math.max(plancher, reculParProducteur.get(recolte.producteurId) - MARGE_JOURS_RECOLTE);
            LocalDateTime date = dateReculee(random, maintenant, plancher + random.nextInt(plafond - plancher + 1));
            lignesRecoltes.add(new Object[]{date, date.toLocalDate(), recolte.recolteId});
        }

        List<Object[]> lignesPaiements = new ArrayList<>();
        for (PaiementCommande paiement : commandes.paiements()) {
            LocalDateTime dateCommande = commandes.datesParCommande().get(paiement.commandeId());
            LocalDateTime datePaiement = dansLePasse(maintenant, dateCommande.plusHours(HEURES_APRES_COMMANDE),
                    dateCommande);
            LocalDateTime dateConfirmation = dansLePasse(maintenant,
                    datePaiement.plusMinutes(MINUTES_APRES_PAIEMENT), datePaiement);
            lignesPaiements.add(new Object[]{datePaiement, dateConfirmation, paiement.paiementId()});
        }

        jdbcTemplate.batchUpdate("update commandes set date_creation = ? where id = ?",
                commandes.datesParCommande().entrySet().stream()
                        .map(entree -> new Object[]{entree.getValue(), entree.getKey()}).toList());
        jdbcTemplate.batchUpdate("update utilisateurs set date_creation = ? where email = ?", lignesComptes);
        jdbcTemplate.batchUpdate("update recoltes set date_creation = ?, date_disponibilite = ? where id = ?",
                lignesRecoltes);
        jdbcTemplate.batchUpdate("update paiements set date_creation = ?, date_confirmation = ? where id = ?",
                lignesPaiements);
    }

    /**
     * Recul d'un compte, en jours avant l'instant du lancement : tiré dans sa bande, mais jamais moins
     * que {@link #MARGE_JOURS_COMPTE} jours avant sa plus ancienne commande. Le compte est le plus
     * ancien des deux — une inscription ne peut pas suivre la vente qu'elle a rendue possible.
     */
    private int reculDeCompte(Random random, LocalDateTime maintenant, int minimum, int maximum,
                              LocalDateTime plusAncienneCommande) {
        int tire = minimum + random.nextInt(maximum - minimum + 1);
        if (plusAncienneCommande == null) {
            return tire;
        }
        return Math.max(tire, reculEnJours(maintenant, plusAncienneCommande) + MARGE_JOURS_COMPTE);
    }

    /** Jours civils écoulés entre une date et l'instant du lancement. */
    private int reculEnJours(LocalDateTime maintenant, LocalDateTime date) {
        return (int) ChronoUnit.DAYS.between(date.toLocalDate(), maintenant.toLocalDate());
    }

    /** Date reculée de {@code jours} : même allure que {@link #dateEtalee}, dans la graine d'étalement. */
    private LocalDateTime dateReculee(Random random, LocalDateTime maintenant, int jours) {
        return maintenant.minusDays(jours)
                .minusHours(random.nextInt(10))
                .withMinute(random.nextInt(60))
                .withSecond(0)
                .withNano(0);
    }

    /**
     * Ramène une date de paiement dans le passé sans jamais la mettre avant la commande qu'elle règle :
     * les deux bornes ne se discutent pas, l'ordre commande → paiement → confirmation est ce que lit
     * l'acheteur sur son écran.
     */
    private LocalDateTime dansLePasse(LocalDateTime maintenant, LocalDateTime valeur, LocalDateTime plancher) {
        if (valeur.isBefore(maintenant)) {
            return valeur;
        }
        LocalDateTime borne = maintenant.minusMinutes(1);
        return borne.isBefore(plancher) ? plancher : borne;
    }

    /** Le plus ancien des deux horodatages, pour les {@link Map#merge} de la collecte. */
    private static LocalDateTime plusAncienne(LocalDateTime une, LocalDateTime autre) {
        return une.isBefore(autre) ? une : autre;
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
                    .flatMap(recolte -> tirerQuantite(recolte, random))
                    .ifPresent(lignes::add);
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
                tirerQuantite(recolte, random).ifPresent(lignes::add);
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
     * Ligne d'une annulation planifiée : une seule récolte, chez le producteur désigné, pour la plus
     * petite part du jeu. Le quota ne s'y applique pas : {@link CommandeService} rend le stock à
     * l'annulation, la récolte revient donc en rayon et cette vente ne peut pas creuser d'alerte.
     */
    private List<Ligne> ligneAnnulee(Random random, List<RecoltePilotee> catalogue,
                                     CompteProducteur compte) {
        List<RecoltePilotee> candidates = catalogue.stream()
                .filter(recolte -> recolte.stockFinalVise == null)
                .filter(recolte -> recolte.producteurId.equals(compte.profilId()))
                .filter(recolte -> recolte.stockRestant.compareTo(PAS_DE_VENTE) >= 0)
                .collect(Collectors.toCollection(ArrayList::new));
        return auHasard(candidates, random)
                .map(recolte -> List.of(vendre(recolte, quantiteAnnulee(recolte))))
                .orElseThrow(() -> new IllegalStateException("Plus aucune récolte en stock chez le "
                        + "producteur " + compte.profilId() + " : le plan d'annulations n'est plus "
                        + "jouable."));
    }

    /** La part d'annulation, bornée au stock restant et remise sur le pas de 0,5. */
    private BigDecimal quantiteAnnulee(RecoltePilotee recolte) {
        BigDecimal quantite = arrondirAuPas(
                recolte.stockInitial.multiply(FRACTION_ANNULATION).min(recolte.stockRestant));
        return quantite.signum() > 0 ? quantite : PAS_DE_VENTE;
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

    /**
     * Prélèvement libre : une part du stock <b>initial</b> (une part plus franche un acheteur sur huit),
     * bornée au quota encore vendable de la récolte. Le tirage qui prenait la totalité du reste est
     * supprimé : c'est lui qui mettait la moitié du catalogue hors stock. Une récolte dont le quota ne
     * permet plus une demi-unité a déjà été écartée des candidates par {@link #recoltesEnStock}.
     */
    private Optional<Ligne> tirerQuantite(RecoltePilotee recolte, Random random) {
        BigDecimal fraction = random.nextInt(UN_ACHETEUR_SUR_HUIT) == 0
                ? FRACTION_GROS_ACHETEUR
                : FRACTIONS_DE_VENTE[random.nextInt(FRACTIONS_DE_VENTE.length)];
        BigDecimal partSouhaitee = recolte.stockInitial.multiply(fraction);
        BigDecimal quantite = arrondirAuPas(partSouhaitee.min(recolte.quotaRestant));
        return quantite.signum() > 0 ? Optional.of(vendre(recolte, quantite)) : Optional.empty();
    }

    /**
     * Arrondi au demi-unité inférieur. Une vente de 233,44 kg ne s'écrit nulle part : un acheteur prend
     * des kilos, des sacs ou une moitié, et le prix étant entier le sous-total garde au plus une
     * décimale.
     */
    private BigDecimal arrondirAuPas(BigDecimal quantite) {
        return quantite.divide(PAS_DE_VENTE, 0, RoundingMode.DOWN).multiply(PAS_DE_VENTE);
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
        recolte.quotaRestant = recolte.quotaRestant.subtract(quantite);
        return new Ligne(new LigneCommandeRequest(recolte.recolteId, quantite), recolte);
    }

    /**
     * Récoltes libres, hors celles dont la vente est pilotée, encore en stock et pas parvenues à leur
     * quota de {@link #PART_MAXIMALE_VENDUE} ; filtrées par producteur si demandé.
     */
    private List<RecoltePilotee> recoltesEnStock(List<RecoltePilotee> catalogue, Long producteurId) {
        return catalogue.stream()
                .filter(recolte -> recolte.stockFinalVise == null)
                .filter(recolte -> producteurId == null || recolte.producteurId.equals(producteurId))
                .filter(recolte -> recolte.stockRestant.signum() > 0)
                .filter(recolte -> recolte.quotaRestant.compareTo(PAS_DE_VENTE) >= 0)
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

    /**
     * Annulation planifiée : index dans {@link #PRODUCTEURS} pour l'unique ligne de la commande, et
     * présence dans la fenêtre des {@value #JOURS_FENETRE_STATISTIQUES} derniers jours lus par l'écran
     * statistiques.
     */
    private record AnnulationPilotee(int indexProducteur, boolean dansLaFenetre) {}

    private record CompteProducteur(UtilisateurPrincipal principal, Long profilId, String localisation) {}

    private record CompteAcheteur(UtilisateurPrincipal principal, Long profilId,
                                  String telephone, String quartier) {}

    /** Ligne tirée pour une commande : la requête telle que le service la reçoit, et sa récolte. */
    private record Ligne(LigneCommandeRequest request, RecoltePilotee recolte) {}

    /** Un paiement simulé et la commande dont il doit hériter la date, un peu après elle. */
    private record PaiementCommande(Long paiementId, Long commandeId) {}

    /**
     * Ce que le cycle de commandes laisse à la passe d'étalement : les dates tirées par commande, la plus
     * ancienne commande de chaque acheteur, la première vente de chaque récolte et les paiements avec
     * leur commande. La cohérence des dates reculées se lit dans ces trois dernières cartes — un compte,
     * une récolte ou un paiement ne peut pas dater après ce qu'il autorise — jamais dans un tirage
     * indépendant.
     */
    private record CommandesCrees(int nombre,
                                  Map<Long, LocalDateTime> datesParCommande,
                                  Map<Long, LocalDateTime> premiereCommandeParAcheteur,
                                  Map<Long, LocalDateTime> premiereVenteParRecolte,
                                  List<PaiementCommande> paiements) {}

    /**
     * Récolte telle que le générateur la suit. {@code stockRestant} et {@code quotaRestant} ne servent
     * qu'à ne jamais demander au service plus que ce qu'il reste, ni plus que la part de départ qu'une
     * récolte libre a le droit de céder : l'autorité du stock reste la colonne de la base, décrémentée
     * par {@link CommandeService}.
     */
    private static final class RecoltePilotee {
        private final Long recolteId;
        private final Long producteurId;
        private final String produit;
        private final BigDecimal stockFinalVise;
        private final BigDecimal stockInitial;
        private BigDecimal quotaRestant;
        private BigDecimal stockRestant;

        private RecoltePilotee(Long recolteId, Long producteurId, String produit, BigDecimal stockInitial,
                               BigDecimal stockFinalVise) {
            this.recolteId = recolteId;
            this.producteurId = producteurId;
            this.produit = produit;
            this.stockInitial = stockInitial;
            this.stockRestant = stockInitial;
            this.quotaRestant = stockInitial.multiply(PART_MAXIMALE_VENDUE);
            this.stockFinalVise = stockFinalVise;
        }
    }
}
