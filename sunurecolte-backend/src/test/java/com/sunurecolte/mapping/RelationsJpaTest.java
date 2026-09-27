package com.sunurecolte.mapping;

import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.LigneCommande;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.commande.repository.LigneCommandeRepository;
import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.notification.repository.NotificationRepository;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.paiement.repository.PaiementRepository;
import com.sunurecolte.prixmarche.entity.PrixMarche;
import com.sunurecolte.prixmarche.repository.PrixMarcheRepository;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.TypeAcheteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de mapping JPA des 8 relations structurantes du modèle :
 * 1. Utilisateur - Producteur (1-1)
 * 2. Utilisateur - Acheteur (1-1)
 * 3. Producteur - Recolte (1-N)
 * 4. Acheteur - Commande (1-N)
 * 5. Commande - LigneCommande (1-N, cascade + suppression des orphelines)
 * 6. Recolte - LigneCommande (1-N)
 * 7. Commande - Paiement (1-1)
 * 8. Utilisateur - Notification (1-N)
 *
 * Ces tests s'exécutent contre la vraie base PostgreSQL locale, avec le schéma
 * créé par Flyway (aucune base embarquée, aucun mock) : chaque test est
 * transactionnel et ses données sont annulées par le rollback de @DataJpaTest.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RelationsJpaTest {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private ProducteurRepository producteurRepository;

    @Autowired
    private AcheteurRepository acheteurRepository;

    @Autowired
    private RecolteRepository recolteRepository;

    @Autowired
    private CommandeRepository commandeRepository;

    @Autowired
    private LigneCommandeRepository ligneCommandeRepository;

    @Autowired
    private PaiementRepository paiementRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PrixMarcheRepository prixMarcheRepository;

    @Autowired
    private EntityManager entityManager;

    // --- Relation 1 : Utilisateur -> Producteur (1-1) -----------------------

    @Test
    void utilisateurVersProducteurRelationUnAUn() {
        Utilisateur utilisateur = creerUtilisateur("producteur.relations@sunurecolte.sn", Role.PRODUCTEUR);
        creerProducteur(utilisateur);
        entityManager.flush();
        entityManager.clear();

        Producteur recharge = producteurRepository.findByUtilisateurId(utilisateur.getId()).orElseThrow();
        assertThat(recharge.getUtilisateur().getEmail()).isEqualTo("producteur.relations@sunurecolte.sn");
        assertThat(recharge.getFiliere()).isEqualTo(Filiere.MARAICHAGE);
        assertThat(recharge.getLocalisationExploitation()).isEqualTo("Rufisque");
    }

    // --- Relation 2 : Utilisateur -> Acheteur (1-1) -------------------------

    @Test
    void utilisateurVersAcheteurRelationUnAUn() {
        Utilisateur utilisateur = creerUtilisateur("acheteur.relations@sunurecolte.sn", Role.ACHETEUR);
        creerAcheteur(utilisateur);
        entityManager.flush();
        entityManager.clear();

        Acheteur recharge = acheteurRepository.findByUtilisateurId(utilisateur.getId()).orElseThrow();
        assertThat(recharge.getUtilisateur().getEmail()).isEqualTo("acheteur.relations@sunurecolte.sn");
        assertThat(recharge.getTypeAcheteur()).isEqualTo(TypeAcheteur.RESTAURATEUR);
    }

    // --- Relation 3 : Producteur -> Recolte (1-N) ---------------------------

    @Test
    void producteurVersRecoltesRelationUnPlusieurs() {
        Utilisateur utilisateur = creerUtilisateur("producteur.recoltes@sunurecolte.sn", Role.PRODUCTEUR);
        Producteur producteur = creerProducteur(utilisateur);
        creerRecolte(producteur, "Tomate");
        creerRecolte(producteur, "Oignon");
        entityManager.flush();
        entityManager.clear();

        List<Recolte> recoltes = recolteRepository.findByProducteurId(producteur.getId());
        assertThat(recoltes).hasSize(2);
        assertThat(recoltes).extracting(Recolte::getProduit).containsExactlyInAnyOrder("Tomate", "Oignon");
        assertThat(recoltes).allSatisfy(recolte -> {
            assertThat(recolte.getProducteur().getId()).isEqualTo(producteur.getId());
            assertThat(recolte.getStatut()).isEqualTo(StatutRecolte.DISPONIBLE);
        });
    }

    // --- Relation 4 : Acheteur -> Commande (1-N) ----------------------------

    @Test
    void acheteurVersCommandesRelationUnPlusieurs() {
        Utilisateur utilisateur = creerUtilisateur("acheteur.commandes@sunurecolte.sn", Role.ACHETEUR);
        Acheteur acheteur = creerAcheteur(utilisateur);
        creerCommande(acheteur);
        creerCommande(acheteur);
        entityManager.flush();
        entityManager.clear();

        List<Commande> commandes = commandeRepository.findByAcheteurIdOrderByDateCreationDesc(acheteur.getId());
        assertThat(commandes).hasSize(2);
        assertThat(commandes).allSatisfy(commande -> {
            assertThat(commande.getAcheteur().getId()).isEqualTo(acheteur.getId());
            assertThat(commande.getStatut()).isEqualTo(StatutCommande.EN_ATTENTE);
            assertThat(commande.getModeReception()).isEqualTo(ModeReception.LIVRAISON);
        });
    }

    // --- Relation 5 : Commande -> LigneCommande (1-N, cascade) --------------

    @Test
    void commandeVersLignesRelationUnPlusieursAvecCascade() {
        Commande commande = creerCommandePourNouvelAcheteur("acheteur.lignes@sunurecolte.sn");
        Recolte recolte = creerRecoltePourNouveauProducteur("producteur.lignes@sunurecolte.sn");

        LigneCommande ligne = creerLigne(commande, recolte, "2.00");
        commande.getLignes().add(ligne);
        entityManager.flush();
        entityManager.clear();

        List<LigneCommande> lignes = ligneCommandeRepository.findByCommandeId(commande.getId());
        assertThat(lignes).hasSize(1);
        assertThat(lignes.get(0).getRecolte().getId()).isEqualTo(recolte.getId());
        assertThat(lignes.get(0).getSousTotal()).isEqualByComparingTo("900.00");
    }

    @Test
    void supprimerUneLigneDeLaCollectionLaSupprimeEnBase() {
        Commande commande = creerCommandePourNouvelAcheteur("acheteur.orphelines@sunurecolte.sn");
        Recolte recolte = creerRecoltePourNouveauProducteur("producteur.orphelines@sunurecolte.sn");

        commande.getLignes().add(creerLigne(commande, recolte, "1.00"));
        entityManager.flush();
        Long commandeId = commande.getId();

        commande.getLignes().clear();
        entityManager.flush();
        entityManager.clear();

        assertThat(ligneCommandeRepository.findByCommandeId(commandeId)).isEmpty();
        assertThat(commandeRepository.findById(commandeId)).isPresent();
    }

    // --- Relation 6 : Recolte -> LigneCommande (1-N) ------------------------

    @Test
    void recolteVersLignesCommandeRelationUnPlusieurs() {
        Recolte recolte = creerRecoltePourNouveauProducteur("producteur.recolte.lignes@sunurecolte.sn");

        Commande premiereCommande = creerCommandePourNouvelAcheteur("acheteur.ligne1@sunurecolte.sn");
        premiereCommande.getLignes().add(creerLigne(premiereCommande, recolte, "3.00"));

        Commande secondeCommande = creerCommandePourNouvelAcheteur("acheteur.ligne2@sunurecolte.sn");
        secondeCommande.getLignes().add(creerLigne(secondeCommande, recolte, "4.00"));

        entityManager.flush();
        entityManager.clear();

        List<LigneCommande> lignes = entityManager.createQuery(
                        "select l from LigneCommande l where l.recolte.id = :recolteId", LigneCommande.class)
                .setParameter("recolteId", recolte.getId())
                .getResultList();
        assertThat(lignes).hasSize(2);
        assertThat(lignes).allSatisfy(ligne ->
                assertThat(ligne.getRecolte().getProduit()).isEqualTo("Tomate"));
    }

    // --- Relation 7 : Commande -> Paiement (1-1) ----------------------------

    @Test
    void commandeVersPaiementRelationUnAUn() {
        Commande commande = creerCommandePourNouvelAcheteur("acheteur.paiement@sunurecolte.sn");

        Paiement paiement = new Paiement();
        paiement.setCommande(commande);
        paiement.setReferenceTransaction("WAVE-TEST-0001");
        paiement.setMontant(new BigDecimal("900.00"));
        paiement.setMoyenPaiement(MoyenPaiement.WAVE);
        paiementRepository.save(paiement);

        entityManager.flush();
        entityManager.clear();

        Paiement recharge = paiementRepository.findByCommandeId(commande.getId()).orElseThrow();
        assertThat(recharge.getStatut()).isEqualTo(StatutPaiement.EN_ATTENTE);
        assertThat(recharge.getMoyenPaiement()).isEqualTo(MoyenPaiement.WAVE);
        assertThat(recharge.getReferenceTransaction()).isEqualTo("WAVE-TEST-0001");
        assertThat(recharge.getDateCreation()).isNotNull();
        assertThat(paiementRepository.findByReferenceTransaction("WAVE-TEST-0001")).isPresent();
    }

    // --- Relation 8 : Utilisateur -> Notification (1-N) ---------------------

    @Test
    void utilisateurVersNotificationsRelationUnPlusieurs() {
        Utilisateur utilisateur = creerUtilisateur("acheteur.notifications@sunurecolte.sn", Role.ACHETEUR);

        for (int i = 1; i <= 2; i++) {
            Notification notification = new Notification();
            notification.setUtilisateur(utilisateur);
            notification.setTitre("Commande " + i);
            notification.setMessage("Votre commande " + i + " a ete confirmee.");
            notificationRepository.save(notification);
        }
        entityManager.flush();
        entityManager.clear();

        List<Notification> notifications =
                notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(utilisateur.getId());
        assertThat(notifications).hasSize(2);
        assertThat(notifications).allSatisfy(notification -> {
            assertThat(notification.getUtilisateur().getId()).isEqualTo(utilisateur.getId());
            assertThat(notification.isLu()).isFalse();
            assertThat(notification.getDateCreation()).isNotNull();
        });
        assertThat(notificationRepository
                .findByUtilisateurIdAndLuFalseOrderByDateCreationDesc(utilisateur.getId()))
                .hasSize(2);
    }

    // --- Entité sans relation : PrixMarche ---------------------------------

    @Test
    void prixMarcheEstPersisteAvecSaDateDeMiseAJour() {
        PrixMarche prix = new PrixMarche();
        prix.setProduit("Arachide");
        prix.setUnite("kg");
        prix.setPrixMoyen(new BigDecimal("350.00"));
        prix.setMarcheReference("Marche de Thiaroye");
        PrixMarche enregistre = prixMarcheRepository.save(prix);

        entityManager.flush();
        entityManager.clear();

        PrixMarche recharge = prixMarcheRepository.findById(enregistre.getId()).orElseThrow();
        assertThat(recharge.getPrixMoyen()).isEqualByComparingTo("350.00");
        assertThat(recharge.getDateMiseAJour()).isNotNull();
        assertThat(prixMarcheRepository.findByProduitIgnoreCase("ARACHIDE")).isPresent();
    }

    // --- Fabriques de données de test --------------------------------------

    private Utilisateur creerUtilisateur(String email, Role role) {
        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom("Diop");
        utilisateur.setPrenom("Awa");
        utilisateur.setEmail(email);
        utilisateur.setTelephone("771234567");
        utilisateur.setMotDePasse("empreinte-de-mot-de-passe-de-test");
        utilisateur.setRole(role);
        return utilisateurRepository.save(utilisateur);
    }

    private Producteur creerProducteur(Utilisateur utilisateur) {
        Producteur producteur = new Producteur();
        producteur.setUtilisateur(utilisateur);
        producteur.setFiliere(Filiere.MARAICHAGE);
        producteur.setLocalisationExploitation("Rufisque");
        return producteurRepository.save(producteur);
    }

    private Acheteur creerAcheteur(Utilisateur utilisateur) {
        Acheteur acheteur = new Acheteur();
        acheteur.setUtilisateur(utilisateur);
        acheteur.setTypeAcheteur(TypeAcheteur.RESTAURATEUR);
        return acheteurRepository.save(acheteur);
    }

    private Producteur creerProducteurPourNouvelUtilisateur(String email) {
        return creerProducteur(creerUtilisateur(email, Role.PRODUCTEUR));
    }

    private Recolte creerRecolte(Producteur producteur, String produit) {
        Recolte recolte = new Recolte();
        recolte.setProducteur(producteur);
        recolte.setProduit(produit);
        recolte.setQuantiteDisponible(new BigDecimal("120.00"));
        recolte.setQuantiteMin(new BigDecimal("10.00"));
        recolte.setQuantiteMax(new BigDecimal("50.00"));
        recolte.setUnite("kg");
        recolte.setPrixUnitaire(new BigDecimal("450.00"));
        recolte.setDateDisponibilite(LocalDate.now().plusDays(2));
        return recolteRepository.save(recolte);
    }

    private Recolte creerRecoltePourNouveauProducteur(String email) {
        return creerRecolte(creerProducteurPourNouvelUtilisateur(email), "Tomate");
    }

    private Commande creerCommande(Acheteur acheteur) {
        Commande commande = new Commande();
        commande.setAcheteur(acheteur);
        commande.setTotal(new BigDecimal("900.00"));
        commande.setModeReception(ModeReception.LIVRAISON);
        commande.setAdresseLivraison("Dakar, Plateau");
        commande.setTelephoneLivraison("771234567");
        return commandeRepository.save(commande);
    }

    private Commande creerCommandePourNouvelAcheteur(String email) {
        return creerCommande(creerAcheteur(creerUtilisateur(email, Role.ACHETEUR)));
    }

    private LigneCommande creerLigne(Commande commande, Recolte recolte, String quantite) {
        BigDecimal quantiteCommandee = new BigDecimal(quantite);
        LigneCommande ligne = new LigneCommande();
        ligne.setCommande(commande);
        ligne.setRecolte(recolte);
        ligne.setQuantite(quantiteCommandee);
        ligne.setPrixUnitaire(recolte.getPrixUnitaire());
        ligne.setSousTotal(recolte.getPrixUnitaire().multiply(quantiteCommandee));
        return ligne;
    }
}
