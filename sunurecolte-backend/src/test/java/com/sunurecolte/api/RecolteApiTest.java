package com.sunurecolte.api;

import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.LigneCommande;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/recoltes : codes de statut, corps JSON
 * et contrat d'erreur, à travers la vraie chaîne controller → service → repository.
 */
class RecolteApiTest extends IntegrationTestSupport {

    // --- Consultation ------------------------------------------------------

    @Test
    void laListeDesRecoltesRepond200() throws Exception {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);
        creerRecolte(producteur, "Tomate", "100.00", "450.00");

        mockMvc.perform(get("/api/recoltes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void uneRecolteExistanteRepond200AvecSesChamps() throws Exception {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        mockMvc.perform(get("/api/recoltes/{id}", recolte.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(recolte.getId()))
                .andExpect(jsonPath("$.produit").value("Tomate"))
                .andExpect(jsonPath("$.nomProducteur").value("Awa Diop"))
                .andExpect(jsonPath("$.localisationProducteur").value("Rufisque"))
                .andExpect(jsonPath("$.statut").value("DISPONIBLE"))
                .andExpect(jsonPath("$.prixUnitaire").value(450.00));
    }

    @Test
    void uneRecolteInconnueRepond404() throws Exception {
        mockMvc.perform(get("/api/recoltes/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.statut").value(404))
                .andExpect(jsonPath("$.message").value("Recolte introuvable avec l'id : 999999"));
    }

    @Test
    void unFiltreDeStatutInconnuRepond400() throws Exception {
        mockMvc.perform(get("/api/recoltes").param("statut", "INCONNU"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Valeur invalide pour le paramètre « statut »."));
    }

    // --- Création ----------------------------------------------------------

    @Test
    void creerUneRecolteValideRepond201() throws Exception {
        Producteur producteur = creerProducteur();

        Map<String, Object> corps = new HashMap<>();
        corps.put("producteurId", producteur.getId());
        corps.put("produit", "Tomate");
        corps.put("quantiteDisponible", "100.00");
        corps.put("unite", "kg");
        corps.put("prixUnitaire", "450.00");

        mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.produit").value("Tomate"))
                .andExpect(jsonPath("$.statut").value("DISPONIBLE"))
                .andExpect(jsonPath("$.prixUnitaire").value(450.00));
    }

    @Test
    void creerUneRecolteAvecUnProducteurInconnuRepond404() throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("producteurId", 999_999L);
        corps.put("produit", "Tomate");
        corps.put("quantiteDisponible", "100.00");
        corps.put("unite", "kg");
        corps.put("prixUnitaire", "450.00");

        mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Producteur introuvable avec l'id : 999999"));
    }

    @Test
    void creerUneRecolteInvalideRepond400AvecLeDetailDesChamps() throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("produit", " ");
        corps.put("quantiteDisponible", "0.00");
        corps.put("unite", "kg");
        corps.put("prixUnitaire", "-5.00");

        mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Données invalides"))
                .andExpect(jsonPath("$.erreurs.producteurId").exists())
                .andExpect(jsonPath("$.erreurs.produit").exists())
                .andExpect(jsonPath("$.erreurs.quantiteDisponible").exists())
                .andExpect(jsonPath("$.erreurs.prixUnitaire").exists());
    }

    @Test
    void creerUneRecolteAvecUnCorpsMalformeRepond400SansDetailInterne() throws Exception {
        mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produit\": \"Tomate\", "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Requête invalide : corps malformé ou valeur non autorisée."));
    }

    // --- Modification ------------------------------------------------------

    @Test
    void modifierUneRecolteRepond200() throws Exception {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("producteurId", producteur.getId());
        corps.put("produit", "Tomate cerise");
        corps.put("quantiteDisponible", "80.00");
        corps.put("quantiteMin", "5.00");
        corps.put("quantiteMax", "50.00");
        corps.put("unite", "kg");
        corps.put("prixUnitaire", "500.00");

        mockMvc.perform(put("/api/recoltes/{id}", recolte.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.produit").value("Tomate cerise"))
                .andExpect(jsonPath("$.prixUnitaire").value(500.00))
                .andExpect(jsonPath("$.quantiteDisponible").value(80.00));
    }

    @Test
    void modifierLeProducteurDUneRecolteRepond400() throws Exception {
        Producteur producteur = creerProducteur();
        Producteur autre = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        Map<String, Object> corps = new HashMap<>();
        corps.put("producteurId", autre.getId());
        corps.put("produit", "Tomate");
        corps.put("quantiteDisponible", "100.00");
        corps.put("unite", "kg");
        corps.put("prixUnitaire", "450.00");

        mockMvc.perform(put("/api/recoltes/{id}", recolte.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Le producteur d'une récolte ne peut pas être modifié."));
    }

    // --- Suppression -------------------------------------------------------

    @Test
    void supprimerUneRecolteNonCommandeeRepond204() throws Exception {
        Recolte recolte = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        mockMvc.perform(delete("/api/recoltes/{id}", recolte.getId()))
                .andExpect(status().isNoContent());

        assertThat(recolteRepository.findById(recolte.getId())).isEmpty();
    }

    @Test
    void supprimerUneRecolteUtiliseeDansUneCommandeRepond400() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Recolte recolte = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");
        creerCommandePour(recolte, acheteur);

        mockMvc.perform(delete("/api/recoltes/{id}", recolte.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Cette récolte est utilisée dans une commande et ne peut pas être supprimée."));

        assertThat(recolteRepository.findById(recolte.getId())).isPresent();
    }

    // --- Contrat d'erreur générique ----------------------------------------

    @Test
    void uneUrlInconnueRepond404SansDetailInterne() throws Exception {
        mockMvc.perform(get("/api/route-inexistante"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Aucune ressource disponible pour cette URL."));
    }

    @Test
    void uneMethodeHttpNonAutoriseeRepond405() throws Exception {
        mockMvc.perform(delete("/api/recoltes"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.message").value("Méthode HTTP non autorisée pour cette URL."));
    }

    @Test
    void unTypeDeContenuNonSupporteRepond415() throws Exception {
        mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("produit=Tomate"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message")
                        .value("Type de contenu non supporté : utilisez application/json."));
    }

    // --- Fabrique locale ---------------------------------------------------

    private void creerCommandePour(Recolte recolte, Acheteur acheteur) {
        Commande commande = new Commande();
        commande.setAcheteur(acheteur);
        commande.setTotal(new BigDecimal("450.00"));
        commande.setModeReception(ModeReception.RETRAIT);

        LigneCommande ligne = new LigneCommande();
        ligne.setCommande(commande);
        ligne.setRecolte(recolte);
        ligne.setQuantite(new BigDecimal("1.00"));
        ligne.setPrixUnitaire(recolte.getPrixUnitaire());
        ligne.setSousTotal(new BigDecimal("450.00"));
        commande.getLignes().add(ligne);

        commandeRepository.save(commande);
    }
}
