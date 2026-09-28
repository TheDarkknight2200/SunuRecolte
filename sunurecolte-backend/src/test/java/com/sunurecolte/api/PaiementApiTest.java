package com.sunurecolte.api;

import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/paiements.
 * Le paiement du MVP est une simulation : aucune transaction réelle n'est effectuée.
 */
class PaiementApiTest extends IntegrationTestSupport {

    @Test
    void initierUnPaiementRepond201AvecLeMontantDeLaCommande() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "2.00");

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.commandeId").value(commande.id()))
                .andExpect(jsonPath("$.montant").value(900.00))
                .andExpect(jsonPath("$.moyenPaiement").value("WAVE"))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.referenceTransaction").value(startsWith("SIMU-")));
    }

    @Test
    void initierUnPaiementPourUneCommandeDejaPayeeRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "2.00");

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"ORANGE_MONEY\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Un paiement existe déjà pour cette commande."));
    }

    @Test
    void initierUnPaiementPourUneCommandeInconnueRepond404() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": 999999, \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Commande introuvable avec l'id : 999999"));
    }

    @Test
    void unMoyenDePaiementInconnuRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "2.00");

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"BITCOIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Requête invalide : corps malformé ou valeur non autorisée."));
    }

    @Test
    void consulterUnPaiementParSonIdRepond200() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Paiement paiement = creerPaiementEnAttente(acheteur);

        mockMvc.perform(get("/api/paiements/{id}", paiement.getId())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(paiement.getId()))
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"));
    }

    @Test
    void consulterLePaiementDUneCommandeRepond200() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Paiement paiement = creerPaiementEnAttente(acheteur);

        mockMvc.perform(get("/api/paiements/commande/{commandeId}", paiement.getCommande().getId())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commandeId").value(paiement.getCommande().getId()));
    }

    @Test
    void uneCommandeSansPaiementRepond404() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "2.00");

        mockMvc.perform(get("/api/paiements/commande/{commandeId}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(
                        "Aucun paiement n'existe pour la commande : " + commande.id()));
    }

    @Test
    void unPaiementInconnuRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/paiements/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Paiement introuvable avec l'id : 999999"));
    }

    // --- Fabriques locales -------------------------------------------------

    private CommandeResponse creerCommande(Acheteur acheteur, String quantite) throws Exception {
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of(Map.of("recolteId", tomate.getId(), "quantite", quantite)));

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

    private Paiement creerPaiementEnAttente(Acheteur acheteur) throws Exception {
        CommandeResponse commande = creerCommande(acheteur, "2.00");

        Paiement paiement = new Paiement();
        paiement.setCommande(commandeRepository.findById(commande.id()).orElseThrow());
        paiement.setReferenceTransaction("SIMU-TEST-PAIEMENT");
        paiement.setMontant(new BigDecimal("900.00"));
        paiement.setMoyenPaiement(MoyenPaiement.ORANGE_MONEY);
        paiement.setStatut(StatutPaiement.EN_ATTENTE);

        return paiementRepository.save(paiement);
    }
}
