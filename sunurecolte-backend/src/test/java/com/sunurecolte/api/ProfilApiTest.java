package com.sunurecolte.api;

import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
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

        mockMvc.perform(get("/api/utilisateurs/{id}", utilisateur.getId())
                        .with(avecJetonDe(utilisateur)))
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
        // UtilisateurService controle l'acces avant le chargement : un non-admin
        // recevrait 403. Le contrat 404 est donc verifie avec un jeton ADMIN.
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/utilisateurs/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Utilisateur introuvable avec l'id : 999999"));
    }

    // --- Producteurs -------------------------------------------------------

    @Test
    void consulterUnProducteurRepond200() throws Exception {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(get("/api/producteurs/{id}", producteur.getId())
                        .with(avecJetonDe(producteur.getUtilisateur())))
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
                        .with(avecJetonDe(producteur.getUtilisateur()))
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
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"localisationExploitation\": \"Thies\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.filiere").exists());
    }

    @Test
    void unProducteurInconnuRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/producteurs/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Producteur introuvable avec l'id : 999999"));
    }

    // --- Profil du producteur connecté (GET /api/producteurs/moi) ----------

    @Test
    void obtenirMonProfilSansJetonRepond401() throws Exception {
        mockMvc.perform(get("/api/producteurs/moi"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void obtenirMonProfilAvecUnAcheteurRepond403() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(get("/api/producteurs/moi")
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));
    }

    @Test
    void obtenirMonProfilAvecUnAdminRepond403() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/producteurs/moi")
                        .with(avecJetonDe(admin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void obtenirMonProfilRepondLeProducteurIssueDuJeton() throws Exception {
        // Second producteur créé pour prouver que la réponse ne peut pas
        // dépendre d'un identifiant transmis par le client.
        Producteur autre = creerProducteur(Filiere.CEREALES);
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(get("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(moi.getId()))
                .andExpect(jsonPath("$.utilisateurId").value(moi.getUtilisateur().getId()))
                .andExpect(jsonPath("$.nom").value("Diop"))
                .andExpect(jsonPath("$.prenom").value("Awa"))
                .andExpect(jsonPath("$.email").value(moi.getUtilisateur().getEmail()))
                .andExpect(jsonPath("$.filiere").value("MARAICHAGE"))
                .andExpect(jsonPath("$.localisationExploitation").value("Rufisque"))
                .andExpect(jsonPath("$.id").value(not(autre.getId())))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());
    }

    // --- Mise à jour de son propre profil (PUT /api/producteurs/moi) --------

    @Test
    void modifierMonProfilAppliqueLesSeptChamps() throws Exception {
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);
        Producteur voisin = creerProducteur(Filiere.CEREALES);
        String email = "moussa.fall." + suffixeUnique() + "@sunurecolte.sn";

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(moi.getId()))
                .andExpect(jsonPath("$.utilisateurId").value(moi.getUtilisateur().getId()))
                .andExpect(jsonPath("$.prenom").value("Moussa"))
                .andExpect(jsonPath("$.nom").value("Fall"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.telephone").value("771234567"))
                .andExpect(jsonPath("$.localisationExploitation").value("Thiès"))
                .andExpect(jsonPath("$.filiere").value("ELEVAGE"))
                .andExpect(jsonPath("$.description").value("Exploitation familiale"))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());

        // Relecture depuis la base, et vérification qu'aucun autre compte n'est modifié.
        mockMvc.perform(get("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur())))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.prenom").value("Moussa"))
                .andExpect(jsonPath("$.filiere").value("ELEVAGE"));
        assertThat(voisin.getUtilisateur().getPrenom()).isEqualTo("Awa");
        assertThat(voisin.getUtilisateur().getEmail())
                .isNotEqualTo(moi.getUtilisateur().getEmail());
    }

    @Test
    void modifierMonProfilSansJetonRepond401() throws Exception {
        mockMvc.perform(put("/api/producteurs/moi")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail("inconnu@sunurecolte.sn")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void modifierMonProfilAvecUnAcheteurRepond403() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(acheteur.getUtilisateur().getEmail())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));
    }

    @Test
    void modifierMonProfilAvecUnAdminRepond403() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(admin.getEmail())))
                .andExpect(status().isForbidden());
    }

    @Test
    void modifierMonProfilSansProfilProducteurRepond403() throws Exception {
        // Rôle PRODUCTEUR sans ligne dans la table producteurs : rien à modifier, donc refus.
        Utilisateur sansProfil = creerUtilisateur(Role.PRODUCTEUR);

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(sansProfil))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(sansProfil.getEmail())))
                .andExpect(status().isForbidden());
    }

    @Test
    void modifierMonProfilAvecLemailDUnAutreRepond400EtNon500() throws Exception {
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);
        Producteur voisin = creerProducteur(Filiere.CEREALES);

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(voisin.getUtilisateur().getEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Un compte existe déjà avec cette adresse email."));
    }

    @Test
    void modifierMonProfilConserveSonPropreEmailSansLeConsidererCommeUnDoublon() throws Exception {
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);
        String emailActuel = moi.getUtilisateur().getEmail();

        // Même adresse, mais saisie en majuscules : elle est normalisée comme à l'inscription
        // et ne doit pas déclencher le contrôle d'unicité (un compte ne se double pas lui-même).
        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profilCompletAvecEmail(emailActuel.toUpperCase(Locale.ROOT))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(emailActuel));
    }

    @Test
    void modifierMonProfilInvalideRepond400AvecUneErreurParChamp() throws Exception {
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prenom": "", "nom": "%s", "email": "pas-un-email",
                                 "telephone": "00000000000000000000000",
                                 "localisationExploitation": "%s"}
                                """.formatted("n".repeat(101), "l".repeat(256))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Données invalides"))
                .andExpect(jsonPath("$.erreurs.prenom").exists())
                .andExpect(jsonPath("$.erreurs.nom").exists())
                .andExpect(jsonPath("$.erreurs.email").exists())
                .andExpect(jsonPath("$.erreurs.telephone").exists())
                .andExpect(jsonPath("$.erreurs.localisationExploitation").exists())
                .andExpect(jsonPath("$.erreurs.filiere").exists());
    }

    @Test
    void modifierMonProfilIgnoreToutChampHorsContrat() throws Exception {
        Producteur moi = creerProducteur(Filiere.MARAICHAGE);
        Utilisateur utilisateur = moi.getUtilisateur();
        String hashInitial = utilisateur.getMotDePasse();

        mockMvc.perform(put("/api/producteurs/moi")
                        .with(avecJetonDe(utilisateur))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prenom": "Moussa", "nom": "Fall", "email": "%s",
                                 "telephone": "771234567", "localisationExploitation": "Thiès",
                                 "filiere": "ELEVAGE", "description": "Exploitation familiale",
                                 "id": 999999, "utilisateurId": 999999, "role": "ADMIN",
                                 "actif": false, "motDePasse": "un-autre-mot-de-passe",
                                 "dateCreation": "2000-01-01T00:00:00"}
                                """.formatted(utilisateur.getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(moi.getId()))
                .andExpect(jsonPath("$.utilisateurId").value(utilisateur.getId()))
                .andExpect(jsonPath("$.motDePasse").doesNotExist())
                .andExpect(jsonPath("$.role").doesNotExist())
                .andExpect(jsonPath("$.actif").doesNotExist());

        assertThat(utilisateur.getRole()).isEqualTo(Role.PRODUCTEUR);
        assertThat(utilisateur.isActif()).isTrue();
        assertThat(utilisateur.getMotDePasse()).isEqualTo(hashInitial);
    }

    @Test
    void modifierLeProfilDUnAutreProducteurParIdRepond403() throws Exception {
        // Le contrat « /moi » ne doit jamais devenir une porte dérobée : la cible d'un PUT
        // par identifiant reste soumise au contrôle de propriété du service.
        Producteur proprietaire = creerProducteur(Filiere.MARAICHAGE);
        Producteur cible = creerProducteur(Filiere.CEREALES);

        mockMvc.perform(put("/api/producteurs/{id}", cible.getId())
                        .with(avecJetonDe(proprietaire.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"localisationExploitation": "Ziguinchor", "filiere": "AUTRE",
                                 "description": "tentative"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));

        assertThat(cible.getLocalisationExploitation()).isEqualTo("Rufisque");
        assertThat(cible.getFiliere()).isEqualTo(Filiere.CEREALES);
    }

    /** Corps complet de PUT /api/producteurs/moi, seul l'email varie selon le cas testé. */
    private static String profilCompletAvecEmail(String email) {
        return """
                {"prenom": "Moussa", "nom": "Fall", "email": "%s", "telephone": "771234567",
                 "localisationExploitation": "Thiès", "filiere": "ELEVAGE",
                 "description": "Exploitation familiale"}
                """.formatted(email);
    }

    // --- Acheteurs ---------------------------------------------------------

    @Test
    void consulterUnAcheteurRepond200() throws Exception {
        Acheteur acheteur = creerAcheteur();

        mockMvc.perform(get("/api/acheteurs/{id}", acheteur.getId())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.utilisateurId").value(acheteur.getUtilisateur().getId()))
                .andExpect(jsonPath("$.typeAcheteur").value("RESTAURATEUR"))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());
    }

    @Test
    void unAcheteurInconnuRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/acheteurs/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Acheteur introuvable avec l'id : 999999"));
    }

    // --- Profil de l'acheteur connecté (GET /api/acheteurs/moi) ------------

    @Test
    void obtenirMonProfilAcheteurRepondLacheteurIssueDuJeton() throws Exception {
        // Second acheteur créé pour prouver que la réponse ne peut pas dépendre
        // d'un identifiant transmis par le client.
        Acheteur autre = creerAcheteur();
        Acheteur moi = creerAcheteur();

        mockMvc.perform(get("/api/acheteurs/moi")
                        .with(avecJetonDe(moi.getUtilisateur())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(moi.getId()))
                .andExpect(jsonPath("$.utilisateurId").value(moi.getUtilisateur().getId()))
                .andExpect(jsonPath("$.nom").value("Diop"))
                .andExpect(jsonPath("$.prenom").value("Awa"))
                .andExpect(jsonPath("$.email").value(moi.getUtilisateur().getEmail()))
                .andExpect(jsonPath("$.telephone").value(moi.getUtilisateur().getTelephone()))
                .andExpect(jsonPath("$.typeAcheteur").value("RESTAURATEUR"))
                .andExpect(jsonPath("$.id").value(not(autre.getId())))
                .andExpect(jsonPath("$.motDePasse").doesNotExist());
    }

    @Test
    void obtenirMonProfilAcheteurSansJetonRepond401() throws Exception {
        mockMvc.perform(get("/api/acheteurs/moi"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void obtenirMonProfilAcheteurAvecUnProducteurRepond403() throws Exception {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);

        mockMvc.perform(get("/api/acheteurs/moi")
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));
    }

    @Test
    void obtenirMonProfilAcheteurAvecUnAdminRepond403() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/acheteurs/moi")
                        .with(avecJetonDe(admin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void obtenirMonProfilAcheteurSansProfilAcheteurRepond403() throws Exception {
        // Un compte avec le rôle ACHETEUR mais sans ligne dans la table acheteur :
        // aucun profil à exposer, donc refus (et jamais 404 pour masquer un refus).
        Utilisateur sansProfil = creerUtilisateur(Role.ACHETEUR);

        mockMvc.perform(get("/api/acheteurs/moi")
                        .with(avecJetonDe(sansProfil)))
                .andExpect(status().isForbidden());
    }
}
