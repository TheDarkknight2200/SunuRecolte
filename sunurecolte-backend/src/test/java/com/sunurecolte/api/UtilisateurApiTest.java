package com.sunurecolte.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP de l'administration des comptes : GET /api/utilisateurs (A1) et
 * PATCH /api/utilisateurs/{id}/actif (A2), à travers la vraie chaîne
 * SecurityConfig → controller → service → repository → PostgreSQL.
 *
 * La base de test est une base réelle, déjà peuplée par les précédents runs : les
 * assertions portent donc sur les comptes créés par le test (repérés par leur email ou
 * leur identifiant uniques), jamais sur une taille de liste.
 */
class UtilisateurApiTest extends IntegrationTestSupport {

    // --- A1 : liste des utilisateurs ---------------------------------------

    @Test
    void laListeDesUtilisateursSansJetonRepond401() throws Exception {
        mockMvc.perform(get("/api/utilisateurs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statut").value(401))
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void laListeDesUtilisateursParUnAcheteurRepond403() throws Exception {
        Utilisateur acheteur = creerAcheteur().getUtilisateur();

        mockMvc.perform(get("/api/utilisateurs").with(avecJetonDe(acheteur)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette action."));
    }

    @Test
    void laListeDesUtilisateursParUnProducteurRepond403() throws Exception {
        Utilisateur producteur = creerProducteur().getUtilisateur();

        mockMvc.perform(get("/api/utilisateurs").with(avecJetonDe(producteur)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403));
    }

    @Test
    void lAdministrateurObtientLaListeSansAucunMotDePasse() throws Exception {
        Utilisateur admin = creerAdministrateur();
        Utilisateur vise = creerUtilisateur(Role.ACHETEUR);

        MvcResult resultat = mockMvc.perform(get("/api/utilisateurs")
                        .with(avecJetonDe(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        String corps = resultat.getResponse().getContentAsString();
        List<Map<String, Object>> lignes =
                objectMapper.readValue(corps, new TypeReference<List<Map<String, Object>>>() {});

        Map<String, Object> ligneVisee = lignes.stream()
                .filter(ligne -> vise.getEmail().equals(ligne.get("email")))
                .findFirst()
                .orElseThrow();
        assertThat(ligneVisee.keySet()).containsExactlyInAnyOrder(
                "id", "nom", "prenom", "email", "telephone", "role", "dateCreation", "actif");
        assertThat(ligneVisee.get("role")).isEqualTo("ACHETEUR");
        assertThat(ligneVisee.get("actif")).isEqualTo(true);

        // Aucune fuite : ni le nom du champ, ni l'empreinte stockée, ni un hash BCrypt.
        assertThat(corps).doesNotContain("motDePasse", "mot_de_passe", "password",
                "empreinte-de-mot-de-passe-de-test", "$2a$");
    }

    @Test
    void leFiltreDeRoleNeRenvoieQueCeRole() throws Exception {
        Utilisateur admin = creerAdministrateur();
        Utilisateur producteur = creerUtilisateur(Role.PRODUCTEUR);
        creerUtilisateur(Role.ACHETEUR);

        MvcResult resultat = mockMvc.perform(get("/api/utilisateurs")
                        .with(avecJetonDe(admin))
                        .param("role", "PRODUCTEUR"))
                .andExpect(status().isOk())
                .andReturn();

        List<Map<String, Object>> lignes = objectMapper.readValue(
                resultat.getResponse().getContentAsString(),
                new TypeReference<List<Map<String, Object>>>() {});

        assertThat(lignes).isNotEmpty();
        assertThat(lignes).allSatisfy(ligne -> assertThat(ligne.get("role")).isEqualTo("PRODUCTEUR"));
        assertThat(lignes).anyMatch(ligne -> estLeMeme(ligne.get("id"), producteur.getId()));
    }

    @Test
    void unRoleInconnuEnFiltreRepond400() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/utilisateurs")
                        .with(avecJetonDe(admin))
                        .param("role", "SUPERVISOR"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Valeur invalide pour le paramètre « role »."));
    }

    // --- A2 : activer / désactiver un compte -------------------------------

    @Test
    void laDesactivationSansJetonRepond401() throws Exception {
        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void laDesactivationParUnAcheteurRepond403() throws Exception {
        Utilisateur cible = creerUtilisateur(Role.PRODUCTEUR);
        Utilisateur acheteur = creerAcheteur().getUtilisateur();

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", cible.getId())
                        .with(avecJetonDe(acheteur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403));

        assertThat(utilisateurRepository.findById(cible.getId()))
                .get()
                .matches(Utilisateur::isActif);
    }

    @Test
    void laDesactivationParUnProducteurRepond403() throws Exception {
        Utilisateur cible = creerUtilisateur(Role.ACHETEUR);
        Utilisateur producteur = creerProducteur().getUtilisateur();

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", cible.getId())
                        .with(avecJetonDe(producteur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void lAdministrateurDesactiveUnComptePuisLeReactive() throws Exception {
        Utilisateur admin = creerAdministrateur();
        Producteur producteur = creerProducteur();
        creerRecolte(producteur, "Tomate", "10.00", "500.00");

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", producteur.getUtilisateur().getId())
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(producteur.getUtilisateur().getId()))
                .andExpect(jsonPath("$.actif").value(false));

        // Le jeton déjà émis n'ouvre plus rien : le filtre relit le compte en base.
        mockMvc.perform(get("/api/recoltes/mes-recoltes")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", producteur.getUtilisateur().getId())
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actif").value(true));

        // Compte de nouveau utilisable avec le même jeton.
        mockMvc.perform(get("/api/recoltes/mes-recoltes")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk());
    }

    @Test
    void lAdministrateurNePeutPasSeDesactiverLuiMeme() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", admin.getId())
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Vous ne pouvez pas modifier l'état de votre propre compte."));

        assertThat(utilisateurRepository.findById(admin.getId()))
                .get()
                .matches(Utilisateur::isActif);
    }

    @Test
    void laDesactivationDUnUtilisateurInexistantRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", 999_999L)
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actif\": false}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Utilisateur introuvable avec l'id : 999999"));
    }

    @Test
    void lEtatActifManquantRepond400AvecLeDetailDuChamp() throws Exception {
        Utilisateur admin = creerAdministrateur();
        Utilisateur cible = creerUtilisateur(Role.ACHETEUR);

        mockMvc.perform(patch("/api/utilisateurs/{id}/actif", cible.getId())
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Données invalides"))
                .andExpect(jsonPath("$.erreurs.actif")
                        .value("L'état actif est obligatoire"));

        assertThat(utilisateurRepository.findById(cible.getId()))
                .get()
                .matches(Utilisateur::isActif);
    }

    /**
     * Jackson relit un petit nombre en `Integer` : la comparaison d'identifiants passe
     * par `longValue()` au lieu de `equals`, qui serait faux entre `Integer` et `Long`.
     */
    private boolean estLeMeme(Object identifiantJson, Long identifiantAttendu) {
        return identifiantJson instanceof Number nombre
                && nombre.longValue() == identifiantAttendu;
    }
}
