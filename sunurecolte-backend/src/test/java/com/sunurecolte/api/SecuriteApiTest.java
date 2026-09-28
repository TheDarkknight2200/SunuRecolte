package com.sunurecolte.api;

import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests transverses de sécurité (Phase 3).
 *
 * Couvre : authentification obligatoire (401), autorisation par rôle (403),
 * contrôle de propriété (403), jetons invalides/expirés/forgés, CORS,
 * et absence de données sensibles dans les réponses d'erreur.
 *
 * Les jetons utilisés traversent réellement le filtre d'authentification :
 * soit signés par le vrai JwtService, soit fabriqués avec la vraie clé pour
 * simuler un jeton expiré, une signature étrangère ou une revendication forgée.
 */
class SecuriteApiTest extends IntegrationTestSupport {

    private static final String CLES_ETRANGERE = "cle-etrangere-de-test-32-octets-minimum-ok";

    @Value("${jwt.secret}")
    private String secretJwt;

    // --- Authentification obligatoire (401) ---------------------------------

    @Test
    void unEndpointProtegeSansJetonRepond401EnJsonSansDetailInterne() throws Exception {
        MvcResult resultat = mockMvc.perform(post("/api/recoltes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statut").value(401))
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andReturn();

        assertThat(resultat.getResponse().getContentType()).contains(MediaType.APPLICATION_JSON_VALUE);
        assertThat(resultat.getResponse().getContentAsString()).doesNotContain("<html", "Exception");
    }

    @Test
    void uneConsultationProtegeeSansJetonRepond401() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unEndpointProtegeAvecUnJetonValideRepondNormalement() throws Exception {
        Producteur producteur = creerProducteur();

        mockMvc.perform(post("/api/recoltes")
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"producteurId": %d, "produit": "Tomate", "quantiteDisponible": 50.00,
                                 "unite": "kg", "prixUnitaire": 400.00}
                                """.formatted(producteur.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.produit").value("Tomate"));
    }

    @Test
    void unJetonMalformeRepond401() throws Exception {
        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer pas-un-jeton-valide"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void unEnTeteAuthorizationSansPrefixeBearerEstIgnore() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);

        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, jwtService.generer(principalDe(utilisateur))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unJetonExpireRepond401() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        String jeton = jetonSigneAvec(cleReelle(), utilisateur,
                Date.from(Instant.now().minusMillis(3_600_000)));

        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unJetonSigneAvecUneAutreCleRepond401() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        SecretKey cleEtrangere = Keys.hmacShaKeyFor(CLES_ETRANGERE.getBytes(StandardCharsets.UTF_8));
        String jeton = jetonSigneAvec(cleEtrangere, utilisateur,
                Date.from(Instant.now().plusMillis(3_600_000)));

        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unJetonDesignantUnUtilisateurInexistantRepond401() throws Exception {
        String jeton = jetonSigneAvec(cleReelle(), 999_999L, "fantome@sunurecolte.sn",
                Date.from(Instant.now().plusMillis(3_600_000)));

        mockMvc.perform(get("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unJetonDunCompteDesactiveRepond401() throws Exception {
        Producteur producteur = creerProducteur();
        Utilisateur utilisateur = producteur.getUtilisateur();

        utilisateur.setActif(false);
        utilisateurRepository.save(utilisateur);

        mockMvc.perform(get("/api/notifications")
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unRoleForgeDansLeJetonNAccordeAucunDroitSupplementaire() throws Exception {
        Acheteur acheteur = creerAcheteur();
        String jeton = Jwts.builder()
                .subject(acheteur.getUtilisateur().getEmail())
                .claim("utilisateurId", acheteur.getUtilisateur().getId())
                .claim("role", "ADMIN")
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusMillis(3_600_000)))
                .signWith(cleReelle())
                .compact();

        // Le rôle est relu en base, jamais repris du jeton : l'acheteur reste un acheteur.
        mockMvc.perform(post("/api/recoltes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"producteurId": 1, "produit": "Tomate", "quantiteDisponible": 50.00,
                                 "unite": "kg", "prixUnitaire": 400.00}
                                """))
                .andExpect(status().isForbidden());
    }

    // --- Autorisation par rôle (403) ---------------------------------------

    @Test
    void unAcheteurNePeutPasPublierUneRecolteRepond403() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();

        mockMvc.perform(post("/api/recoltes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"producteurId": %d, "produit": "Tomate", "quantiteDisponible": 50.00,
                                 "unite": "kg", "prixUnitaire": 400.00}
                                """.formatted(producteur.getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette action."));
    }

    @Test
    void unProducteurNePeutPasCreerDeCommandeRepond403() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "50.00", "400.00");

        mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(producteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsCommande(acheteur.getId(), recolte.getId(), "2.00")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette action."));
    }

    // --- Contrôle de propriété (403) ---------------------------------------

    @Test
    void unProducteurNePeutPasModifierLaRecolteDUnAutreRepond403() throws Exception {
        Producteur proprietaire = creerProducteur();
        Recolte recolte = creerRecolte(proprietaire, "Tomate", "50.00", "400.00");
        Producteur intrus = creerProducteur();

        mockMvc.perform(put("/api/recoltes/{id}", recolte.getId())
                        .with(avecJetonDe(intrus.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"producteurId": %d, "produit": "Tomate", "quantiteDisponible": 50.00,
                                 "unite": "kg", "prixUnitaire": 400.00}
                                """.formatted(proprietaire.getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));

        assertThat(recolteRepository.findById(recolte.getId()).orElseThrow().getProduit())
                .isEqualTo("Tomate");
    }

    @Test
    void unAcheteurNePeutPasPayerLaCommandeDUnAutreRepond403() throws Exception {
        Acheteur proprietaire = creerAcheteur();
        Acheteur intrus = creerAcheteur();
        CommandeResponse commande = creerCommandeViaApi(proprietaire, "2.00");

        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(intrus.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commande.id() + ", \"moyenPaiement\": \"WAVE\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource."));

        assertThat(paiementRepository.findByCommandeId(commande.id())).isEmpty();
    }

    @Test
    void unUtilisateurNePeutPasConsulterLesNotificationsDUnAutreRepond403() throws Exception {
        Utilisateur destinataire = creerUtilisateur(Role.PRODUCTEUR);
        Utilisateur intrus = creerUtilisateur(Role.ACHETEUR);

        mockMvc.perform(get("/api/notifications")
                        .param("utilisateurId", destinataire.getId().toString())
                        .with(avecJetonDe(intrus)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unUtilisateurNePeutPasConsulterLeProfilDUnAutreSansEtreAdmin() throws Exception {
        Utilisateur cible = creerUtilisateur(Role.PRODUCTEUR);
        Utilisateur intrus = creerUtilisateur(Role.ACHETEUR);

        mockMvc.perform(get("/api/utilisateurs/{id}", cible.getId())
                        .with(avecJetonDe(intrus)))
                .andExpect(status().isForbidden());
    }

    // --- CORS ---------------------------------------------------------------

    @Test
    void lePreflightCorsDuFrontendLocalEstAccepte() throws Exception {
        mockMvc.perform(options("/api/recoltes")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("POST")))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
    }

    @Test
    void uneOrigineNonAutoriseeEstRefuseeParLeCors() throws Exception {
        mockMvc.perform(options("/api/recoltes")
                        .header(HttpHeaders.ORIGIN, "http://origine-non-autorisee.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }

    // --- Endpoints publics et données sensibles -----------------------------

    @Test
    void leCataloguePublicResteAccessibleSansJeton() throws Exception {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "50.00", "400.00");

        mockMvc.perform(get("/api/recoltes")).andExpect(status().isOk());
        mockMvc.perform(get("/api/recoltes/{id}", recolte.getId())).andExpect(status().isOk());
        mockMvc.perform(get("/api/prix-marche")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    @Test
    void aucuneReponseDeProfilNExposeDeMotDePasse() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        MvcResult profilProducteur = mockMvc.perform(get("/api/producteurs/{id}", producteur.getId())
                        .with(avecJetonDe(producteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult profilAcheteur = mockMvc.perform(get("/api/acheteurs/{id}", acheteur.getId())
                        .with(avecJetonDe(acheteur.getUtilisateur())))
                .andExpect(status().isOk())
                .andReturn();

        for (MvcResult resultat : List.of(profilProducteur, profilAcheteur)) {
            String corps = resultat.getResponse().getContentAsString();
            assertThat(corps)
                    .doesNotContain("motDePasse")
                    .doesNotContain("password")
                    .doesNotContain("$2a$")
                    .doesNotContain("$2b$");
        }
    }

    // --- Fabriques locales --------------------------------------------------

    private SecretKey cleReelle() {
        return Keys.hmacShaKeyFor(secretJwt.getBytes(StandardCharsets.UTF_8));
    }

    private String jetonSigneAvec(SecretKey cle, Utilisateur utilisateur, Date expiration) {
        return jetonSigneAvec(cle, utilisateur.getId(), utilisateur.getEmail(), expiration);
    }

    private String jetonSigneAvec(SecretKey cle, Long utilisateurId, String email, Date expiration) {
        return Jwts.builder()
                .subject(email)
                .claim("utilisateurId", utilisateurId)
                .issuedAt(Date.from(Instant.now().minusMillis(7_200_000)))
                .expiration(expiration)
                .signWith(cle)
                .compact();
    }

    private String corpsCommande(Long acheteurId, Long recolteId, String quantite) throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteurId);
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", List.of(Map.of("recolteId", recolteId, "quantite", quantite)));
        return objectMapper.writeValueAsString(corps);
    }

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, String quantite) throws Exception {
        Recolte recolte = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        String reponse = mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpsCommande(acheteur.getId(), recolte.getId(), quantite)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readValue(reponse, CommandeResponse.class);
    }
}
