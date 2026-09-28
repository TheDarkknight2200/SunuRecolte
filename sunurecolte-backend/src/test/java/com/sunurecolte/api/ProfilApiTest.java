package com.sunurecolte.api;

import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints de profils : /api/utilisateurs, /api/producteurs et /api/acheteurs.
 * Vérifie notamment qu'aucune donnée sensible (mot de passe) n'est exposée.
 */
class ProfilApiTest extends IntegrationTestSupport {

    // --- Utilisateurs ------------------------------------------------------

    @Test
    void consulterUnUtilisateurRepond200SansMotDePasse() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.PRODUCTEUR);

        mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(utilisateur.getId()))
                .andExpect(jsonPath("$.nom").value("Diop"))
                .andExpect(jsonPath("$.prenom").value("Awa"))
                .andExpect(jsonPath("$.role").value("PRODUCTEUR"))
                .andExpect(jsonPath("$.email").value(utilisateur.getEmail()))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());
    }

    @Test
    void unUtilisateurInconnuRepond404() throws Exception {
        mockMvc.perform(get("/api/utilisateurs/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Utilisateur introuvable avec l'id : 999999"));
    }

    // --- Producteurs -------------------------------------------------------

    @Test
    void consulterUnProducteurRepond200() throws Exception {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(get("/api/producteurs/{id}", producteur.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.utilisateurId").value(producteur.getUtilisateur().getId()))
                .andExpect(jsonPath("$.filiere").value("MARAICHAGE"))
                .andExpect(jsonPath("$.localisationExploitation").value("Rufisque"))
                .andExpect(jsonPath("$.email").value(producteur.getUtilisateur().getEmail()));
    }

    @Test
    void modifierUnProducteurRepond200() throws Exception {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(put("/api/producteurs/{id}", producteur.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"filiere": "ELEVAGE", "localisationExploitation": "Thies",
                                 "description": "Exploitation familiale"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filiere").value("ELEVAGE"))
                .andExpect(jsonPath("$.localisationExploitation").value("Thies"))
                .andExpect(jsonPath("$.description").value("Exploitation familiale"));
    }

    @Test
    void modifierUnProducteurSansFiliereRepond400() throws Exception {
        Producteur producteur = creerProducteur();

        mockMvc.perform(put("/api/producteurs/{id}", producteur.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"localisationExploitation\": \"Thies\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.filiere").exists());
    }

    @Test
    void unProducteurInconnuRepond404() throws Exception {
        mockMvc.perform(get("/api/producteurs/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Producteur introuvable avec l'id : 999999"));
    }

    // --- Acheteurs ---------------------------------------------------------

    @Test
    void consulterUnAcheteurRepond200() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(get("/api/acheteurs/{id}", acheteur.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.utilisateurId").value(acheteur.getUtilisateur().getId()))
                .andExpect(jsonPath("$.typeAcheteur").value("RESTAURATEUR"))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());
    }

    @Test
    void unAcheteurInconnuRepond404() throws Exception {
        mockMvc.perform(get("/api/acheteurs/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Acheteur introuvable avec l'id : 999999"));
    }
}
