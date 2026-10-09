package com.sunurecolte.config;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.paiement.service.PaiementService;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.service.RecolteService;
import com.sunurecolte.statistiques.dto.StatistiquesAdminResponse;
import com.sunurecolte.statistiques.dto.StatistiquesProducteurResponse;
import com.sunurecolte.statistiques.service.StatistiquesAdminService;
import com.sunurecolte.statistiques.service.StatistiquesProducteurService;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.service.AuthService;
import com.sunurecolte.user.service.ProducteurService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

/**
 * Tests du jeu de données de démonstration (LOT DEMO-1).
 *
 * Aucun test ne porte {@code @ActiveProfiles("demo")} : le composant est instancié directement,
 * comme pour AdminInitializerTest. Un runner activé par un profil tournerait HORS de la transaction
 * de test, et ses écritures seraient committées dans la base locale réelle. Instancié ici, il
 * s'exécute dans la transaction du test et tout est annulé.
 *
 * Les compteurs sont pris sur les adresses en {@code .demo@sunurecolte.sn} et non sur la table
 * entière : la base locale de développement porte déjà des comptes et des commandes de QA.
 *
 * Les effectifs attendus (3 producteurs, 6 acheteurs, 20 récoltes, 60 commandes, 4 paiements
 * remboursés) viennent de la construction du composant, pas d'un tirage au sort : la graine est
 * fixe et la répartition des statuts est écrite. De même écriture, le plan des huit annulations
 * (producteur désigné et date dans ou hors de la fenêtre des statistiques) et le quota de 45 % du
 * stock initial, qui laissent le catalogue en vente et chaque producteur visible sur l'écran
 * statistiques : les trois tests ajoutés le vérifient sur les données réellement produites.
 *
 * LOT DEMO-2 — la passe d'étalement. Les six tests qui suivent vérifient les dates reculées (comptes,
 * récoltes, paiements), l'ordre de grandeur demandé (plus de quatre semaines d'amplitude, aucun compte
 * après la commande qu'il rend possible), l'idempotence étendue aux dates, et le fait que la passe
 * native est annulée avec la transaction du {@code run()}. Ils se lisent en SQL : la passe écrit après
 * le dernier {@code flush()} des services, l'objet géré par JPA garde donc l'horodatage d'insertion
 * tandis que la colonne porte la date reculée.
 *
 * Le dernier test est celui de non-régression des deux écrans de statistiques. Les valeurs attendues
 * sont des relevés réels, pas des calculs : les absolus de l'écran administration dépendent de la base
 * locale, qui porte la QA, ce sont donc des deltas imputables au seul jeu de démonstration ; l'écran
 * producteur, filtré sur l'identifiant du producteur, reste affirmé en valeurs exactes.
 */
class DemoDataInitializerTest extends IntegrationTestSupport {

    private static final String MOT_DE_PASSE = "MotDePasse-Demo-2026";
    private static final String SUFFIXE_DEMO = "%.demo@sunurecolte.sn";
    private static final String EMAIL_PREMIER_PRODUCTEUR = "producteur1.demo@sunurecolte.sn";
    private static final String EMAIL_DEUXIEME_PRODUCTEUR = "producteur2.demo@sunurecolte.sn";
    private static final String EMAIL_TROISIEME_PRODUCTEUR = "producteur3.demo@sunurecolte.sn";

    /** Seuil d'alerte de stock faible de LOT STAT-1 : deux récoltes de démonstration doivent finir dessous. */
    private static final BigDecimal SEUIL_STOCK_FAIBLE = new BigDecimal("5");

    /** Le pas de vente du générateur : une quantité entière ou une demi-unité, jamais un centième tiré au sort. */
    private static final BigDecimal PAS_DE_VENTE = new BigDecimal("0.5");

    @Autowired
    private AuthService authService;

    @Autowired
    private ProducteurService producteurService;

    @Autowired
    private RecolteService recolteService;

    @Autowired
    private CommandeService commandeService;

    @Autowired
    private PaiementService paiementService;

    @Autowired
    private StatistiquesProducteurService statistiquesProducteurService;

    @Autowired
    private StatistiquesAdminService statistiquesAdminService;

    /**
     * Le gestionnaire de transaction réel du contexte, et non l'interface : {@code getDataSource()} est
     * ce qui permet de vérifier que le JdbcTemplate de la passe est branché sur la même DataSource.
     */
    @Autowired
    private JpaTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Test
    void leJeuDeDemonstrationCreeComptesCatalogueEtCommandes() {
        generateur(MOT_DE_PASSE, "demo").run();

        assertThat(nombre("select count(u) from Utilisateur u where u.email like :suffixe"))
                .isEqualTo(9);
        assertThat(nombre("select count(p) from Producteur p where p.utilisateur.email like :suffixe"))
                .isEqualTo(3);
        assertThat(nombre("select count(a) from Acheteur a where a.utilisateur.email like :suffixe"))
                .isEqualTo(6);
        assertThat(nombre("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe"))
                .isEqualTo(20);
        assertThat(nombre("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe"))
                .isEqualTo(60);
        // Notification est la trace réelle du passage par les services : création, transitions et
        // paiements notification, jamais une écriture directe en base.
        assertThat(nombre("select count(n) from Notification n where n.utilisateur.email like :suffixe"))
                .isPositive();
    }

    @Test
    void chaqueStatutDeCommandeEstRepresentantDansLesQuantitesPrevues() {
        generateur(MOT_DE_PASSE, "demo").run();

        List<StatutCommande> statutsRencontres = entityManager
                .createQuery("select distinct c.statut from Commande c "
                        + "where c.acheteur.utilisateur.email like :suffixe", StatutCommande.class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .getResultList();
        assertThat(statutsRencontres).contains(StatutCommande.values());

        assertThat(commandesAuStatut(StatutCommande.EN_ATTENTE)).isEqualTo(10);
        assertThat(commandesAuStatut(StatutCommande.CONFIRMEE)).isEqualTo(12);
        assertThat(commandesAuStatut(StatutCommande.PRETE)).isEqualTo(8);
        assertThat(commandesAuStatut(StatutCommande.LIVREE)).isEqualTo(22);
        assertThat(commandesAuStatut(StatutCommande.ANNULEE)).isEqualTo(8);
    }

    @Test
    void lesCommandesMelangeesEtLesEtatsAttendusParLesEcransSontPresentes() {
        generateur(MOT_DE_PASSE, "demo").run();

        List<Long> commandesMelangees = entityManager
                .createQuery("select c.id from Commande c join c.lignes l "
                        + "where c.acheteur.utilisateur.email like :suffixe "
                        + "group by c.id having count(distinct l.recolte.producteur.id) > 1", Long.class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .getResultList();
        assertThat(commandesMelangees).hasSizeGreaterThanOrEqualTo(3);

        assertThat(stockMinimalDesRecoltesDemo()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        // Effectifs resserrés par l'ajustement du jeu : les ventes libres ne descendent plus sous leur
        // quota, donc une seule récolte finit épuisée (Piment fort) et deux sous le seuil (Salade, Mangue).
        assertThat(recoltesAuStatut(StatutRecolte.EPUISEE)).isEqualTo(1);
        assertThat(recoltesDisponiblesSousLeSeuil()).isEqualTo(2);
    }

    @Test
    void lesPaiementsSimulesNeCouvrentQueLesStatutsQueLesServicesSaventEcrire() {
        generateur(MOT_DE_PASSE, "demo").run();

        long reussis = paiementsAuStatut(StatutPaiement.REUSSI);
        assertThat(reussis).isPositive();
        // Une annulation sur deux était payée : l'annulation de la commande solde le paiement en
        // REMBOURSE, jamais ce composant.
        assertThat(paiementsAuStatut(StatutPaiement.REMBOURSE)).isEqualTo(4);
        assertThat(paiementsAuStatut(StatutPaiement.EN_ATTENTE)).isZero();
        assertThat(paiementsAuStatut(StatutPaiement.ECHOUE)).isZero();
        assertThat(paiementsAuStatut(StatutPaiement.ANNULE)).isZero();
        assertThat(nombre("select count(p) from Paiement p "
                + "where p.commande.acheteur.utilisateur.email like :suffixe"))
                .isEqualTo(reussis + 4);

        List<MoyenPaiement> moyens = entityManager
                .createQuery("select distinct p.moyenPaiement from Paiement p "
                        + "where p.commande.acheteur.utilisateur.email like :suffixe", MoyenPaiement.class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .getResultList();
        assertThat(moyens).contains(MoyenPaiement.WAVE, MoyenPaiement.ORANGE_MONEY);
    }

    @Test
    void lesCommandesSontEtaieesSurLesSoixanteDerniersJoursSansJamaisDevancerLinstant() {
        generateur(MOT_DE_PASSE, "demo").run();
        // L'horodatage de référence est pris APRÈS la génération : les dates tirées partent du
        // « maintenant » du composant, qui est postérieur à l'entrée du test.
        LocalDateTime instant = LocalDateTime.now();

        assertThat(commandesApres(instant)).isZero();
        assertThat(commandesAvant(instant.minusDays(60))).isZero();
        assertThat(commandesAvant(instant.minusDays(30))).isPositive();
        assertThat(commandesApres(instant.minusDays(7))).isPositive();
    }

    @Test
    void lesQuantitesVenduesSontEntieresOuDeDemiUnites() {
        generateur(MOT_DE_PASSE, "demo").run();

        List<BigDecimal> quantites = entityManager
                .createQuery("select l.quantite from LigneCommande l "
                        + "where l.commande.acheteur.utilisateur.email like :suffixe", BigDecimal.class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .getResultList();
        assertThat(quantites).isNotEmpty();
        // Un acheteur de démonstration prend des kilos, des sacs ou une moitié : une ligne à 233,44 kg
        // ne s'écrit nulle part, et une quantité fractionnaire rendrait les totaux illisibles à l'écran.
        assertThat(quantites)
                .allMatch(quantite -> quantite.remainder(PAS_DE_VENTE).signum() == 0);
    }

    @Test
    void lesRecoltesLibresGardentUnStockEtDeuxAlertesAuPlusParProducteur() {
        generateur(MOT_DE_PASSE, "demo").run();

        // Les trois récoltes à cible (Piment fort, Salade, Mangue) sont les seules à descendre : le quota
        // de vente libre laisse toutes les autres largement au-dessus du seuil de 5.
        assertThat(recoltesEnAlerteParProducteur())
                .containsEntry(EMAIL_PREMIER_PRODUCTEUR, 2L)
                .containsEntry(EMAIL_TROISIEME_PRODUCTEUR, 1L)
                .doesNotContainKey(EMAIL_DEUXIEME_PRODUCTEUR);
        assertThat(recoltesEnAlerteParProducteur().values())
                .allMatch(nb -> nb.compareTo(2L) <= 0);
    }

    @Test
    void chaqueProducteurAGardeUneCommandeAnnuleeDansLaFenetreDesStatistiques() {
        generateur(MOT_DE_PASSE, "demo").run();

        for (String email : List.of(EMAIL_PREMIER_PRODUCTEUR, EMAIL_DEUXIEME_PRODUCTEUR,
                EMAIL_TROISIEME_PRODUCTEUR)) {
            assertThat(commandesAnnuleesDansLaFenetre(email))
                    .as("annulations visibles sur trente derniers jours pour %s", email)
                    .isGreaterThanOrEqualTo(1L);
        }
    }

    @Test
    void leTauxAnnulationDuPremierProducteurResteDansLaFourchetteVueACran() {
        generateur(MOT_DE_PASSE, "demo").run();

        long annulees = commandesAnnuleesDansLaFenetre(EMAIL_PREMIER_PRODUCTEUR);
        long toutes = commandesToucheesDansLaFenetre(EMAIL_PREMIER_PRODUCTEUR);
        // La formule de StatistiquesProducteurService : annulées ÷ toutes les commandes de la période,
        // deux décimales. Le test refuse un taux hors de la fourchette plutôt que de le constater.
        BigDecimal taux = BigDecimal.valueOf(annulees)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(toutes), 2, RoundingMode.HALF_UP);

        assertThat(taux).isBetween(new BigDecimal("8.00"), new BigDecimal("15.00"));
    }

    @Test
    void uneDeuxiemeExecutionNeCreeAucunDoublonEtNeRienSupprime() {
        DemoDataInitializer generateur = generateur(MOT_DE_PASSE, "demo");
        generateur.run();

        long utilisateurs = nombre("select count(u) from Utilisateur u where u.email like :suffixe");
        long recoltes = nombre("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe");
        long commandes = nombre("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe");

        generateur.run();

        assertThat(nombre("select count(u) from Utilisateur u where u.email like :suffixe"))
                .isEqualTo(utilisateurs);
        assertThat(nombre("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe"))
                .isEqualTo(recoltes);
        assertThat(nombre("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe"))
                .isEqualTo(commandes);
    }

    @Test
    void demoEtProdActifsEnsembleRefusentLeDemarrage() {
        assertThatIllegalStateException()
                .isThrownBy(() -> generateur(MOT_DE_PASSE, "demo", "prod").run())
                .withMessageContaining("prod")
                .withMessageContaining("production");
    }

    @Test
    void sansMotDePasseOuTropCourtLeDemarrageEstRefuseEtRienNEstCree() {
        assertThatIllegalStateException()
                .isThrownBy(() -> generateur("", "demo").run())
                .withMessageContaining("APP_DEMO_MOT_DE_PASSE");
        assertThatIllegalStateException()
                .isThrownBy(() -> generateur("court", "demo").run())
                .withMessageContaining("8");

        assertThat(utilisateurRepository.findByEmail(EMAIL_PREMIER_PRODUCTEUR)).isEmpty();
        assertThat(nombre("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe"))
                .isZero();
    }

    @Test
    void uneCommandeCreeeParLeServiceGardeLHorodatageDuServeurEtLaColonneEstFigee() {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);
        Acheteur acheteur = creerAcheteur();
        Recolte recolte = creerRecolte(producteur, "Tomate de test", "50.00", "800");

        LocalDateTime avant = LocalDateTime.now().withNano(0);
        var commande = commandeService.creer(new CommandeRequest(acheteur.getId(), ModeReception.RETRAIT,
                null, null, null, List.of(new LigneCommandeRequest(recolte.getId(), new BigDecimal("5.00")))),
                principalDe(acheteur.getUtilisateur()));

        // Le @PrePersist garde son effet : le service ne pose aucune date, la commande naît à l'instant.
        assertThat(commande.dateCreation()).isBetween(avant, LocalDateTime.now());

        // La colonne est figée après insertion, comme pour les quatre autres entités datées : passer par
        // l'entité ne permet plus de retourner dans le passé, même par erreur. Le setter Lombok existe
        // toujours (il est hérité de @Setter au niveau classe) : c'est bien le mappage qui est inerte.
        LocalDateTime datePasseee = avant.minusDays(12);
        Commande entite = commandeRepository.findById(commande.id()).orElseThrow();
        entite.setDateCreation(datePasseee);
        entityManager.flush();

        // Lecture en base plutôt qu'égalité stricte avec l'objet géré : PostgreSQL arrondit l'horodatage
        // à la microseconde là où l'horloge JVM rend des nanosecondes, et une égalité précise serait rouge
        // selon la dernière décimale tirée. Ce qui est affirmé ici est l'invariant : la colonne n'a pas
        // bougé du moment du serveur, et n'est surtout pas la date passée demandée par le setter.
        assertThat(dateDeLaCommande(commande.id()))
                .isNotEqualTo(datePasseee)
                .isBetween(avant, LocalDateTime.now());

        // Seul le SQL direct recule la date — c'est le chemin de la passe d'étalement de la démonstration.
        jdbcTemplate.update("update commandes set date_creation = ? where id = ?",
                java.sql.Timestamp.valueOf(datePasseee), commande.id());
        entityManager.clear();

        assertThat(commandeRepository.findById(commande.id()).orElseThrow().getDateCreation())
                .isEqualTo(datePasseee);
    }

    // ------------------------------------------------------------------ étalement (LOT DEMO-2)

    @Test
    void lesComptesSontEtalesSurPlusDeQuatreSemainesEtToujoursAvantLeurPremiereCommande() {
        generateur(MOT_DE_PASSE, "demo").run();
        LocalDateTime instant = LocalDateTime.now();

        // Amplitude réellement mesurée sur le jeu : vingt-neuf jours civils, entre le compte le plus
        // ancien (le troisième acheteur, soixante-deux jours) et le plus récent (le premier acheteur,
        // trente-trois). Vingt-huit est le strict plancher de la demande « plus de quatre semaines ».
        assertThat(amplitudeComptesDemo()).isGreaterThanOrEqualTo(28L);
        assertThat(nombre("select count(u) from Utilisateur u where u.email like :suffixe")).isEqualTo(9);

        // Aucun compte inventé dans le futur, aucun plus vieux que la borne validée (soixante-trois
        // jours : la fenêtre des commandes, plus la marge de trois jours qui rend l'inscription antérieure).
        assertThat(comptesApres(instant)).isZero();
        assertThat(comptesAvant(instant.minusDays(63))).isZero();

        // La règle de cohérence, celle qui prime sur la bande tirée : trois jours civils au moins entre
        // l'inscription d'un compte et la plus ancienne commande qu'il passe, comme acheteur ou comme
        // vendeur. Zéro violation, sinon un compte daterait après ce qu'il rend possible.
        assertThat(comptesMoinsDeTroisJoursAvantLeurPremiereCommande()).isZero();
    }

    @Test
    void lesPaiementsSontAlignesSurLaDateDeLeurCommande() {
        generateur(MOT_DE_PASSE, "demo").run();
        LocalDateTime instant = LocalDateTime.now();

        assertThat(nombre("select count(p) from Paiement p "
                + "where p.commande.acheteur.utilisateur.email like :suffixe")).isPositive();
        assertThat(paiementsApres(instant)).isZero();
        assertThat(paiementsMalDates()).isZero();
    }

    @Test
    void lesRecoltesSontPublieesEntreLeCompteDuProducteurEtLeurPremiereVente() {
        generateur(MOT_DE_PASSE, "demo").run();
        LocalDateTime instant = LocalDateTime.now();

        assertThat(nombre("select count(r) from Recolte r "
                + "where r.producteur.utilisateur.email like :suffixe")).isEqualTo(20);
        assertThat(recoltesApres(instant)).isZero();
        assertThat(recoltesMalDatees()).isZero();
    }

    @Test
    void uneDeuxiemeExecutionNeDeplaceAucuneDate() {
        DemoDataInitializer generateur = generateur(MOT_DE_PASSE, "demo");
        generateur.run();

        Map<String, LocalDateTime> comptes = datesDesComptesDemo();
        List<LocalDateTime> commandes = datesDesCommandesDemo();
        List<LocalDateTime> paiements = datesDesPaiementsDemo();

        generateur.run();

        assertThat(datesDesComptesDemo()).isEqualTo(comptes);
        assertThat(datesDesCommandesDemo()).isEqualTo(commandes);
        assertThat(datesDesPaiementsDemo()).isEqualTo(paiements);
    }

    @Test
    void laPasseSqlPartageLaTransactionDuRunEtEstAnnuleeAvecElle() {
        // La condition même de la passe : le JdbcTemplate est branché sur la DataSource que
        // JpaTransactionManager met en transaction. Sans cela, ses UPDATE seraient hors sol.
        assertThat(transactionManager.getDataSource()).isSameAs(jdbcTemplate.getDataSource());

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transaction.execute(status -> {
            generateur(MOT_DE_PASSE, "demo").run();

            // La passe a bien écrit, et ses dates sont lisibles dans sa propre transaction.
            assertThat(dateCreation(EMAIL_PREMIER_PRODUCTEUR))
                    .isBefore(LocalDate.now().minusDays(30).atStartOfDay());
            assertThat(nombre("select count(c) from Commande c "
                    + "where c.acheteur.utilisateur.email like :suffixe")).isEqualTo(60);

            // Pas d'exception : un rollback forcé, qui ne dépend pas de la remontée d'une erreur.
            status.setRollbackOnly();
            return null;
        });

        // Rien ne subsiste : la passe native a été annulée avec les insertions des services, pas
        // committée dans son propre coin. La base de développement reste celle de la QA.
        assertThat(utilisateurRepository.findByEmail(EMAIL_PREMIER_PRODUCTEUR)).isEmpty();
        assertThat(nombre("select count(c) from Commande c "
                + "where c.acheteur.utilisateur.email like :suffixe")).isZero();
        assertThat(nombre("select count(p) from Paiement p "
                + "where p.commande.acheteur.utilisateur.email like :suffixe")).isZero();
    }

    // ------------------------------------------------------------------ non-régression des deux écrans

    @Test
    void letalageNeChangeAucuneValeurLueParLesDeuxEcransDeStatistiques() {
        Utilisateur admin = creerAdministrateur();
        StatistiquesAdminResponse avant = statistiquesAdminService.statistiques("30j", principalDe(admin));

        generateur(MOT_DE_PASSE, "demo").run();

        // Garde de l'exactitude : la fenêtre de trente jours est bornée en jours civils, et aucune
        // commande du jeu ne tombe sur le jour frontière (mesuré : zéro). Sans cette ligne, un nombre
        // exact ne serait plus garanti d'une exécution à l'autre selon l'heure du test.
        assertThat(commandesDemoAuJourMoins29()).isZero();

        StatistiquesAdminResponse apres = statistiquesAdminService.statistiques("30j", principalDe(admin));

        // Delta mesurés sur la base locale réelle avant la passe d'étalement, relevé du 2026-10-09.
        // Ce sont des deltas et non des absolus : la base de développement porte la QA, et l'écran
        // additionne les deux. La non-régression est celle du jeu de démonstration lui-même.
        assertThat(apres.utilisateursTotal() - avant.utilisateursTotal()).isEqualTo(9);
        assertThat(apres.producteurs() - avant.producteurs()).isEqualTo(3);
        assertThat(apres.acheteurs() - avant.acheteurs()).isEqualTo(6);
        assertThat(apres.recoltesActives() - avant.recoltesActives()).isEqualTo(19);
        assertThat(apres.commandesPeriode() - avant.commandesPeriode()).isEqualTo(29);
        assertThat(apres.volumeAffaires().subtract(avant.volumeAffaires()))
                .isEqualByComparingTo("1020250.00");
        assertThat(apres.nombreRembourses() - avant.nombreRembourses()).isEqualTo(2);

        // STAT-1 : le producteur filtré par son propre identifiant, la QA voisine ne brouille rien.
        Utilisateur premier = utilisateurRepository.findByEmail(EMAIL_PREMIER_PRODUCTEUR).orElseThrow();
        StatistiquesProducteurResponse statistiques =
                statistiquesProducteurService.statistiques("30j", principalDe(premier));
        assertThat(statistiques.chiffreAffaires()).isEqualByComparingTo("87425.00");
        assertThat(statistiques.nombreCommandes()).isEqualTo(18);
        assertThat(statistiques.tauxAnnulation()).isEqualByComparingTo("11.11");
        assertThat(statistiques.panierMoyen()).isEqualByComparingTo("5464.06");
        assertThat(statistiques.commandesATraiter()).isEqualTo(9);
    }

    // ------------------------------------------------------------------ aides

    /**
     * Le composant est instancié à la main, avec les vrais services et dépôts du contexte : le
     * profil {@code demo} reste inactif dans les tests, et l'exécution se déroule dans la
     * transaction annulée du test.
     */
    private DemoDataInitializer generateur(String motDePasse, String... profilsActifs) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles(profilsActifs);
        return new DemoDataInitializer(environment, authService, producteurService, recolteService,
                commandeService, paiementService, utilisateurRepository, producteurRepository,
                acheteurRepository, commandeRepository, jdbcTemplate, motDePasse);
    }

    private TypedQuery<Long> requete(String jpql) {
        return entityManager.createQuery(jpql, Long.class).setParameter("suffixe", SUFFIXE_DEMO);
    }

    private long nombre(String jpql) {
        return requete(jpql).getSingleResult();
    }

    private long commandesAuStatut(StatutCommande statut) {
        return requete("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe "
                + "and c.statut = :statut")
                .setParameter("statut", statut)
                .getSingleResult();
    }

    private long paiementsAuStatut(StatutPaiement statut) {
        return requete("select count(p) from Paiement p where p.commande.acheteur.utilisateur.email "
                + "like :suffixe and p.statut = :statut")
                .setParameter("statut", statut)
                .getSingleResult();
    }

    private long recoltesAuStatut(StatutRecolte statut) {
        return requete("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe "
                + "and r.statut = :statut")
                .setParameter("statut", statut)
                .getSingleResult();
    }

    /** Récoltes encore en vente mais sous le seuil d'alerte : ce que STAT-1 doit signaler. */
    private long recoltesDisponiblesSousLeSeuil() {
        return requete("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe "
                + "and r.statut = :statut and r.quantiteDisponible < :seuil")
                .setParameter("statut", StatutRecolte.DISPONIBLE)
                .setParameter("seuil", SEUIL_STOCK_FAIBLE)
                .getSingleResult();
    }

    /**
     * Récoltes de démonstration en alerte pour l'écran statistiques (épuisées ou sous le seuil de 5),
     * comptées par producteur. Un producteur sans aucune alerte n'apparaît pas dans la carte.
     */
    private Map<String, Long> recoltesEnAlerteParProducteur() {
        return entityManager.createQuery("select u.email, count(r) from Recolte r "
                        + "join r.producteur p join p.utilisateur u "
                        + "where u.email like :suffixe and (r.statut = :epuisee "
                        + "or r.quantiteDisponible < :seuil) group by u.email", Object[].class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .setParameter("epuisee", StatutRecolte.EPUISEE)
                .setParameter("seuil", SEUIL_STOCK_FAIBLE)
                .getResultList().stream()
                .collect(Collectors.toMap(ligne -> (String) ligne[0], ligne -> (Long) ligne[1]));
    }

    /**
     * Fenêtre civile des trente derniers jours, bornée comme celle de
     * {@code StatistiquesProducteurService} : du jour présent moins vingt-neuf au lendemain à zéro heure.
     */
    private LocalDate debutFenetreStatistiques() {
        return LocalDate.now().minusDays(29);
    }

    private long commandesToucheesDansLaFenetre(String email) {
        return entityManager
                .createQuery("select count(distinct c.id) from Commande c join c.lignes l "
                        + "where l.recolte.producteur.utilisateur.email = :email "
                        + "and c.dateCreation >= :debut and c.dateCreation < :fin", Long.class)
                .setParameter("email", email)
                .setParameter("debut", debutFenetreStatistiques().atStartOfDay())
                .setParameter("fin", debutFenetreStatistiques().plusDays(30).atStartOfDay())
                .getSingleResult();
    }

    private long commandesAnnuleesDansLaFenetre(String email) {
        return entityManager
                .createQuery("select count(distinct c.id) from Commande c join c.lignes l "
                        + "where l.recolte.producteur.utilisateur.email = :email "
                        + "and c.statut = :statut and c.dateCreation >= :debut and c.dateCreation < :fin",
                        Long.class)
                .setParameter("email", email)
                .setParameter("statut", StatutCommande.ANNULEE)
                .setParameter("debut", debutFenetreStatistiques().atStartOfDay())
                .setParameter("fin", debutFenetreStatistiques().plusDays(30).atStartOfDay())
                .getSingleResult();
    }

    private BigDecimal stockMinimalDesRecoltesDemo() {
        return entityManager.createQuery("select min(r.quantiteDisponible) from Recolte r "
                        + "where r.producteur.utilisateur.email like :suffixe", BigDecimal.class)
                .setParameter("suffixe", SUFFIXE_DEMO)
                .getSingleResult();
    }

    private long commandesAvant(LocalDateTime seuil) {
        return requete("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe "
                + "and c.dateCreation < :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    private long commandesApres(LocalDateTime seuil) {
        return requete("select count(c) from Commande c where c.acheteur.utilisateur.email like :suffixe "
                + "and c.dateCreation > :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    // ------------------------------------------------------------------ aides de la passe d'étalement

    private long comptesApres(LocalDateTime seuil) {
        return requete("select count(u) from Utilisateur u where u.email like :suffixe "
                + "and u.dateCreation > :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    private long comptesAvant(LocalDateTime seuil) {
        return requete("select count(u) from Utilisateur u where u.email like :suffixe "
                + "and u.dateCreation < :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    private long recoltesApres(LocalDateTime seuil) {
        return requete("select count(r) from Recolte r where r.producteur.utilisateur.email like :suffixe "
                + "and r.dateCreation > :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    private long paiementsApres(LocalDateTime seuil) {
        return requete("select count(p) from Paiement p where p.commande.acheteur.utilisateur.email "
                + "like :suffixe and p.dateCreation > :seuil")
                .setParameter("seuil", seuil)
                .getSingleResult();
    }

    /**
     * Nombre de jours civils entre le compte de démonstration le plus ancien et le plus récent. La
     * lecture est faite en SQL : la passe écrit les dates nativement, l'objet géré par JPA porte
     * l'horodatage d'insertion.
     */
    private long amplitudeComptesDemo() {
        return jdbcTemplate.queryForObject("""
                select floor(extract(epoch from max(u.date_creation) - min(u.date_creation)) / 86400)
                  from utilisateurs u
                 where u.email like ?
                """, Long.class, SUFFIXE_DEMO);
    }

    /**
     * Comptes de démonstration datés à moins de trois jours civils de la plus ancienne commande qu'ils
     * passent, comme acheteur ou comme vendeur. Un compte devrait exister avant la vente qu'il rend
     * possible ; la passe d'étalement ne peut en écrire un autrement.
     */
    private long comptesMoinsDeTroisJoursAvantLeurPremiereCommande() {
        return jdbcTemplate.queryForObject("""
                with premieres as (
                    select a.utilisateur_id as utilisateur_id, min(c.date_creation) as premiere
                      from commandes c
                      join acheteurs a on a.id = c.acheteur_id
                     group by a.utilisateur_id
                    union all
                    select pu.id as utilisateur_id, min(c.date_creation) as premiere
                      from commandes c
                      join lignes_commande l on l.commande_id = c.id
                      join recoltes r on r.id = l.recolte_id
                      join producteurs p on p.id = r.producteur_id
                      join utilisateurs pu on pu.id = p.utilisateur_id
                     group by pu.id
                )
                select count(*)
                  from utilisateurs u
                  join premieres p on p.utilisateur_id = u.id
                 where u.email like ?
                   and date_trunc('day', p.premiere) < date_trunc('day', u.date_creation)
                                                    + interval '3 days'
                """, Long.class, SUFFIXE_DEMO);
    }

    /**
     * Paiements sortis de l'ordre que la passe écrit : après l'instant, avant leur commande, plus d'une
     * heure après elle, ou confirmés hors du créneau de douze minutes qui suit. Zéro attendu : la
     * référence d'un paiement est la date de la commande qu'il règle.
     */
    private long paiementsMalDates() {
        return jdbcTemplate.queryForObject("""
                select count(*)
                  from paiements p
                  join commandes c on c.id = p.commande_id
                  join acheteurs a on a.id = c.acheteur_id
                  join utilisateurs u on u.id = a.utilisateur_id
                 where u.email like ?
                   and (p.date_creation > now()
                        or p.date_creation < c.date_creation
                        or p.date_creation > c.date_creation + interval '1 hour'
                        or p.date_confirmation < p.date_creation
                        or p.date_confirmation > p.date_creation + interval '1 hour 12 minutes')
                """, Long.class, SUFFIXE_DEMO);
    }

    /**
     * Récoltes sorties de l'intervalle que la passe écrit : après l'inscription de leur producteur, à ou
     * après leur première vente, dans le futur, ou dont {@code date_disponibilite} ne serait pas le jour
     * de publication. La colonne se lit « Disponible à partir du » : elle ne peut pas suivre la vente.
     */
    private long recoltesMalDatees() {
        return jdbcTemplate.queryForObject("""
                select count(*)
                  from recoltes r
                  join producteurs pr on pr.id = r.producteur_id
                  join utilisateurs u on u.id = pr.utilisateur_id
                  left join (
                        select l.recolte_id as recolte_id, min(c.date_creation) as premiere
                          from lignes_commande l
                          join commandes c on c.id = l.commande_id
                         group by l.recolte_id
                  ) v on v.recolte_id = r.id
                 where u.email like ?
                   and (r.date_creation > now()
                        or date_trunc('day', r.date_creation) <= date_trunc('day', u.date_creation)
                        or (v.premiere is not null
                            and date_trunc('day', v.premiere) <= date_trunc('day', r.date_creation))
                        or r.date_disponibilite <> date_trunc('day', r.date_creation)::date)
                """, Long.class, SUFFIXE_DEMO);
    }

    /** Commandes de démonstration posées sur le jour frontière de la fenêtre de trente jours. */
    private long commandesDemoAuJourMoins29() {
        return jdbcTemplate.queryForObject("""
                select count(*)
                  from commandes c
                  join acheteurs a on a.id = c.acheteur_id
                  join utilisateurs u on u.id = a.utilisateur_id
                 where u.email like ?
                   and c.date_creation::date = current_date - 29
                """, Long.class, SUFFIXE_DEMO);
    }

    private LocalDateTime dateCreation(String email) {
        return jdbcTemplate.queryForObject("select date_creation from utilisateurs where email = ?",
                Timestamp.class, email).toLocalDateTime();
    }

    private LocalDateTime dateDeLaCommande(Long id) {
        return jdbcTemplate.queryForObject("select date_creation from commandes where id = ?",
                Timestamp.class, id).toLocalDateTime();
    }

    private Map<String, LocalDateTime> datesDesComptesDemo() {
        Map<String, LocalDateTime> dates = new LinkedHashMap<>();
        jdbcTemplate.query("""
                select email, date_creation from utilisateurs where email like ? order by email
                """, rs -> {
            dates.put(rs.getString(1), rs.getTimestamp(2).toLocalDateTime());
        }, SUFFIXE_DEMO);
        return dates;
    }

    private List<LocalDateTime> datesDesCommandesDemo() {
        return jdbcTemplate.queryForList("""
                select c.date_creation from commandes c
                  join acheteurs a on a.id = c.acheteur_id
                  join utilisateurs u on u.id = a.utilisateur_id
                 where u.email like ?
                 order by c.id
                """, Timestamp.class, SUFFIXE_DEMO).stream().map(Timestamp::toLocalDateTime).toList();
    }

    private List<LocalDateTime> datesDesPaiementsDemo() {
        return jdbcTemplate.queryForList("""
                select p.date_creation from paiements p
                  join commandes c on c.id = p.commande_id
                  join acheteurs a on a.id = c.acheteur_id
                  join utilisateurs u on u.id = a.utilisateur_id
                 where u.email like ?
                 order by p.id
                """, Timestamp.class, SUFFIXE_DEMO).stream().map(Timestamp::toLocalDateTime).toList();
    }
}
