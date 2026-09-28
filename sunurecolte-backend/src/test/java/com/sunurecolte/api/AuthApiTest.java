package com.sunurecolte.api;

import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.dto.AuthResponse;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints publics /api/auth : inscription et connexion.
 *
 * Les comptes sont créés via l'API : les mots de passe sont donc réellement
 * hachés par le PasswordEncoder de l'application, comme en production.
 * Contre-vérifications faites en base (aucun mot de passe en clair, profil créé).
 */
class AuthApiTest extends IntegrationTestSupport {

    private static final String MOT_DE_PASSE = "MotDePasse-2026";

    @Autowired
    private PasswordEncoder passwordEncoder;

    // --- Inscription --------------------------------------------------------

    @Test
    void inscriptionAcheteurRenvoie201UnJetonEtStockeUnHashBCrypt() throws Exception {
        String email = "acheteur." + suffixeUnique() + "@sunurecolte.sn";

        MvcResult resultat = mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, MOT_DE_PASSE, "ACHETEUR",
                                ", \"typeAcheteur\": \"RESTAURATEUR\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.utilisateurId").isNumber())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("ACHETEUR"))
                .andExpect(jsonPath("$.motDePasse").doesNotExist())
                .andReturn();

        String corps = resultat.getResponse().getContentAsString();
        assertThat(corps).doesNotContain(MOT_DE_PASSE).doesNotContain("$2");

        Utilisateur enregistre = utilisateurRepository.findByEmail(email).orElseThrow();
        assertThat(enregistre.getRole().name()).isEqualTo("ACHETEUR");
        assertThat(enregistre.isActif()).isTrue();
        assertThat(enregistre.getMotDePasse()).isNotEqualTo(MOT_DE_PASSE).startsWith("$2");
        assertThat(passwordEncoder.matches(MOT_DE_PASSE, enregistre.getMotDePasse())).isTrue();
        assertThat(acheteurRepository.existsByUtilisateurId(enregistre.getId())).isTrue();

        // Le jeton renvoyé par l'inscription est immédiatement utilisable.
        AuthResponse authentification = objectMapper.readValue(corps, AuthResponse.class);
        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authentification.token()))
                .andExpect(status().isOk());
    }

    @Test
    void inscriptionProducteurCreeLeProfilProducteur() throws Exception {
        String email = "producteur." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, MOT_DE_PASSE, "PRODUCTEUR",
                                ", \"filiere\": \"MARAICHAGE\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("PRODUCTEUR"));

        Utilisateur enregistre = utilisateurRepository.findByEmail(email).orElseThrow();
        assertThat(producteurRepository.findByUtilisateurId(enregistre.getId()))
                .isPresent()
                .get()
                .extracting(producteur -> producteur.getFiliere().name())
                .isEqualTo("MARAICHAGE");
    }

    @Test
    void inscriptionAvecLeRoleAdminEstRefusee() throws Exception {
        String email = "admin.forge." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, MOT_DE_PASSE, "ADMIN", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Requête invalide : corps malformé ou valeur non autorisée."));

        assertThat(utilisateurRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void inscriptionAvecUnEmailDejaUtiliseRepond400SansDistinguerLaCasse() throws Exception {
        String email = "doublon." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email.toUpperCase(), MOT_DE_PASSE, "ACHETEUR",
                                ", \"typeAcheteur\": \"RESTAURATEUR\"")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, MOT_DE_PASSE, "ACHETEUR",
                                ", \"typeAcheteur\": \"RESTAURATEUR\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Un compte existe déjà avec cette adresse email."));

        assertThat(utilisateurRepository.findByEmail(email)).isPresent();
    }

    @Test
    void inscriptionAvecUnMotDePasseTropCourtRepond400() throws Exception {
        String email = "court." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, "court", "ACHETEUR",
                                ", \"typeAcheteur\": \"RESTAURATEUR\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.motDePasse").exists());

        assertThat(utilisateurRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void inscriptionProducteurSansFiliereRepond400() throws Exception {
        String email = "sansfiliere." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, MOT_DE_PASSE, "PRODUCTEUR", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("La filière est obligatoire pour un compte producteur."));

        assertThat(utilisateurRepository.findByEmail(email)).isEmpty();
    }

    // --- Connexion ----------------------------------------------------------

    @Test
    void connexionAvecDeBonsIdentifiantsRenvoieUnJetonUtilisable() throws Exception {
        String email = "connexion." + suffixeUnique() + "@sunurecolte.sn";
        inscrire(email, MOT_DE_PASSE, "ACHETEUR", ", \"typeAcheteur\": \"RESTAURATEUR\"");

        MvcResult resultat = mockMvc.perform(post("/api/auth/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "motDePasse": "%s"}
                                """.formatted(email.toUpperCase(), MOT_DE_PASSE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("ACHETEUR"))
                .andExpect(jsonPath("$.motDePasse").doesNotExist())
                .andReturn();

        assertThat(resultat.getResponse().getContentAsString())
                .doesNotContain(MOT_DE_PASSE).doesNotContain("$2");

        AuthResponse authentification = objectMapper.readValue(
                resultat.getResponse().getContentAsString(), AuthResponse.class);
        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authentification.token()))
                .andExpect(status().isOk());
    }

    @Test
    void connexionAvecUnMauvaisMotDePasseRepond401SansDetailInterne() throws Exception {
        String email = "mauvais.mdp." + suffixeUnique() + "@sunurecolte.sn";
        inscrire(email, MOT_DE_PASSE, "ACHETEUR", ", \"typeAcheteur\": \"RESTAURATEUR\"");

        MvcResult resultat = mockMvc.perform(post("/api/auth/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "motDePasse": "MauvaisMotDePasse-2026"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statut").value(401))
                .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect."))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andReturn();

        assertThat(resultat.getResponse().getContentAsString())
                .doesNotContain("MauvaisMotDePasse-2026").doesNotContain("$2");
    }

    @Test
    void connexionAvecUnEmailInconnuRepondLeMemeMessageQuUnMauvaisMotDePasse() throws Exception {
        mockMvc.perform(post("/api/auth/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "inconnu.%s@sunurecolte.sn", "motDePasse": "%s"}
                                """.formatted(suffixeUnique(), MOT_DE_PASSE)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect."));
    }

    @Test
    void connexionAvecUnCompteDesactiveRepond401() throws Exception {
        String email = "desactive." + suffixeUnique() + "@sunurecolte.sn";
        inscrire(email, MOT_DE_PASSE, "ACHETEUR", ", \"typeAcheteur\": \"RESTAURATEUR\"");

        Utilisateur utilisateur = utilisateurRepository.findByEmail(email).orElseThrow();
        utilisateur.setActif(false);
        utilisateurRepository.save(utilisateur);

        mockMvc.perform(post("/api/auth/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "motDePasse": "%s"}
                                """.formatted(email, MOT_DE_PASSE)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect."));
    }

    // --- Fabriques locales --------------------------------------------------

    private void inscrire(String email, String motDePasse, String role, String profilJson) throws Exception {
        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsInscription(email, motDePasse, role, profilJson)))
                .andExpect(status().isCreated());
    }

    private String corpsInscription(String email, String motDePasse, String role, String profilJson) {
        return """
                {"nom": "Ndiaye", "prenom": "Moussa", "email": "%s", "telephone": "%s",
                 "motDePasse": "%s", "role": "%s"%s}
                """.formatted(email, telephoneUnique(), motDePasse, role, profilJson);
    }
}
