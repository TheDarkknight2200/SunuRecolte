package com.sunurecolte.api;

import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/commandes : création avec calcul serveur,
 * contrôle du stock, filtrage et transitions de statut.
 */
class CommandeApiTest extends IntegrationTestSupport {

    // --- Création ----------------------------------------------------------

    @Test
    void creerUneCommandeValideRepond201AvecLeTotalCalculeParLeServeur() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("total", "1.00");
        corps.put("lignes", List.of(Map.of(
                "recolteId", tomate.getId(),
                "quantite", "2.00",
                "prixUnitaire", "1.00",
                "sousTotal", "2.00")));

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statut").value("EN_ATTENTE"))
                .andExpect(jsonPath("$.total").value(900.00))
                .andExpect(jsonPath("$.lignes[0].prixUnitaire").value(450.00))
                .andExpect(jsonPath("$.lignes[0].sousTotal").value(900.00));
    }

    @Test
    void creerUneCommandeSansLigneRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of());

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.lignes").exists());
    }

    @Test
    void creerUneCommandeAvecUnStockInsuffisantRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "5.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of(Map.of("recolteId", tomate.getId(), "quantite", "6.00")));

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Stock insuffisant pour « Tomate » : disponible 5.00, demandé 6.00."));
    }

    @Test
    void creerUneCommandeAvecUnAcheteurInconnuRepond404() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", 999_999L);
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of(Map.of("recolteId", tomate.getId(), "quantite", "1.00")));

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Acheteur introuvable avec l'id : 999999"));
    }

    @Test
    void creerUneLivraisonSansAdresseRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "LIVRAISON");
        corps.put("lignes", List.of(Map.of("recolteId", tomate.getId(), "quantite", "1.00")));

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Une livraison exige une adresse et un numéro de téléphone de livraison."));
    }

    // --- Consultation ------------------------------------------------------

    @Test
    void consulterUneCommandeRepond200AvecSesLignes() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");

        mockMvc.perform(get("/api/commandes/{id}", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(commande.id()))
                .andExpect(jsonPath("$.acheteurId").value(acheteur.getId()))
                .andExpect(jsonPath("$.nomAcheteur").value("Awa Diop"))
                .andExpect(jsonPath("$.lignes[0].produit").value("Tomate"))
                .andExpect(jsonPath("$.lignes[0].unite").value("kg"));
    }

    @Test
    void laListeFiltreeParAcheteurRepond200() throws Exception {
        Acheteur premier = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");
        creerCommandeViaApi(premier, tomate, "2.00");

        mockMvc.perform(get("/api/commandes")
                        .with(avecJetonDe(premier.getUtilisateur()))
                        .param("acheteurId", String.valueOf(premier.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].acheteurId").value(premier.getId()));
    }

    @Test
    void uneCommandeInconnueRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/commandes/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Commande introuvable avec l'id : 999999"));
    }

    // --- Transitions de statut ---------------------------------------------

    @Test
    void changerLeStatutDeLaCommandeRepond200() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");

        mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"CONFIRMEE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("CONFIRMEE"));
    }

    @Test
    void uneTransitionInterditeRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");

        mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"LIVREE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Transition de statut interdite : EN_ATTENTE vers LIVREE."));
    }

    @Test
    void unStatutInconnuRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");

        mockMvc.perform(patch("/api/commandes/{id}/statut", commande.id())
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"EXPEDIEE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Requête invalide : corps malformé ou valeur non autorisée."));
    }

    // --- Fabriques locales -------------------------------------------------

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, Recolte recolte, String quantite)
            throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of(Map.of("recolteId", recolte.getId(), "quantite", quantite)));

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
