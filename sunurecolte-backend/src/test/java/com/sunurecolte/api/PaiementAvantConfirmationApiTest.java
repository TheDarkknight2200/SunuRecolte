package com.sunurecolte.api;

import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Règle « paiement avant confirmation pour les livraisons » (LOT P1), testée sur HTTP réel.
 *
 * Ce que la règle interdit et autorise, vérifié ici :
 * - initier un paiement le marque REUSSI avec une date de confirmation, en simulation assumée ;
 * - une LIVRAISON sans paiement REUSSI ne peut être ni confirmée ni marquée prête,
 *   que la demande vienne d'un producteur concerné ou de l'administrateur ;
 * - une LIVRAISON payée, et n'importe quelle commande en RETRAIT, gardent le cycle complet ;
 * - une LIVRAISON déjà confirmée sans paiement (cas hérité) reste bloquée à PRETE,
 *   mais l'initiation du paiement lui reste ouverte dans cet état ;
 * - un second paiement renvoie le même message métier (400), jamais une erreur 500.
 */
class PaiementAvantConfirmationApiTest extends IntegrationTestSupport {

    private static final String MESSAGE_CONFIRMATION_EXIGE_PAIEMENT =
            "Une commande en livraison doit être payée avant d'être confirmée.";
    private static final String MESSAGE_PRET_EXIGE_PAIEMENT =
            "Une commande en livraison doit être payée avant d'être marquée prête.";
    private static final String MESSAGE_PAIEMENT_EXISTANT =
            "Un paiement existe déjà pour cette commande.";

    // --- (a) Un paiement initié est une réussite simulée ---------------------

    @Test
    void initierUnPaiementRenvoieLeStatutReussiAvecUneDateDeConfirmation() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("REUSSI"))
                .andExpect(jsonPath("$.dateConfirmation", notNullValue()))
                .andExpect(jsonPath("$.referenceTransaction").value(startsWith("SIMU-")));

        Paiement enBase = paiementRepository.findByCommandeId(commande.id()).orElseThrow();
        assertThat(enBase.getStatut()).isEqualTo(StatutPaiement.REUSSI);
        assertThat(enBase.getDateConfirmation()).isNotNull();
        assertThat(enBase.getMontant()).isEqualByComparingTo(commande.total());
    }

    @Test
    void initierUnPaiementNotifieLeProducteurEnRappelantLaSimulation() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "LIVRAISON",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        payer(acheteur, commande.id());

        List<Notification> recues = notificationRepository
                .findByUtilisateurIdOrderByDateCreationDesc(producteur.getUtilisateur().getId())
                .stream()
                .filter(notification -> "Paiement simulé".equals(notification.getTitre()))
                .toList();

        assertThat(recues).hasSize(1);
        assertThat(recues.get(0).getMessage())
                .contains("commande n° " + commande.id())
                .contains("REUSSI")
                .contains("réussite simulée")
                .contains("aucune transaction réelle")
                .doesNotContain("a été payé", "paiement reçu", "ECHOUE");
    }

    // --- (b) LIVRAISON sans paiement REUSSI : CONFIRMEE et PRETE refusées ----

    @Test
    void uneLivraisonSansPaiementNePeutPasEtreConfirmee() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "LIVRAISON",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        refuserConfirmation(commande.id(), producteur.getUtilisateur(), acheteur);
        refuserConfirmation(commande.id(), creerAdministrateur(), acheteur);
    }

    @Test
    void uneLivraisonAvecUnPaiementEnAttenteNePeutPasEtrePreetee() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "LIVRAISON",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        // État non atteignable par l'API depuis LOT P1 : paiement sans réussite, commande déjà confirmée.
        marquerStatutEnBase(commande.id(), StatutCommande.CONFIRMEE);
        enregistrerPaiementEnAttente(commande.id(), commande.total());

        refuserPret(commande.id(), producteur.getUtilisateur());
        refuserPret(commande.id(), creerAdministrateur());
    }

    // --- (c) LIVRAISON payée : le cycle complet redevient possible -----------

    @Test
    void uneLivraisonPayeePeutEtreConfirmeePuisPretPuisLivree() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "LIVRAISON",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        payer(acheteur, commande.id());

        for (String statut : new String[]{"CONFIRMEE", "PRETE", "LIVREE"}) {
            mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                            .with(avecJetonDe(producteur.getUtilisateur()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"statut\": \"" + statut + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statut").value(statut));
        }
    }

    // --- (d) RETRAIT : aucune exigence de paiement ---------------------------

    @Test
    void unRetraitSansPaiementPeutEtreConfirmePuisPretPuisLivree() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "RETRAIT",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        assertThat(paiementRepository.findByCommandeId(commande.id())).isEmpty();

        for (String statut : new String[]{"CONFIRMEE", "PRETE", "LIVREE"}) {
            mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                            .with(avecJetonDe(producteur.getUtilisateur()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"statut\": \"" + statut + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statut").value(statut));
        }
    }

    // --- (e) Cas hérité : LIVRAISON déjà confirmée sans paiement -------------

    @Test
    void uneLivraisonDejaConfirmeeSansPaiementRefusePretEtAccepteUnPaiement() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse commande = creerCommandeAvec(acheteur, "LIVRAISON",
                creerRecolte(producteur, "Tomate", "100.00", "450.00"));

        marquerStatutEnBase(commande.id(), StatutCommande.CONFIRMEE);

        refuserPret(commande.id(), producteur.getUtilisateur());
        refuserPret(commande.id(), creerAdministrateur());

        // Le paiement reste possible dans cet état, et débloque ensuite la préparation.
        payer(acheteur, commande.id());

        mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"PRETE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("PRETE"));
    }

    // --- (g) Second paiement : message métier, jamais une erreur 500 ---------

    @Test
    void unSecondPaiementRenvoieLeMemeMessageMetierEtJamaisUneErreur500() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");

        payer(acheteur, commande.id());

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"ORANGE_MONEY\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message").value(MESSAGE_PAIEMENT_EXISTANT))
                .andExpect(jsonPath("$.trace").doesNotExist());

        assertThat(paiementRepository.findByCommandeId(commande.id()))
                .get()
                .extracting(Paiement::getMoyenPaiement)
                .isEqualTo(MoyenPaiement.WAVE);
    }

    /**
     * La contrainte `uq_paiements_commande` est bien levée à l'écriture : deux requêtes
     * simultanées peuvent donc passer le contrôle d'existence du service, et seule la
     * base refuse alors. C'est ce cas de course que la traduction en message métier protège.
     */
    @Test
    void laContrainteUniqueRefuseUnSecondPaiementALecriture() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");

        Paiement premier = nouveauPaiement(commande.id(), commande.total(), StatutPaiement.REUSSI);
        paiementRepository.saveAndFlush(premier);

        Paiement doublon = nouveauPaiement(commande.id(), commande.total(), StatutPaiement.REUSSI);

        assertThatThrownBy(() -> paiementRepository.saveAndFlush(doublon))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // --- Contrôles de refus réutilisables ------------------------------------

    private void refuserConfirmation(Long commandeId, Utilisateur demandeur, Acheteur acheteur)
            throws Exception {
        mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(demandeur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"CONFIRMEE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message").value(MESSAGE_CONFIRMATION_EXIGE_PAIEMENT));

        assertThat(commandeRepository.findById(commandeId))
                .get()
                .extracting(Commande::getStatut)
                .isEqualTo(StatutCommande.EN_ATTENTE);
    }

    private void refuserPret(Long commandeId, Utilisateur demandeur) throws Exception {
        mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(demandeur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"PRETE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message").value(MESSAGE_PRET_EXIGE_PAIEMENT));
    }

    // --- Fabriques locales ---------------------------------------------------

    private void payer(Acheteur acheteur, Long commandeId) throws Exception {
        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commandeId + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("REUSSI"));
    }

    private CommandeResponse creerCommande(Acheteur acheteur, String modeReception) throws Exception {
        return creerCommandeAvec(acheteur, modeReception,
                creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00"));
    }

    private CommandeResponse creerCommandeAvec(Acheteur acheteur, String modeReception, Recolte... recoltes)
            throws Exception {
        List<Map<String, Object>> lignes = new ArrayList<>();
        for (Recolte recolte : recoltes) {
            lignes.add(Map.of("recolteId", recolte.getId(), "quantite", "2.00"));
        }

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", modeReception);
        corps.put("lignes", lignes);
        if ("LIVRAISON".equals(modeReception)) {
            corps.put("adresseLivraison", "Parcelles 123, Sacré-Coeur 3, Dakar");
            corps.put("telephoneLivraison", telephoneUnique());
        }

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

    /** Écriture directe : reproduit un statut que l'API ne sait plus produire (cas hérité). */
    private void marquerStatutEnBase(Long commandeId, StatutCommande statut) {
        Commande commande = commandeRepository.findById(commandeId).orElseThrow();
        commande.setStatut(statut);
        commandeRepository.saveAndFlush(commande);
    }

    private void enregistrerPaiementEnAttente(Long commandeId, BigDecimal montant) {
        paiementRepository.saveAndFlush(nouveauPaiement(commandeId, montant, StatutPaiement.EN_ATTENTE));
    }

    private Paiement nouveauPaiement(Long commandeId, BigDecimal montant, StatutPaiement statut) {
        Paiement paiement = new Paiement();
        paiement.setCommande(commandeRepository.findById(commandeId).orElseThrow());
        paiement.setReferenceTransaction("SIMU-TEST-" + suffixeUnique());
        paiement.setMontant(montant);
        paiement.setMoyenPaiement(MoyenPaiement.WAVE);
        paiement.setStatut(statut);
        return paiement;
    }
}
