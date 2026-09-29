package com.sunurecolte.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sunurecolte.prixmarche.entity.PrixMarche;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/prix-marche : consultation publique (les deux GET)
 * et écriture réservée à l'administrateur (POST, PUT, DELETE).
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

    // --- Écriture : rôles --------------------------------------------------

    @Test
    void creerUnPrixSansJetonRepond401() throws Exception {
        mockMvc.perform(post("/api/prix-marche")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps("Carotte-" + suffixeUnique()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void creerUnPrixParUnAcheteurRepond403() throws Exception {
        Utilisateur acheteur = creerAcheteur().getUtilisateur();

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(acheteur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps("Carotte-" + suffixeUnique()))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette action."));
    }

    @Test
    void creerUnPrixParUnProducteurRepond403() throws Exception {
        Utilisateur producteur = creerProducteur().getUtilisateur();

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(producteur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps("Carotte-" + suffixeUnique()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void modifierUnPrixParUnProducteurRepond403() throws Exception {
        PrixMarche prix = creerPrixMarche("Mil-" + suffixeUnique());

        mockMvc.perform(put("/api/prix-marche/{id}", prix.getId())
                        .with(avecJetonDe(creerProducteur().getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps("Mil-" + suffixeUnique()))))
                .andExpect(status().isForbidden());

        assertThat(prixMarcheRepository.findById(prix.getId())).isPresent();
    }

    @Test
    void supprimerUnPrixParUnAcheteurRepond403() throws Exception {
        PrixMarche prix = creerPrixMarche("Mil-" + suffixeUnique());

        mockMvc.perform(delete("/api/prix-marche/{id}", prix.getId())
                        .with(avecJetonDe(creerAcheteur().getUtilisateur())))
                .andExpect(status().isForbidden());

        assertThat(prixMarcheRepository.findById(prix.getId())).isPresent();
    }

    // --- Écriture : administrateur ----------------------------------------

    @Test
    void lAdministrateurCreeUnPrixRepond201() throws Exception {
        String produit = "Carotte-" + suffixeUnique();

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps(produit))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.produit").value(produit))
                .andExpect(jsonPath("$.unite").value("kg"))
                .andExpect(jsonPath("$.prixMoyen").value(350.00))
                .andExpect(jsonPath("$.marcheReference").value("Marche de Thiaroye"))
                .andExpect(jsonPath("$.dateMiseAJour").exists());

        // La lecture publique reprend immédiatement la ligne créée.
        mockMvc.perform(get("/api/prix-marche"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.produit == '" + produit + "')]").isNotEmpty());
    }

    @Test
    void lAdministrateurModifieUnPrixRepond200() throws Exception {
        String produit = "Mil-" + suffixeUnique();
        PrixMarche prix = creerPrixMarche(produit);

        Map<String, Object> corps = corps(produit);
        corps.put("prixMoyen", "410.50");
        corps.put("marcheReference", "Marche de Ouakam");

        mockMvc.perform(put("/api/prix-marche/{id}", prix.getId())
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(prix.getId()))
                .andExpect(jsonPath("$.prixMoyen").value(410.50))
                .andExpect(jsonPath("$.marcheReference").value("Marche de Ouakam"));

        mockMvc.perform(get("/api/prix-marche/{id}", prix.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prixMoyen").value(410.50));
    }

    @Test
    void lAdministrateurSupprimeUnPrixRepond204() throws Exception {
        PrixMarche prix = creerPrixMarche("Mil-" + suffixeUnique());

        mockMvc.perform(delete("/api/prix-marche/{id}", prix.getId())
                        .with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isNoContent());

        assertThat(prixMarcheRepository.findById(prix.getId())).isEmpty();
    }

    @Test
    void lAdministrateurModifieUnPrixInconnuRepond404() throws Exception {
        mockMvc.perform(put("/api/prix-marche/{id}", 999_999L)
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps("Mil-" + suffixeUnique()))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("PrixMarche introuvable avec l'id : 999999"));
    }

    @Test
    void lAdministrateurSupprimeUnPrixInconnuRepond404() throws Exception {
        mockMvc.perform(delete("/api/prix-marche/{id}", 999_999L)
                        .with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("PrixMarche introuvable avec l'id : 999999"));
    }

    // --- Validations -------------------------------------------------------

    @Test
    void unPrixInvalideRepond400AvecLeDetailDesChamps() throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("produit", " ");
        corps.put("prixMoyen", "0.00");

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Données invalides"))
                .andExpect(jsonPath("$.erreurs.produit")
                        .value("Le produit est obligatoire"))
                .andExpect(jsonPath("$.erreurs.unite")
                        .value("L'unité est obligatoire"))
                .andExpect(jsonPath("$.erreurs.prixMoyen")
                        .value("Le prix moyen doit être positif"));
    }

    @Test
    void unPrixTropLongRepond400SurLesDeuxChampsTexte() throws Exception {
        Map<String, Object> corps = corps("Carotte-" + suffixeUnique());
        corps.put("produit", "x".repeat(151));
        corps.put("unite", "k".repeat(31));
        corps.put("marcheReference", "m".repeat(151));

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.produit")
                        .value("Le produit ne peut pas dépasser 150 caractères"))
                .andExpect(jsonPath("$.erreurs.unite").exists())
                .andExpect(jsonPath("$.erreurs.marcheReference")
                        .value("Le marché de référence ne peut pas dépasser 150 caractères"));
    }

    @Test
    void unPrixHorsPrecisionDuSchemaRepond400() throws Exception {
        Map<String, Object> corps = corps("Carotte-" + suffixeUnique());
        corps.put("prixMoyen", "100000000.00");

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.prixMoyen")
                        .value("Le prix moyen dépasse la précision autorisée"));
    }

    @Test
    void unCorpsMalformeRepond400SansDetailInterne() throws Exception {
        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produit\": \"Carotte\", "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Requête invalide : corps malformé ou valeur non autorisée."));
    }

    /**
     * Le schéma approuvé ne porte aucune contrainte d'unicité sur `prix_marche` : deux lignes
     * peuvent coexister pour un même produit (plusieurs marchés de référence). Ce test acte le
     * comportement réel de la base, il n'invente pas une règle que le domaine ne pose pas.
     */
    @Test
    void deuxLignesPourUnMemeProduitSontAccepteesFauteDeContrainte() throws Exception {
        String produit = "Carotte-" + suffixeUnique();
        Utilisateur admin = creerAdministrateur();

        for (String marche : new String[]{"Marche de Thiaroye", "Marche de Ouakam"}) {
            Map<String, Object> corps = corps(produit);
            corps.put("marcheReference", marche);
            mockMvc.perform(post("/api/prix-marche")
                            .with(avecJetonDe(admin))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(corps)))
                    .andExpect(status().isCreated());
        }

        MvcResult resultat = mockMvc.perform(get("/api/prix-marche"))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> lignes = objectMapper.readValue(
                resultat.getResponse().getContentAsString(),
                new TypeReference<List<Map<String, Object>>>() {});

        List<Map<String, Object>> doublons = lignes.stream()
                .filter(ligne -> produit.equals(ligne.get("produit")))
                .toList();
        assertThat(doublons).hasSize(2);
        assertThat(doublons).extracting(ligne -> ligne.get("marcheReference"))
                .containsExactlyInAnyOrder("Marche de Thiaroye", "Marche de Ouakam");
    }

    /**
     * `dateMiseAJour` n'appartient pas au contrat d'écriture : une valeur envoyée par le client
     * est ignorée, l'entité garde la sienne (@PrePersist / @PreUpdate).
     */
    @Test
    void laDateDeMiseAJourNeVientJamaisDuClient() throws Exception {
        Map<String, Object> corps = corps("Carotte-" + suffixeUnique());
        corps.put("dateMiseAJour", "2000-01-01T00:00:00");

        mockMvc.perform(post("/api/prix-marche")
                        .with(avecJetonDe(creerAdministrateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dateMiseAJour").exists())
                .andExpect(jsonPath("$.dateMiseAJour").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.startsWith("2000-"))));
    }

    // --- Fabrique locale ---------------------------------------------------

    private Map<String, Object> corps(String produit) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("produit", produit);
        corps.put("unite", "kg");
        corps.put("prixMoyen", "350.00");
        corps.put("marcheReference", "Marche de Thiaroye");
        return corps;
    }

    private PrixMarche creerPrixMarche(String produit) {
        PrixMarche prix = new PrixMarche();
        prix.setProduit(produit);
        prix.setUnite("kg");
        prix.setPrixMoyen(new BigDecimal("275.00"));
        prix.setMarcheReference("Marche de Thiaroye");
        return prixMarcheRepository.save(prix);
    }
}
