package com.sunurecolte.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exposition du paiement dans la réponse d'une commande (LOT P2a).
 *
 * Ce que ces tests vérifient, sur HTTP réel et contre PostgreSQL :
 * - une commande sans paiement porte `statutPaiement` et `moyenPaiement` à `null`,
 *   ces champs sont présents dans le corps de réponse, pas absents ;
 * - après un paiement initié, la commande expose REUSSI et le moyen réellement choisi ;
 * - la liste, en vue acheteur comme en vue producteur, porte le paiement de CHAQUE commande :
 *   une commande payée et une commande non payée coexistent dans la même réponse ;
 * - l'annulation d'une commande payée expose REMBOURSE, l'annulation sans paiement reste à `null` ;
 * - les droits ne bougent pas : un acheteur étranger reçoit 403 et aucune information de
 *   paiement ne fuit par les routes `/api/paiements/*`.
 */
class CommandePaiementResponseApiTest extends IntegrationTestSupport {

    // --- Une commande sans paiement : null explicite -------------------------

    @Test
    void uneCommandeSansPaiementExposeUnStatutEtUnMoyenDePaiementNuls() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");

        JsonNode relue = lireJson(mockMvc.perform(get("/api/commandes/{id}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        assertThat(relue.has("statutPaiement")).isTrue();
        assertThat(relue.path("statutPaiement").isNull()).isTrue();
        assertThat(relue.has("moyenPaiement")).isTrue();
        assertThat(relue.path("moyenPaiement").isNull()).isTrue();
    }

    // --- Après paiement : le statut simulé et le moyen choisi ----------------

    @Test
    void apresUnPaiementLaCommandeExposeLeStatutReussiEtLeMoyenChoisi() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");

        payer(acheteur, commande.id(), "ORANGE_MONEY");

        JsonNode relue = lireJson(mockMvc.perform(get("/api/commandes/{id}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        assertThat(relue.path("statutPaiement").asText()).isEqualTo("REUSSI");
        assertThat(relue.path("moyenPaiement").asText()).isEqualTo("ORANGE_MONEY");
    }

    // --- La liste, vue acheteur ----------------------------------------------

    @Test
    void laListeDeLAcheteurPorteLeStatutDePaiementDeChaqueCommande() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse nonPayee = creerCommandeAvec(acheteur, "LIVRAISON", producteur);
        CommandeResponse payee = creerCommandeAvec(acheteur, "LIVRAISON", producteur);

        payer(acheteur, payee.id(), "WAVE");

        JsonNode liste = lireJson(mockMvc.perform(get("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        assertThat(liste.isArray()).isTrue();
        assertThat(commandeDeLaListe(liste, payee.id()).path("statutPaiement").asText())
                .isEqualTo("REUSSI");
        assertThat(commandeDeLaListe(liste, payee.id()).path("moyenPaiement").asText())
                .isEqualTo("WAVE");
        assertThat(commandeDeLaListe(liste, nonPayee.id()).path("statutPaiement").isNull()).isTrue();
        assertThat(commandeDeLaListe(liste, nonPayee.id()).path("moyenPaiement").isNull()).isTrue();
    }

    // --- La liste, vue producteur -------------------------------------------

    @Test
    void laListeDuProducteurPorteLeStatutDePaiementDeChaqueCommande() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        CommandeResponse nonPayee = creerCommandeAvec(acheteur, "LIVRAISON", producteur);
        CommandeResponse payee = creerCommandeAvec(acheteur, "RETRAIT", producteur);

        payer(acheteur, payee.id(), "WAVE");

        JsonNode liste = lireJson(mockMvc.perform(get("/api/commandes")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        assertThat(liste.isArray()).isTrue();
        assertThat(commandeDeLaListe(liste, payee.id()).path("statutPaiement").asText())
                .isEqualTo("REUSSI");
        assertThat(commandeDeLaListe(liste, nonPayee.id()).path("statutPaiement").isNull()).isTrue();
    }

    // --- Annulation ----------------------------------------------------------

    @Test
    void lAnnulationDuneCommandePayeeExposeLeRemboursementSimule() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");
        payer(acheteur, commande.id(), "WAVE");

        JsonNode annulee = annuler(commande.id(), acheteur.getUtilisateur());

        assertThat(annulee.path("statut").asText()).isEqualTo("ANNULEE");
        assertThat(annulee.path("statutPaiement").asText()).isEqualTo("REMBOURSE");
        assertThat(annulee.path("moyenPaiement").asText()).isEqualTo("WAVE");

        JsonNode relue = lireJson(mockMvc.perform(get("/api/commandes/{id}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(relue.path("statutPaiement").asText()).isEqualTo("REMBOURSE");
    }

    @Test
    void lAnnulationSansPaiementLaisseLeStatutDePaiementANul() throws Exception {
        Acheteur acheteur = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "RETRAIT");

        JsonNode annulee = annuler(commande.id(), acheteur.getUtilisateur());

        assertThat(annulee.path("statut").asText()).isEqualTo("ANNULEE");
        assertThat(annulee.path("statutPaiement").isNull()).isTrue();
        assertThat(annulee.path("moyenPaiement").isNull()).isTrue();
    }

    // --- Les droits ne changent pas, rien ne fuit -----------------------------

    @Test
    void unAcheteurEtrangerNeVoitNiLaCommandeNiSonPaiement() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Acheteur etranger = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");
        payer(acheteur, commande.id(), "WAVE");

        mockMvc.perform(get("/api/commandes/{id}", commande.id())
                        .with(avecJetonDe(etranger.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.statutPaiement").doesNotExist())
                .andExpect(jsonPath("$.moyenPaiement").doesNotExist())
                .andExpect(jsonPath("$.referenceTransaction").doesNotExist());

        JsonNode liste = lireJson(mockMvc.perform(get("/api/commandes")
                        .with(avecJetonDe(etranger.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(commandeDeLaListe(liste, commande.id())).isNull();
    }

    @Test
    void aucuneInformationDePaiementNeFuitParLesRoutesDePaiement() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Acheteur etranger = creerAcheteur();
        CommandeResponse commande = creerCommande(acheteur, "LIVRAISON");
        Long paiementId = payer(acheteur, commande.id(), "WAVE").get("id").asLong();

        mockMvc.perform(get("/api/paiements/commande/{commandeId}", commande.id())
                        .with(avecJetonDe(etranger.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.referenceTransaction").doesNotExist())
                .andExpect(jsonPath("$.montant").doesNotExist());

        mockMvc.perform(get("/api/paiements/{id}", paiementId)
                        .with(avecJetonDe(etranger.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.referenceTransaction").doesNotExist());

        // Le propriétaire, lui, voit bien son paiement par la route dédiée.
        mockMvc.perform(get("/api/paiements/commande/{commandeId}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("REUSSI"))
                .andExpect(jsonPath("$.moyenPaiement").value("WAVE"));
    }

    // --- Fabriques locales ---------------------------------------------------

    private JsonNode payer(Acheteur acheteur, Long commandeId, String moyenPaiement) throws Exception {
        String reponse = mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commandeId
                                + ", \"moyenPaiement\": \"" + moyenPaiement + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("REUSSI"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return lireJson(reponse);
    }

    private JsonNode annuler(Long commandeId, Utilisateur demandeur) throws Exception {
        return lireJson(mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(demandeur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"ANNULEE\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private CommandeResponse creerCommande(Acheteur acheteur, String modeReception) throws Exception {
        return creerCommandeAvec(acheteur, modeReception, creerProducteur());
    }

    /** Commande à une ligne (2,00 unités) construite sur une récolte du producteur donné. */
    private CommandeResponse creerCommandeAvec(Acheteur acheteur, String modeReception, Producteur producteur)
            throws Exception {
        Recolte recolte = creerRecolte(producteur, "Tomate", "100.00", "450.00");
        List<Map<String, Object>> lignes = new ArrayList<>();
        lignes.add(Map.of("recolteId", recolte.getId(), "quantite", "2.00"));

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

    private JsonNode lireJson(String contenu) throws Exception {
        return objectMapper.readTree(contenu);
    }

    /** Commande portant cet identifiant dans un tableau de réponses, ou `null` si absente. */
    private JsonNode commandeDeLaListe(JsonNode liste, Long id) {
        for (JsonNode commande : liste) {
            if (commande.path("id").asLong() == id) {
                return commande;
            }
        }
        return null;
    }
}
