package com.sunurecolte.api;

import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP de GET /api/producteurs/moi/statistiques (lot STAT-1).
 *
 * <p>Ce qui est vérifié ici, sur PostgreSQL réel et sans mock : le grain de la commande
 * multi-producteurs (règle 1 du service), le filtre de période sur {@code date_creation},
 * l'exclusion des commandes annulées — et des remboursées, puisque {@code REMBOURSE} n'est
 * écrit que par une annulation —, le comblement des jours sans vente, la limite et l'ordre du
 * top récoltes, le seuil de stock faible, et les refus d'accès (403 ACHETEUR et ADMIN, 401 anonyme)
 * comme la 400 d'une période inconnue.
 */
class StatistiquesProducteurApiTest extends IntegrationTestSupport {

    private static final String URL = "/api/producteurs/moi/statistiques";

    /** Message du filtre de sécurité pour un rôle insuffisant (RestAccessDeniedHandler). */
    private static final String ACCES_REFUSE =
            "Accès refusé : vous n'avez pas les droits nécessaires pour cette action.";

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // --- Isolation et grain --------------------------------------------------

    @Test
    void unProducteurSansCommandeRepondDesZerosEtDesListesVides() throws Exception {
        Producteur producteur = creerProducteur();
        creerRecolte(producteur, "Tomate", "20.00", "450.00");

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(0.00))
                .andExpect(jsonPath("$.nombreCommandes").value(0))
                .andExpect(jsonPath("$.panierMoyen").value(0.00))
                .andExpect(jsonPath("$.tauxAnnulation").value(0.00))
                .andExpect(jsonPath("$.commandesATraiter").value(0))
                .andExpect(jsonPath("$.repartitionStatuts", hasSize(0)))
                .andExpect(jsonPath("$.topRecoltes", hasSize(0)))
                .andExpect(jsonPath("$.stockFaible", hasSize(0)))
                // Une entrée par jour civil, toutes à zéro : la période par défaut est 30j.
                .andExpect(jsonPath("$.ventesParJour", hasSize(30)))
                .andExpect(jsonPath("$.ventesParJour[0].montant").value(0.00));
    }

    @Test
    void lesStatistiquesNeComptentQueLesLignesDuProducteurConnecte() throws Exception {
        Producteur premier = creerProducteur();
        Producteur second = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        Recolte tomate = creerRecolte(premier, "Tomate", "100.00", "450.00");
        Recolte oignon = creerRecolte(second, "Oignon", "100.00", "200.00");
        creerCommandeViaApi(acheteur, tomate, "2.00");
        creerCommandeViaApi(acheteur, oignon, "1.00");

        mockMvc.perform(get(URL).with(avecJetonDe(premier.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(900.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.panierMoyen").value(900.00))
                .andExpect(jsonPath("$.topRecoltes", hasSize(1)))
                .andExpect(jsonPath("$.topRecoltes[0].nom").value("Tomate"))
                .andExpect(jsonPath("$.topRecoltes[0].recolteId").value(tomate.getId()));

        mockMvc.perform(get(URL).with(avecJetonDe(second.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(200.00))
                .andExpect(jsonPath("$.topRecoltes", hasSize(1)))
                .andExpect(jsonPath("$.topRecoltes[0].nom").value("Oignon"));
    }

    @Test
    void uneCommandeMixteCompteUneFoisChezChaqueProducteurPourSonSeulMontant() throws Exception {
        Producteur premier = creerProducteur();
        Producteur second = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        Recolte tomate = creerRecolte(premier, "Tomate", "100.00", "450.00");
        Recolte oignon = creerRecolte(second, "Oignon", "100.00", "200.00");

        CommandeResponse mixte = creerCommandeViaApi(acheteur, List.of(
                Map.of("recolteId", tomate.getId(), "quantite", "2.00"),
                Map.of("recolteId", oignon.getId(), "quantite", "3.00")));
        // Le total de la commande mêle les deux producteurs : aucune statistique ne doit s'en servir.
        assertThat(mixte.total()).isEqualByComparingTo(new BigDecimal("1500.00"));

        mockMvc.perform(get(URL).with(avecJetonDe(premier.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(900.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.panierMoyen").value(900.00))
                .andExpect(jsonPath("$.repartitionStatuts", hasSize(1)))
                .andExpect(jsonPath("$.repartitionStatuts[0].statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.repartitionStatuts[0].nombre").value(1))
                .andExpect(jsonPath("$.topRecoltes", hasSize(1)))
                .andExpect(jsonPath("$.topRecoltes[0].quantiteVendue").value(2.00))
                .andExpect(jsonPath("$.topRecoltes[0].unite").value("kg"))
                .andExpect(jsonPath("$.ventesParJour", hasSize(30)));

        mockMvc.perform(get(URL).with(avecJetonDe(second.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(600.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.topRecoltes[0].nom").value("Oignon"))
                .andExpect(jsonPath("$.topRecoltes[0].quantiteVendue").value(3.00))
                .andExpect(jsonPath("$.topRecoltes[0].revenu").value(600.00));
    }

    // --- Période -------------------------------------------------------------

    @Test
    void laPeriodeFiltreSurLaDateCreationEtLeDefautEstTrenteJours() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        CommandeResponse recente = creerCommandeViaApi(acheteur, tomate, "2.00");
        CommandeResponse ancien = creerCommandeViaApi(acheteur, tomate, "1.00");
        retrodater(ancien.id(), LocalDate.now().minusDays(10));
        assertThat(recente.id()).isNotEqualTo(ancien.id());

        mockMvc.perform(get(URL).param("periode", "7j")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(900.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.ventesParJour", hasSize(7)));

        mockMvc.perform(get(URL).param("periode", "30j")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(1350.00))
                .andExpect(jsonPath("$.nombreCommandes").value(2))
                .andExpect(jsonPath("$.panierMoyen").value(675.00))
                .andExpect(jsonPath("$.ventesParJour", hasSize(30)));

        // Absence de paramètre = 30j, même réponse que la période explicite.
        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(1350.00))
                .andExpect(jsonPath("$.nombreCommandes").value(2));
    }

    @Test
    void laPeriodeDuMoisExclutUneCommandeDuMoisPrecedent() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        CommandeResponse duJour = creerCommandeViaApi(acheteur, tomate, "1.00");
        CommandeResponse duMoisPrecedent = creerCommandeViaApi(acheteur, tomate, "2.00");
        // 40 jours : quel que soit le jour d'exécution, la commande tombe avant le 1ᵉʳ du mois courant.
        retrodater(duMoisPrecedent.id(), LocalDate.now().minusDays(40));
        assertThat(duJour.id()).isNotEqualTo(duMoisPrecedent.id());

        mockMvc.perform(get(URL).param("periode", "mois")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(450.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.topRecoltes[0].quantiteVendue").value(1.00));

        // Une commande vieille de 40 jours est hors de la fenêtre glissante de 30 jours aussi.
        mockMvc.perform(get(URL).param("periode", "30j")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(450.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1));
    }

    @Test
    void unePeriodeInconnueRepond400AvecUnMessageEnFrancais() throws Exception {
        Producteur producteur = creerProducteur();

        mockMvc.perform(get(URL).param("periode", "15j")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Période inconnue : « 15j ». Valeurs admises : 7j, 30j, mois."));
    }

    // --- Statuts : annulées et remboursées exclues des sommes ----------------

    @Test
    void lesCommandesAnnuleesSontExcluesDuChiffreDAffairesMaisCompteesDansLeNombre() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        creerCommandeViaApi(acheteur, tomate, "2.00");
        CommandeResponse annulee = creerCommandeViaApi(acheteur, tomate, "4.00");
        annulerViaApi(acheteur, annulee.id());

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                // 1800.00 annulés ne comptent pas, mais la commande reste dans le dénominateur.
                .andExpect(jsonPath("$.chiffreAffaires").value(900.00))
                .andExpect(jsonPath("$.nombreCommandes").value(2))
                .andExpect(jsonPath("$.tauxAnnulation").value(50.00))
                .andExpect(jsonPath("$.panierMoyen").value(900.00))
                .andExpect(jsonPath("$.commandesATraiter").value(1))
                .andExpect(jsonPath("$.repartitionStatuts", hasSize(2)))
                .andExpect(jsonPath("$.repartitionStatuts[0].statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.repartitionStatuts[1].statut").value("ANNULEE"))
                .andExpect(jsonPath("$.repartitionStatuts[1].nombre").value(1))
                .andExpect(jsonPath("$.topRecoltes[0].quantiteVendue").value(2.00))
                // Le jour de l'annulation retombe à 0 : seule la vente retenue figure dans la courbe.
                .andExpect(jsonPath("$.ventesParJour[29].date")
                        .value(LocalDate.now().toString()));
    }

    @Test
    void uneCommandeAnnuleeApresPaiementRembourseNeContribuePasAuChiffreDAffaires() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");
        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isCreated());
        annulerViaApi(acheteur, commande.id());

        // Preuve que la commande est bien remboursée : REMBOURSE est un statut de paiement, pas de commande.
        Paiement paiement = paiementRepository.findByCommandeId(commande.id()).orElseThrow();
        assertThat(paiement.getStatut()).isEqualTo(StatutPaiement.REMBOURSE);

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(0.00))
                .andExpect(jsonPath("$.panierMoyen").value(0.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1))
                .andExpect(jsonPath("$.tauxAnnulation").value(100.00))
                .andExpect(jsonPath("$.commandesATraiter").value(0))
                .andExpect(jsonPath("$.topRecoltes", hasSize(0)));
    }

    @Test
    void commandesATraiterCompteLesStatutsOuLeProducteurDoitAgir() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        CommandeResponse enAttente = creerCommandeViaApi(acheteur, tomate, "1.00");
        CommandeResponse confirmee = creerCommandeViaApi(acheteur, tomate, "1.00");
        changerStatutViaApi(producteur, confirmee.id(), "CONFIRMEE");
        CommandeResponse livree = creerCommandeViaApi(acheteur, tomate, "1.00");
        changerStatutViaApi(producteur, livree.id(), "CONFIRMEE");
        changerStatutViaApi(producteur, livree.id(), "PRETE");
        changerStatutViaApi(producteur, livree.id(), "LIVREE");

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                // Les trois commandes sont honorées : le chiffre d'affaires les compte toutes.
                .andExpect(jsonPath("$.chiffreAffaires").value(1350.00))
                .andExpect(jsonPath("$.nombreCommandes").value(3))
                .andExpect(jsonPath("$.tauxAnnulation").value(0.00))
                // LIVREE est terminal : il ne reste plus d'action attendue du producteur.
                .andExpect(jsonPath("$.commandesATraiter").value(2))
                .andExpect(jsonPath("$.repartitionStatuts[2].statut").value("LIVREE"))
                .andExpect(jsonPath("$.repartitionStatuts[2].nombre").value(1));
    }

    // --- Top récoltes et stock faible ----------------------------------------

    @Test
    void leTopRecoltesEstLimiteACinqEtTrieParRevenuDecroissant() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        // Une commande par récolte, quantités décroissantes : revenus 6000, 5000, 4000, 3000, 2000, 1000.
        String[] produits = {"Tomate", "Oignon", "Pomme", "Poivron", "Carotte", "Mangue"};
        for (int rang = 0; rang < produits.length; rang++) {
            int quantite = (produits.length - rang) * 10;
            Recolte recolte = creerRecolte(producteur, produits[rang], "100.00", "100.00");
            creerCommandeViaApi(acheteur, recolte, quantite + ".00");
        }

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topRecoltes", hasSize(5)))
                .andExpect(jsonPath("$.topRecoltes[0].nom").value("Tomate"))
                .andExpect(jsonPath("$.topRecoltes[0].revenu").value(6000.00))
                .andExpect(jsonPath("$.topRecoltes[0].quantiteVendue").value(60.00))
                .andExpect(jsonPath("$.topRecoltes[0].unite").value("kg"))
                .andExpect(jsonPath("$.topRecoltes[4].nom").value("Carotte"))
                .andExpect(jsonPath("$.topRecoltes[4].revenu").value(2000.00))
                // La sixième récolte (1000.00) reste hors du classement, mais pas du chiffre d'affaires.
                .andExpect(jsonPath("$.chiffreAffaires").value(21000.00))
                .andExpect(jsonPath("$.nombreCommandes").value(6));
    }

    @Test
    void leStockFaibleListeLesRecoltesSousLeSeuilEtLesEpuisees() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        Recolte sousSeuil = creerRecolte(producteur, "Tomate", "4.00", "450.00");
        Recolte auSeuil = creerRecolte(producteur, "Oignon", "5.00", "200.00");
        Recolte epuisee = creerRecolte(producteur, "Pomme", "2.00", "300.00");
        Recolte confortable = creerRecolte(producteur, "Carotte", "50.00", "150.00");
        // Vendue entièrement : le service de commande passe la récolte à EPUISEE, quantité restante 0.
        creerCommandeViaApi(acheteur, epuisee, "2.00");

        mockMvc.perform(get(URL).with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                // Quantité croissante : l'épuisée d'abord. 5 n'est pas « sous » le seuil,
                // la récolte au seuil et la confortable ne sont pas signalées.
                .andExpect(jsonPath("$.stockFaible", hasSize(2)))
                .andExpect(jsonPath("$.stockFaible[0].nom").value("Pomme"))
                .andExpect(jsonPath("$.stockFaible[0].recolteId").value(epuisee.getId()))
                .andExpect(jsonPath("$.stockFaible[0].quantiteDisponible").value(0.00))
                .andExpect(jsonPath("$.stockFaible[0].unite").value("kg"))
                .andExpect(jsonPath("$.stockFaible[0].statut").value("EPUISEE"))
                .andExpect(jsonPath("$.stockFaible[1].recolteId").value(sousSeuil.getId()))
                .andExpect(jsonPath("$.stockFaible[1].quantiteDisponible").value(4.00))
                .andExpect(jsonPath("$.stockFaible[1].statut").value("DISPONIBLE"));
    }

    // --- Accès ---------------------------------------------------------------

    @Test
    void unAcheteurNeVoitPasLesStatistiquesDunProducteur() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(get(URL).with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message").value(ACCES_REFUSE));
    }

    @Test
    void unAdministrateurNeVoitPasLesStatistiquesDunProducteur() throws Exception {
        mockMvc.perform(get(URL).with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(ACCES_REFUSE));
    }

    @Test
    void uneStatistiqueSansJetonRepond401() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statut").value(401))
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void unIdentifiantDeProducteurPasseEnParametreEstIgnore() throws Exception {
        Producteur premier = creerProducteur();
        Producteur second = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(premier, "Tomate", "100.00", "450.00");
        creerCommandeViaApi(acheteur, tomate, "2.00");

        // Le premier pourrait tenter de lire les statistiques du second : le paramètre n'existe
        // pas côté serveur, l'identité vient du seul jeton.
        mockMvc.perform(get(URL).param("producteurId", String.valueOf(second.getId()))
                        .with(avecJetonDe(premier.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(900.00))
                .andExpect(jsonPath("$.nombreCommandes").value(1));

        mockMvc.perform(get(URL).param("producteurId", String.valueOf(premier.getId()))
                        .with(avecJetonDe(second.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chiffreAffaires").value(0.00))
                .andExpect(jsonPath("$.nombreCommandes").value(0));
    }

    // --- Aides locales -------------------------------------------------------

    /**
     * Recule la date de création d'une commande en base : l'API ne sait créer une commande
     * qu'à l'instant présent, seule l'écriture directe permet d'observer le filtre de période.
     * Le flush est nécessaire — sans lui l'UPDATE de JDBC partirait avant l'INSERT encore différé
     * de Hibernate et ne toucherait aucune ligne.
     */
    private void retrodater(Long commandeId, LocalDate date) {
        entityManager.flush();
        int lignesModifiees = jdbcTemplate.update(
                "UPDATE commandes SET date_creation = ? WHERE id = ?",
                Timestamp.valueOf(date.atStartOfDay()), commandeId);
        assertThat(lignesModifiees).isEqualTo(1);
    }

    private void annulerViaApi(Acheteur acheteur, Long commandeId) throws Exception {
        mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"ANNULEE\"}"))
                .andExpect(status().isOk());
    }

    private void changerStatutViaApi(Producteur producteur, Long commandeId, String statut)
            throws Exception {
        mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"" + statut + "\"}"))
                .andExpect(status().isOk());
    }

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, Recolte recolte, String quantite)
            throws Exception {
        return creerCommandeViaApi(acheteur, List.of(
                Map.of("recolteId", recolte.getId(), "quantite", quantite)));
    }

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, List<Map<String, Object>> lignes)
            throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", lignes);

        String reponse = mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readValue(reponse, CommandeResponse.class);
    }
}
