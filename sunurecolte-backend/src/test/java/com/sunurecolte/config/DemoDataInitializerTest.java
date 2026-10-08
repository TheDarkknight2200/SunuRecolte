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
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.service.AuthService;
import com.sunurecolte.user.service.ProducteurService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.StandardEnvironment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
 * fixe et la répartition des statuts est écrite.
 */
class DemoDataInitializerTest extends IntegrationTestSupport {

    private static final String MOT_DE_PASSE = "MotDePasse-Demo-2026";
    private static final String SUFFIXE_DEMO = "%.demo@sunurecolte.sn";
    private static final String EMAIL_PREMIER_PRODUCTEUR = "producteur1.demo@sunurecolte.sn";

    /** Seuil d'alerte de stock faible de LOT STAT-1 : deux récoltes de démonstration doivent finir dessous. */
    private static final BigDecimal SEUIL_STOCK_FAIBLE = new BigDecimal("5");

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
        assertThat(recoltesAuStatut(StatutRecolte.EPUISEE)).isGreaterThanOrEqualTo(1);
        assertThat(recoltesDisponiblesSousLeSeuil()).isGreaterThanOrEqualTo(2);
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
    void uneCommandeCreeeParLeServiceGardeLHorodatageDuServeurMaisLaColonneResteEcripturable() {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);
        Acheteur acheteur = creerAcheteur();
        Recolte recolte = creerRecolte(producteur, "Tomate de test", "50.00", "800");

        LocalDateTime avant = LocalDateTime.now().withNano(0);
        var commande = commandeService.creer(new CommandeRequest(acheteur.getId(), ModeReception.RETRAIT,
                null, null, null, List.of(new LigneCommandeRequest(recolte.getId(), new BigDecimal("5.00")))),
                principalDe(acheteur.getUtilisateur()));

        // Le @PrePersist garde son effet : le service ne pose aucune date, la commande naît à l'instant.
        assertThat(commande.dateCreation()).isBetween(avant, LocalDateTime.now());

        // La colonne n'est plus figée après insertion : c'est ce qui permet l'étalement de la démonstration.
        LocalDateTime datePasseee = avant.minusDays(12);
        Commande entite = commandeRepository.findById(commande.id()).orElseThrow();
        entite.setDateCreation(datePasseee);
        entityManager.flush();
        entityManager.clear();

        assertThat(commandeRepository.findById(commande.id()).orElseThrow().getDateCreation())
                .isEqualTo(datePasseee);
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
                acheteurRepository, commandeRepository, motDePasse);
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
}
