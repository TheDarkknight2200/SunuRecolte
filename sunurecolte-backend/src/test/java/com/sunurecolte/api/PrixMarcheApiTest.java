package com.sunurecolte.api;

import com.sunurecolte.prixmarche.entity.PrixMarche;
import com.sunurecolte.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/prix-marche (consultation seule).
 * Le modèle PrixMarche n'a pas de champ filière : aucun filtre par filière n'est exposé.
 */
class PrixMarcheApiTest extends IntegrationTestSupport {

    @Test
    void laListeDesPrixMarcheRepond200() throws Exception {
        String produit = "Arachide-" + suffixeUnique();
        creerPrixMarche(produit);

        mockMvc.perform(get("/api/prix-marche"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.produit == '" + produit + "')]").isNotEmpty());
    }

    @Test
    void consulterUnPrixMarcheRepond200() throws Exception {
        PrixMarche prix = creerPrixMarche("Mil");

        mockMvc.perform(get("/api/prix-marche/{id}", prix.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.produit").value("Mil"))
                .andExpect(jsonPath("$.unite").value("kg"))
                .andExpect(jsonPath("$.prixMoyen").value(275.00))
                .andExpect(jsonPath("$.marcheReference").value("Marche de Thiaroye"))
                .andExpect(jsonPath("$.dateMiseAJour").exists());
    }

    @Test
    void unPrixMarcheInconnuRepond404() throws Exception {
        mockMvc.perform(get("/api/prix-marche/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("PrixMarche introuvable avec l'id : 999999"));
    }

    // --- Fabrique locale ---------------------------------------------------

    private PrixMarche creerPrixMarche(String produit) {
        PrixMarche prix = new PrixMarche();
        prix.setProduit(produit);
        prix.setUnite("kg");
        prix.setPrixMoyen(new BigDecimal("275.00"));
        prix.setMarcheReference("Marche de Thiaroye");
        return prixMarcheRepository.save(prix);
    }
}
