package com.sunurecolte.api;

import com.sunurecolte.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * LOT P4 — limitation des tentatives de connexion.
 *
 * <p>Ce qui est protégé ici : un tiers ne peut pas enchaîner les essais de mot de passe sur un
 * même couple (email normalisé en minuscules, adresse du client) jusqu'à trouver. La règle jouée
 * par les tests : cinq échecs dans une fenêtre de quinze minutes, puis blocage de quinze minutes
 * pour ce couple uniquement ; la tentative suivante répond 429 avec un en-tête {@code Retry-After}
 * en secondes, et ce même avec le bon mot de passe — sinon le blocage ne ralentirait que les
 * mauvais mots de passe et laisserait passer le bon.
 *
 * <p>L'horloge est injectée : le {@link TestConfiguration} de cette classe remplace l'horloge
 * système par {@link HorlogeTest}, ce qui permet de faire avancer fenêtres et blocages sans
 * jamais dormir. Aucun test de cette classe ne dépend du temps réel, et aucun ne dépend de
 * l'ordre d'exécution des autres (les emails sont uniques, et l'horloge est réinitialisée avant
 * chaque test).
 *
 * <p>Pas d'énumération de comptes par le blocage : un email inconnu compte exactement comme un
 * email connu avec un mauvais mot de passe — même seuil, même 429, même message — sinon le
 * compteur deviendrait lui-même une fuite sur l'existence des comptes.
 *
 * <p>Le compteur vit en mémoire dans le contexte Spring et n'est pas annulé par le rollback de la
 * transaction de test : c'est l'unicité des emails qui isole les tests entre eux.
 */
class LimiteTentativesConnexionApiTest extends IntegrationTestSupport {

    private static final String MESSAGE_BLOQUE =
            "Trop de tentatives de connexion. Réessayez dans quelques minutes.";

    private static final String MESSAGE_ECHEC = "Email ou mot de passe incorrect.";

    private static final int SEUIL = 5;
    private static final int DUREE_BLOCAGE_SECONDES = 15 * 60;
    private static final String ADRESSE_PAR_DEFAUT = "127.0.0.1";
    private static final String ADRESSE_DISTINCTE = "10.20.30.40";

    /** Comptes fictifs créés par ces seuls tests ; aucune valeur réelle. */
    private static final String MOT_DE_PASSE_INSCRIPTION = "patate-dou-87";
    private static final String MAUVAIS_MOT_DE_PASSE = "pasteque-91";

    @BeforeEach
    void repartirDunInstantDeReference() {
        HorlogeTest.reinitialiser();
    }

    @TestConfiguration
    static class HorlogeInjectee {
        @Bean
        @Primary
        Clock horlogeDeTest() {
            return HorlogeTest.INSTANCE;
        }
    }

    /**
     * Horloge que le test avance lui-même. Volatile : les tests de concurrence la lisent
     * depuis plusieurs threads.
     */
    static final class HorlogeTest extends Clock {

        private static final Instant INSTANT_DE_REFERENCE = Instant.parse("2026-10-05T08:00:00Z");
        private static final HorlogeTest INSTANCE = new HorlogeTest();

        private volatile Instant instant = INSTANT_DE_REFERENCE;

        static void reinitialiser() {
            INSTANCE.instant = INSTANT_DE_REFERENCE;
        }

        static void avancer(Duration duree) {
            INSTANCE.instant = INSTANCE.instant.plus(duree);
        }

        @Override
        public Instant instant() {
            return instant;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    // --- Seuil et blocage ---------------------------------------------------

    @Test
    void cinqEchecsConsecutifsBloquentLaTentativeSuivanteMemeAvecLeBonMotDePasse() throws Exception {
        String email = inscritUnCompte();

        for (int essai = 1; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(MESSAGE_ECHEC));
        }

        mockMvc.perform(connexion(email, MOT_DE_PASSE_INSCRIPTION, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.statut").value(429))
                .andExpect(jsonPath("$.message").value(MESSAGE_BLOQUE))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().string("Retry-After", String.valueOf(DUREE_BLOCAGE_SECONDES)));
    }

    @Test
    void leBlocagePorteSurLEmailNormaliseMalgreLaCasse() throws Exception {
        String email = inscritUnCompte();

        bloquer(email, ADRESSE_PAR_DEFAUT);

        // Même compte, même adresse, saisis en majuscules : c'est la même clé, donc le même 429.
        // Les espaces autour de l'email n'atteignent jamais la limite : « @Email » les refuse
        // en 400 avant que le service ne normalise quoi que ce soit.
        mockMvc.perform(connexion(
                        email.toUpperCase(), MOT_DE_PASSE_INSCRIPTION, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(MESSAGE_BLOQUE));
    }

    @Test
    void unEmailInconnuEstCompteEtBloqueCommeUnEmailConnu() throws Exception {
        String emailInconnu = "jamais-inscrit." + suffixeUnique() + "@sunurecolte.sn";

        for (int essai = 1; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(emailInconnu, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value(MESSAGE_ECHEC));
        }

        mockMvc.perform(connexion(emailInconnu, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(MESSAGE_BLOQUE))
                .andExpect(header().string("Retry-After", String.valueOf(DUREE_BLOCAGE_SECONDES)));
    }

    // --- Remise à zéro et isolement -----------------------------------------

    @Test
    void uneConnexionReussieRemetLeCompteurAZero() throws Exception {
        String email = inscritUnCompte();

        for (int essai = 1; essai < SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(connexion(email, MOT_DE_PASSE_INSCRIPTION, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isOk());

        // Sans remise à zéro, le premier échec de cette série atteindrait le seuil et le
        // deuxième répondrait déjà 429.
        for (int essai = 1; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void unAutreEmailDepuisLaMemeAdresseNestPasBloque() throws Exception {
        String emailBloque = inscritUnCompte();
        String autreEmail = inscritUnCompte();

        bloquer(emailBloque, ADRESSE_PAR_DEFAUT);

        mockMvc.perform(connexion(autreEmail, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(connexion(autreEmail, MOT_DE_PASSE_INSCRIPTION, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isOk());
    }

    @Test
    void leMemeEmailDepuisUneAutreAdresseNestPasBloque() throws Exception {
        String email = inscritUnCompte();

        bloquer(email, ADRESSE_PAR_DEFAUT);

        mockMvc.perform(connexion(email, MOT_DE_PASSE_INSCRIPTION, ADRESSE_DISTINCTE))
                .andExpect(status().isOk());
    }

    // --- Expiration, pilotée par l'horloge injectée -------------------------

    @Test
    void leBlocageExpireApresQuinzeMinutesEtLeCompteurRepartDeZero() throws Exception {
        String email = inscritUnCompte();
        bloquer(email, ADRESSE_PAR_DEFAUT);

        HorlogeTest.avancer(Duration.ofMinutes(5));
        mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", String.valueOf(10 * 60)));

        HorlogeTest.avancer(Duration.ofMinutes(10));
        mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isUnauthorized());

        // Un blocage qui expirerait sans purge du compteur rebloquerait dès l'échec suivant.
        for (int essai = 2; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void desEchecsEspacesDePlusQueLaFenetreNeConstruisentAucunBlocage() throws Exception {
        String email = inscritUnCompte();

        for (int essai = 1; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                    .andExpect(status().isUnauthorized());
            HorlogeTest.avancer(Duration.ofMinutes(4));
        }

        // Cinq échecs au total, mais jamais deux d'affilée dans la même fenêtre de quinze minutes.
        mockMvc.perform(connexion(email, MOT_DE_PASSE_INSCRIPTION, ADRESSE_PAR_DEFAUT))
                .andExpect(status().isOk());
    }

    // --- Concurrence --------------------------------------------------------

    @Test
    void dixTentativesSimultaneesLaissentExactementCinqReponses401() throws Exception {
        String email = "concurrent." + suffixeUnique() + "@sunurecolte.sn";

        List<Integer> statuts = tentativesSimultanees(email, 10);

        // Sans compteur atomique, deux threads lisent le même état et laissent passer une
        // sixième tentative : cette assertion le refuse.
        List<Integer> attendus = new ArrayList<>();
        for (int essai = 1; essai <= 10; essai++) {
            attendus.add(essai <= SEUIL ? 401 : 429);
        }
        assertThat(statuts).containsExactlyInAnyOrderElementsOf(attendus);
    }

    private List<Integer> tentativesSimultanees(String email, int nombre) throws Exception {
        ExecutorService fils = Executors.newFixedThreadPool(nombre);
        CountDownLatch pret = new CountDownLatch(1);
        try {
            List<Future<Integer>> resultats = new ArrayList<>();
            for (int essai = 0; essai < nombre; essai++) {
                resultats.add(fils.submit(() -> {
                    pret.await(30, TimeUnit.SECONDS);
                    return mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, ADRESSE_PAR_DEFAUT))
                            .andReturn()
                            .getResponse()
                            .getStatus();
                }));
            }
            pret.countDown();

            List<Integer> statuts = new ArrayList<>();
            for (Future<Integer> resultat : resultats) {
                statuts.add(resultat.get(60, TimeUnit.SECONDS));
            }
            return statuts;
        } finally {
            fils.shutdownNow();
        }
    }

    // --- Fabriques locales --------------------------------------------------

    private String inscritUnCompte() throws Exception {
        String email = "limite." + suffixeUnique() + "@sunurecolte.sn";
        mockMvc.perform(post("/api/auth/inscription")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nom": "Ndiaye", "prenom": "Moussa", "email": "%s", "telephone": "%s",
                                 "motDePasse": "%s", "role": "ACHETEUR", "typeAcheteur": "RESTAURATEUR"}
                                """.formatted(email, telephoneUnique(), MOT_DE_PASSE_INSCRIPTION)))
                .andExpect(status().isCreated());
        return email;
    }

    private void bloquer(String email, String adresse) throws Exception {
        for (int essai = 1; essai <= SEUIL; essai++) {
            mockMvc.perform(connexion(email, MAUVAIS_MOT_DE_PASSE, adresse))
                    .andExpect(status().isUnauthorized());
        }
    }

    private MockHttpServletRequestBuilder connexion(String email, String motDePasse, String adresse) {
        return post("/api/auth/connexion")
                .with(requete -> {
                    requete.setRemoteAddr(adresse);
                    return requete;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email": "%s", "motDePasse": "%s"}
                        """.formatted(email, motDePasse));
    }
}
