package com.sunurecolte.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.security.JwtService;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.TypeAcheteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * LOT P3 — le stock et le paiement tiennent-ils sous requêtes simultanées ?
 *
 * <p>Pourquoi cette classe n'étend pas {@code IntegrationTestSupport} : cette base est annotée
 * {@code @Transactional}. Chaque test y roule dans une transaction qui n'est jamais validée et
 * qui est annulée à la fin. Deux requêtes « simultanées » parties de là ne verraient jamais les
 * données préparées par le test (elles sont privées à sa transaction), et aucune de leurs écritures
 * ne serait visible par l'autre : la concurrence ne peut pas être observée dans ce cadre, seulement
 * jouée en séquence. Ici il n'y a donc aucune transaction de test : la préparation est validée
 * pour de vrai (une transaction par fabrique), les threads ouvrent leurs propres transactions, les
 * lectures d'état final passent par {@code JdbcTemplate} pour lire la base commitée, et
 * {@code @AfterEach} supprime tout ce que le test a créé.
 *
 * <p>Isolation et nettoyage : chaque test crée ses propres utilisateurs (emails et téléphones
 * uniques), ses propres producteurs, récoltes et commandes ; leurs identifiants sont mémorisés au
 * fur et à mesure, et la suppression se fait dans l'ordre des clés étrangères — notifications,
 * paiements, lignes de commande, commandes, récoltes, acheteurs, producteurs, utilisateurs. Rien
 * d'autre que ces lignes n'est touché, donc les autres classes de tests, transactionnelles et
 * annulées, ne voient rien passer.
 *
 * <p>Les assertions ne portent que sur des invariants : combien de requêtes aboutissent, quel stock
 * final en base, combien de lignes existent. Jamais quel fil gagne. Chaque requête a un budget de
 * {@value #DELAI_MAX_SECONDES} secondes : un verrou qui ne se libère pas fait échouer le test au
 * lieu de le suspendre.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConcurrenceApiTest {

    private static final String MESSAGE_PAIEMENT_EXISTANT =
            "Un paiement existe déjà pour cette commande.";

    /** Un interblocage doit faire échouer le test, jamais le bloquer. */
    private static final int DELAI_MAX_SECONDES = 15;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private ProducteurRepository producteurRepository;

    @Autowired
    private AcheteurRepository acheteurRepository;

    @Autowired
    private RecolteRepository recolteRepository;

    /** Tous les utilisateurs créés par le test en cours : la suppression en dépend entièrement. */
    private final List<Long> utilisateursCrees = new ArrayList<>();

    // --- a. La dernière unité ne se vend qu'une fois --------------------------

    @Test
    void laDerniereUniteNEstVendueQuUneSeuleFois() {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Oignon de concurrence", "1.00");
        List<Acheteur> acheteurs = List.of(
                creerAcheteur(), creerAcheteur(), creerAcheteur(), creerAcheteur(), creerAcheteur());

        List<ReponseHttp> reponses = executerEnMemeTemps(acheteurs.size(),
                index -> passerCommande(acheteurs.get(index), Map.of(recolte.getId(), "1.00")));

        aucuneErreurServeur(reponses);
        assertThat(statuts(reponses)).containsExactly(201, 400, 400, 400, 400);
        for (ReponseHttp refus : lesRefus(reponses)) {
            assertUnRefusDeStock(refus);
        }

        assertThat(quantiteDisponible(recolte.getId())).isEqualByComparingTo("0.00");
        assertThat(statutRecolte(recolte.getId())).isEqualTo("EPUISEE");
        assertThat(compter("SELECT count(*) FROM lignes_commande WHERE recolte_id = ?", recolte.getId()))
                .isEqualTo(1);
    }

    // --- b. Un stock partagé ne se vend pas au-delà de sa quantité ------------

    @Test
    void unStockDeTroisUnitesNeSeVendPasAuDelaDeTroisCommandes() {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Niébé de concurrence", "3.00");
        List<Acheteur> acheteurs = List.of(
                creerAcheteur(), creerAcheteur(), creerAcheteur(),
                creerAcheteur(), creerAcheteur(), creerAcheteur());

        List<ReponseHttp> reponses = executerEnMemeTemps(acheteurs.size(),
                index -> passerCommande(acheteurs.get(index), Map.of(recolte.getId(), "1.00")));

        aucuneErreurServeur(reponses);
        assertThat(statuts(reponses)).containsExactly(201, 201, 201, 400, 400, 400);
        for (ReponseHttp refus : lesRefus(reponses)) {
            assertUnRefusDeStock(refus);
        }

        assertThat(quantiteDisponible(recolte.getId())).isEqualByComparingTo("0.00");
        assertThat(compter("SELECT count(*) FROM lignes_commande WHERE recolte_id = ?", recolte.getId()))
                .isEqualTo(3);
    }

    // --- c. L'ordre de verrouillage ne doit pas interbloquer ------------------

    /**
     * Les deux acheteurs prennent les mêmes récoltes dans un ordre inverse. Le service agrège et
     * trie les lignes par identifiant de récolte avant de verrouiller : les deux transactions
     * doivent donc prendre les verrous dans le même ordre, et les deux commandes aboutir.
     */
    @Test
    void deuxCommandesSurLesMemesRecoltesDansUnOrdreInverseNinterbloquentPas() {
        Producteur producteur = creerProducteur();
        Recolte carotte = creerRecolte(producteur, "Carotte A de concurrence", "10.00");
        Recolte patate = creerRecolte(producteur, "Pomme de terre B de concurrence", "10.00");
        Acheteur premier = creerAcheteur();
        Acheteur second = creerAcheteur();

        Map<Long, String> lignesDansLordre = new LinkedHashMap<>();
        lignesDansLordre.put(carotte.getId(), "2.00");
        lignesDansLordre.put(patate.getId(), "4.00");

        Map<Long, String> lignesDansOrdreInverse = new LinkedHashMap<>();
        lignesDansOrdreInverse.put(patate.getId(), "1.00");
        lignesDansOrdreInverse.put(carotte.getId(), "5.00");

        List<ReponseHttp> reponses = executerEnMemeTemps(2, index -> passerCommande(
                index == 0 ? premier : second,
                index == 0 ? lignesDansLordre : lignesDansOrdreInverse));

        aucuneErreurServeur(reponses);
        assertThat(statuts(reponses)).containsExactly(201, 201);

        // 10,00 - 2,00 - 5,00 et 10,00 - 4,00 - 1,00 : chaque récolte a perdu exactement la somme demandée.
        assertThat(quantiteDisponible(carotte.getId())).isEqualByComparingTo("3.00");
        assertThat(quantiteDisponible(patate.getId())).isEqualByComparingTo("5.00");
    }

    // --- d. Deux paiements simultanés : un seul paiement, un refus métier -----

    @Test
    void deuxPaiementsSimultanesDonnentUnSeulPaiementEtUnRefusMetier() {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate de concurrence", "50.00");
        Long commandeId = creerCommande(acheteur, Map.of(recolte.getId(), "1.00"));

        List<ReponseHttp> reponses = executerEnMemeTemps(2,
                index -> payer(acheteur, commandeId));

        aucuneErreurServeur(reponses);
        assertThat(statuts(reponses)).containsExactly(201, 400);
        assertThat(lesRefus(reponses))
                .singleElement()
                .satisfies(refus -> assertThat(messageDe(refus)).isEqualTo(MESSAGE_PAIEMENT_EXISTANT));

        assertThat(compter("SELECT count(*) FROM paiements WHERE commande_id = ?", commandeId)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT statut FROM paiements WHERE commande_id = ?", String.class, commandeId))
                .isEqualTo("REUSSI");
    }

    /**
     * Preuve que le doublon rejeté par la contrainte `uq_paiements_commande` — et donc la branche
     * {@code catch DataIntegrityViolationException} de {@code PaiementService} — est réellement
     * exercé, et non seulement le contrôle d'existence qui le précède.
     *
     * <p>Le test tient lui-même une transaction ouverte qui insère un paiement pour la commande,
     * sans la valider. La requête HTTP passe alors son contrôle d'existence (ligne invisible en
     * « read committed ») puis son insertion attend le verdict de l'autre transaction. Le test ne
     * la valide qu'après avoir surpris cette insertion en attente : le rejet vient forcément de la
     * contrainte unique. Si la requête aboutissait avant, le test échoue en le disant plutôt que
     * de faire croire à une preuve.
     */
    @Test
    void leDoublonRejeteParLaContrainteUniqueRenvoieLeMemeRefusMetier() throws Exception {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Aubergine de concurrence", "50.00");
        Long commandeId = creerCommande(acheteur, Map.of(recolte.getId(), "1.00"));
        BigDecimal montant = jdbcTemplate.queryForObject(
                "SELECT total FROM commandes WHERE id = ?", BigDecimal.class, commandeId);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        try (Connection autreSession = dataSource.getConnection()) {
            autreSession.setAutoCommit(false);
            insererUnPaiementSansValider(autreSession, commandeId, montant);

            Future<ReponseHttp> requeteEnCours = executor.submit(() -> payer(acheteur, commandeId));
            attendreInsertionEnAttenteDeVerrou(requeteEnCours);
            autreSession.commit();

            ReponseHttp reponse = requeteEnCours.get(DELAI_MAX_SECONDES, TimeUnit.SECONDS);

            assertThat(reponse.statut())
                    .withFailMessage(() -> "Le doublon rejeté par la base devrait devenir un 400 métier, "
                            + "réponse reçue " + reponse.statut() + " : " + reponse.corps())
                    .isEqualTo(400);
            assertThat(messageDe(reponse)).isEqualTo(MESSAGE_PAIEMENT_EXISTANT);

            // Une seule ligne en base : celle validée par le test. L'insertion de l'API est rollbackée.
            assertThat(compter("SELECT count(*) FROM paiements WHERE commande_id = ?", commandeId)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    // --- e. Annulation concurrente --------------------------------------------

    /**
     * Deux annulations simultanées de la même commande : une seule doit aboutir, et le stock ne
     * doit être rendu qu'une fois (stock final = stock d'avant la commande, jamais supérieur).
     */
    @Test
    void deuxAnnulationsSimultanesNeRestaurentLeStockQuUneSeuleFois() {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Piment de concurrence", "5.00");
        Long commandeId = creerCommande(acheteur, Map.of(recolte.getId(), "2.00"));

        assertThat(quantiteDisponible(recolte.getId())).isEqualByComparingTo("3.00");

        List<ReponseHttp> reponses = executerEnMemeTemps(2, index -> annuler(acheteur, commandeId));
        BigDecimal stockFinal = quantiteDisponible(recolte.getId());

        aucuneErreurServeur(reponses);
        assertThat(statuts(reponses))
                .withFailMessage(() -> "Une seule des deux annulations devait aboutir, et le stock rendu "
                        + "une seule fois. Statuts reçus " + statuts(reponses) + ", stock final observé "
                        + stockFinal + " — la commande de préparation avait retiré 2,00 d'un stock de 5,00.")
                .containsExactly(200, 400);
        assertThat(stockFinal).isEqualByComparingTo("5.00");
    }

    // --- Harnais de concurrence -----------------------------------------------

    /**
     * Lance {@code nombre} tâches au même instant : chacune attend le même latch, libéré d'un coup.
     * Le budget de {@value #DELAI_MAX_SECONDES} secondes transforme un verrou qui ne se libère pas
     * en échec de test explicite.
     */
    private <T> List<T> executerEnMemeTemps(int nombre, IntFunction<T> tache) {
        ExecutorService executor = Executors.newFixedThreadPool(nombre);
        CountDownLatch depart = new CountDownLatch(1);
        List<Future<T>> futures = new ArrayList<>();
        try {
            for (int index = 0; index < nombre; index++) {
                final int i = index;
                futures.add(executor.submit(() -> {
                    depart.await();
                    return tache.apply(i);
                }));
            }
            depart.countDown();

            executor.shutdown();
            if (!executor.awaitTermination(DELAI_MAX_SECONDES, TimeUnit.SECONDS)) {
                executor.shutdownNow();
                throw new AssertionError("Des requêtes simultanées n'ont pas répondu en "
                        + DELAI_MAX_SECONDES + " s : une transaction attend un verrou qui ne se "
                        + "libère pas (interblocage ou verrou oublié).");
            }

            List<T> resultats = new ArrayList<>();
            for (Future<T> future : futures) {
                resultats.add(future.get());
            }
            return resultats;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            executor.shutdownNow();
            throw new AssertionError("Le lancement simultané a été interrompu.", ex);
        } catch (ExecutionException ex) {
            throw new AssertionError("Une tâche concurrente a échoué : " + ex.getCause(), ex);
        } finally {
            executor.shutdownNow();
        }
    }

    /** Attend que l'insertion de paiement de l'API soit surprise en attente de verrou. */
    private void attendreInsertionEnAttenteDeVerrou(Future<?> requete) throws InterruptedException {
        long echeance = System.nanoTime() + TimeUnit.SECONDS.toNanos(DELAI_MAX_SECONDES);
        while (System.nanoTime() < echeance) {
            Integer bloquees = jdbcTemplate.queryForObject("""
                    SELECT count(*) FROM pg_stat_activity
                    WHERE pid <> pg_backend_pid()
                      AND state = 'active'
                      AND lower(query) LIKE 'insert into paiements%'
                    """, Integer.class);
            if (bloquees != null && bloquees > 0) {
                return;
            }
            if (requete.isDone()) {
                throw new AssertionError("La requête de paiement a terminé sans jamais attendre la "
                        + "contrainte unique : la branche visée par ce test n'a pas été exercée, "
                        + "le test ne peut pas en témoigner.");
            }
            Thread.sleep(20);
        }
        throw new AssertionError("Aucune insertion de paiement n'a été surprise en attente de verrou "
                + "au bout de " + DELAI_MAX_SECONDES + " s.");
    }

    private void insererUnPaiementSansValider(Connection session, Long commandeId, BigDecimal montant)
            throws SQLException {
        try (PreparedStatement insertion = session.prepareStatement("""
                INSERT INTO paiements (commande_id, reference_transaction, montant,
                                       moyen_paiement, statut, date_creation, date_confirmation)
                VALUES (?, ?, ?, 'WAVE', 'REUSSI', now(), now())
                """)) {
            insertion.setLong(1, commandeId);
            insertion.setString(2, "SIMU-TEST-CONTRAINTE-" + suffixeUnique());
            insertion.setBigDecimal(3, montant);
            insertion.executeUpdate();
        }
    }

    // --- Requêtes API ---------------------------------------------------------

    private ReponseHttp passerCommande(Acheteur acheteur, Map<Long, String> quantitesParRecolte) {
        List<Map<String, Object>> lignes = new ArrayList<>();
        quantitesParRecolte.forEach((recolteId, quantite) ->
                lignes.add(Map.of("recolteId", recolteId, "quantite", quantite)));

        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", lignes);

        return envoyer(post("/api/commandes")
                .with(avecJetonDe(acheteur.getUtilisateur()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(corps)));
    }

    private ReponseHttp payer(Acheteur acheteur, Long commandeId) {
        return envoyer(post("/api/paiements")
                .with(avecJetonDe(acheteur.getUtilisateur()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("commandeId", commandeId, "moyenPaiement", "WAVE"))));
    }

    private ReponseHttp annuler(Acheteur acheteur, Long commandeId) {
        return envoyer(patch("/api/commandes/{id}/statut", commandeId)
                .with(avecJetonDe(acheteur.getUtilisateur()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("statut", "ANNULEE"))));
    }

    /**
     * Une réponse par appel, jamais une attente d'ordre : un statut 500, comme une exception sortie
     * du servlet (-1), est une réponse à lire et à faire échouer sur l'invariant visé.
     *
     * <p>Le corps est relu en octets puis décodé en UTF-8 : {@code getContentAsString()} suit le
     * charset porté par le {@code Content-Type}, et {@code application/json} sans paramètre laisse
     * la réponse mock à son encodement par défaut, ce qui casserait les accents des messages métier.
     */
    private ReponseHttp envoyer(MockHttpServletRequestBuilder requete) {
        try {
            MvcResult resultat = mockMvc.perform(requete).andReturn();
            return new ReponseHttp(resultat.getResponse().getStatus(),
                    new String(resultat.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));
        } catch (Exception ex) {
            return new ReponseHttp(-1, ex.getClass().getName() + " : " + ex.getMessage());
        }
    }

    // --- Contrôles communs ----------------------------------------------------

    private void aucuneErreurServeur(List<ReponseHttp> reponses) {
        for (ReponseHttp reponse : reponses) {
            assertThat(reponse.statut())
                    .withFailMessage(() -> "Refus métier attendu, jamais une erreur serveur. Réception : "
                            + reponse.statut() + " — " + reponse.corps())
                    .isNotEqualTo(500)
                    .isNotEqualTo(-1);
        }
    }

    private List<Integer> statuts(List<ReponseHttp> reponses) {
        return reponses.stream().map(ReponseHttp::statut).sorted().toList();
    }

    private List<ReponseHttp> lesRefus(List<ReponseHttp> reponses) {
        return reponses.stream().filter(reponse -> reponse.statut() == 400).toList();
    }

    /**
     * Deux messages d'un même refus selon l'instant de la lecture : le stock restant insuffisant,
     * ou la récolte déjà marquée épuisée par la commande qui a gagné. Les deux sont des 400 métier.
     */
    private void assertUnRefusDeStock(ReponseHttp refus) {
        String message = messageDe(refus);
        assertThat(message.startsWith("Stock insuffisant pour")
                        || message.contains("n'est pas disponible."))
                .withFailMessage(() -> "Un refus de stock était attendu, message reçu : " + message)
                .isTrue();
    }

    private String messageDe(ReponseHttp reponse) {
        try {
            return objectMapper.readTree(reponse.corps()).path("message").asText();
        } catch (Exception ex) {
            return "<corps sans message : " + reponse.corps() + ">";
        }
    }

    private Long idDe(ReponseHttp reponse) {
        try {
            return objectMapper.readTree(reponse.corps()).path("id").asLong();
        } catch (Exception ex) {
            throw new IllegalStateException("Réponse de création illisible : " + reponse.corps(), ex);
        }
    }

    private String json(Object valeur) {
        try {
            return objectMapper.writeValueAsString(valeur);
        } catch (Exception ex) {
            throw new IllegalStateException("Corps de requête impossible à sérialiser.", ex);
        }
    }

    // --- Lecture de l'état commité --------------------------------------------

    private BigDecimal quantiteDisponible(Long recolteId) {
        return jdbcTemplate.queryForObject(
                "SELECT quantite_disponible FROM recoltes WHERE id = ?", BigDecimal.class, recolteId);
    }

    private String statutRecolte(Long recolteId) {
        return jdbcTemplate.queryForObject(
                "SELECT statut FROM recoltes WHERE id = ?", String.class, recolteId);
    }

    private int compter(String requete, Object... parametres) {
        Integer total = jdbcTemplate.queryForObject(requete, Integer.class, parametres);
        return total == null ? 0 : total;
    }

    // --- Fabriques commitées -----------------------------------------------------

    /** Une commande réellement créée, pour préparer les scénarios de paiement et d'annulation. */
    private Long creerCommande(Acheteur acheteur, Map<Long, String> quantitesParRecolte) {
        ReponseHttp reponse = passerCommande(acheteur, quantitesParRecolte);
        assertThat(reponse.statut())
                .withFailMessage(() -> "La commande de préparation aurait dû être créée : " + reponse.corps())
                .isEqualTo(201);
        return idDe(reponse);
    }

    private Acheteur creerAcheteur() {
        return committe(() -> {
            Utilisateur utilisateur = new Utilisateur();
            utilisateur.setNom("Sarr");
            utilisateur.setPrenom("Fatou");
            utilisateur.setEmail("acheteur." + suffixeUnique() + "@sunurecolte.sn");
            utilisateur.setTelephone(telephoneUnique());
            utilisateur.setMotDePasse("empreinte-de-mot-de-passe-de-test");
            utilisateur.setRole(Role.ACHETEUR);
            utilisateurRepository.save(utilisateur);
            utilisateursCrees.add(utilisateur.getId());

            Acheteur acheteur = new Acheteur();
            acheteur.setUtilisateur(utilisateur);
            acheteur.setTypeAcheteur(TypeAcheteur.PARTICULIER);
            return acheteurRepository.save(acheteur);
        });
    }

    private Producteur creerProducteur() {
        return committe(() -> {
            Utilisateur utilisateur = new Utilisateur();
            utilisateur.setNom("Fall");
            utilisateur.setPrenom("Moussa");
            utilisateur.setEmail("producteur." + suffixeUnique() + "@sunurecolte.sn");
            utilisateur.setTelephone(telephoneUnique());
            utilisateur.setMotDePasse("empreinte-de-mot-de-passe-de-test");
            utilisateur.setRole(Role.PRODUCTEUR);
            utilisateurRepository.save(utilisateur);
            utilisateursCrees.add(utilisateur.getId());

            Producteur producteur = new Producteur();
            producteur.setUtilisateur(utilisateur);
            producteur.setFiliere(Filiere.MARAICHAGE);
            producteur.setLocalisationExploitation("Thiès");
            return producteurRepository.save(producteur);
        });
    }

    private Recolte creerRecolte(Producteur producteur, String produit, String quantite) {
        return committe(() -> {
            Recolte recolte = new Recolte();
            recolte.setProducteur(producteur);
            recolte.setProduit(produit);
            recolte.setQuantiteDisponible(new BigDecimal(quantite));
            recolte.setUnite("kg");
            recolte.setPrixUnitaire(new BigDecimal("450.00"));
            return recolteRepository.save(recolte);
        });
    }

    /**
     * Chaque fabrique s'ouvre dans sa propre transaction et se valide immédiatement : sans cela,
     * rien de ce que préparent les tests ne serait visible des threads concurrents.
     */
    private <T> T committe(Supplier<T> travail) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        return transaction.execute(ignored -> travail.get());
    }

    private RequestPostProcessor avecJetonDe(Utilisateur utilisateur) {
        String jeton = jwtService.generer(UtilisateurPrincipal.depuis(utilisateur));
        return request -> {
            request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + jeton);
            return request;
        };
    }

    // --- Nettoyage ---------------------------------------------------------------

    @AfterEach
    void supprimerLesDonneesDuTest() {
        if (utilisateursCrees.isEmpty()) {
            return;
        }
        String ids = listeDIds(utilisateursCrees);

        List<Long> commandesDuTest = jdbcTemplate.queryForList(
                "SELECT c.id FROM commandes c JOIN acheteurs a ON a.id = c.acheteur_id"
                        + " WHERE a.utilisateur_id IN (" + ids + ")", Long.class);
        List<Long> recoltesDuTest = jdbcTemplate.queryForList(
                "SELECT r.id FROM recoltes r JOIN producteurs p ON p.id = r.producteur_id"
                        + " WHERE p.utilisateur_id IN (" + ids + ")", Long.class);

        jdbcTemplate.update("DELETE FROM notifications WHERE utilisateur_id IN (" + ids + ")");
        if (!commandesDuTest.isEmpty()) {
            String idsCommandes = listeDIds(commandesDuTest);
            jdbcTemplate.update("DELETE FROM paiements WHERE commande_id IN (" + idsCommandes + ")");
            jdbcTemplate.update("DELETE FROM lignes_commande WHERE commande_id IN (" + idsCommandes + ")");
            jdbcTemplate.update("DELETE FROM commandes WHERE id IN (" + idsCommandes + ")");
        }
        if (!recoltesDuTest.isEmpty()) {
            String idsRecoltes = listeDIds(recoltesDuTest);
            jdbcTemplate.update("DELETE FROM lignes_commande WHERE recolte_id IN (" + idsRecoltes + ")");
            jdbcTemplate.update("DELETE FROM recoltes WHERE id IN (" + idsRecoltes + ")");
        }
        jdbcTemplate.update("DELETE FROM acheteurs WHERE utilisateur_id IN (" + ids + ")");
        jdbcTemplate.update("DELETE FROM producteurs WHERE utilisateur_id IN (" + ids + ")");
        jdbcTemplate.update("DELETE FROM utilisateurs WHERE id IN (" + ids + ")");

        utilisateursCrees.clear();
    }

    /** Des identifiants lus en base, jamais des valeurs saisies : la concaténation reste sûre. */
    private String listeDIds(Collection<Long> ids) {
        StringBuilder requete = new StringBuilder();
        for (Long id : ids) {
            if (!requete.isEmpty()) {
                requete.append(", ");
            }
            requete.append(id);
        }
        return requete.toString();
    }

    private String suffixeUnique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private String telephoneUnique() {
        return "77" + String.format("%07d", Math.abs(UUID.randomUUID().hashCode()) % 10_000_000);
    }

    /** Statut HTTP et corps brut, pour comparer des réponses venues de threads différents. */
    private record ReponseHttp(int statut, String corps) {
    }
}
