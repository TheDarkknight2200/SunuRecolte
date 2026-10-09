package com.sunurecolte.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP de {@code GET /api/admin/statistiques} (lot STAT-2), sur PostgreSQL réel et sans mock.
 *
 * <p><b>Pourquoi tout est mesuré par écarts.</b> La suite s'exécute contre la base locale de
 * développement, la même que celle de l'usage normal : elle porte déjà des comptes, des récoltes et
 * des commandes, et chaque test annule ses propres écritures par rollback. Un compteur transverse ne
 * peut donc pas y être affirmé à une valeur absolue sans inventer un état de base. Chaque test lit
 * d'abord la réponse (la référence), écrit, puis relit : ce qui est vérifié est la <b>différence</b>,
 * et elle est exacte au franc près. Les classements sont vérifiés par bornes (taille, ordre) et par
 * l'entrée créée, jamais par une tête de liste qui dépendrait des données préexistantes.
 *
 * <p>Ce qui est verrouillé ici : les refus par rôle (401 anonyme, 403 PRODUCTEUR, 403 ACHETEUR, 200 ADMIN),
 * l'absence de toute donnée personnelle dans le corps brut, le volume d'affaires à la règle de STAT-1
 * (annulées et remboursées exclues, {@code commandes.total} jamais utilisé), la commande mixte comptée une
 * seule fois, le total des comptes qui exclut l'ADMIN, les récoltes au seul statut DISPONIBLE,
 * l'agrégation par semaine civile sans trou, la filière réellement portée, le regroupement des zones par
 * normalisation et son plafond, la répartition par moyen de paiement et les remboursements, la 400 d'une
 * période inconnue.
 */
class StatistiquesAdminApiTest extends IntegrationTestSupport {

    private static final String URL = "/api/admin/statistiques";

    /** Message du filtre de sécurité pour un rôle insuffisant (RestAccessDeniedHandler). */
    private static final String ACCES_REFUSE =
            "Accès refusé : vous n'avez pas les droits nécessaires pour cette action.";

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // --- Accès ---------------------------------------------------------------

    @Test
    void uneStatistiqueAdminSansJetonRepond401() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statut").value(401))
                .andExpect(jsonPath("$.message")
                        .value("Authentification requise : fournissez un jeton JWT valide."));
    }

    @Test
    void unProducteurNeVoitPasLesStatistiquesDeLaPlateforme() throws Exception {
        mockMvc.perform(get(URL).with(avecJetonDe(creerProducteur().getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message").value(ACCES_REFUSE));
    }

    @Test
    void unAcheteurNeVoitPasLesStatistiquesDeLaPlateforme() throws Exception {
        mockMvc.perform(get(URL).with(avecJetonDe(creerAcheteur().getUtilisateur())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.statut").value(403))
                .andExpect(jsonPath("$.message").value(ACCES_REFUSE));
    }

    @Test
    void unAdministrateurVoitLesStatistiquesDeLaPlateforme() throws Exception {
        JsonNode reponse = lire(null);
        assertThat(reponse.has("volumeAffaires")).isTrue();
        assertThat(reponse.has("repartitionParMoyenPaiement")).isTrue();
        assertThat(reponse.has("inscriptionsParSemaine")).isTrue();
    }

    // --- Aucune donnée personnelle exposée -----------------------------------

    @Test
    void leCorpsBrutNeContientNiEmailNiTelephoneNiMotDePasseNiJeton() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "10.00", "500.00");
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "2.00");
        payerViaApi(acheteur, commande.id(), "WAVE");

        String corps = mockMvc.perform(get(URL).with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Un e-mail porte nécessairement un « @ » : absent du corps, aucun compte n'est nommé.
        assertThat(corps).doesNotContain("@");
        assertThat(corps.toLowerCase(Locale.ROOT)).doesNotContain("motdepass")
                .doesNotContain("telephone")
                .doesNotContain("email")
                .doesNotContain("bearer")
                .doesNotContain("description")
                .doesNotContain("localisation");

        // Une seule lecture du corps : la vérification textuelle et la vérification des champs portent
        // sur exactement la même réponse. La commande créée ci-dessus alimente les deux classements.
        JsonNode corpsJson = objectMapper.readTree(corps);
        assertThat(tableau(corpsJson, "topProducteurs")).isNotEmpty();
        assertThat(tableau(corpsJson, "topRecoltes")).isNotEmpty();
        verifierChamps(corpsJson, "topProducteurs",
                Set.of("producteurId", "nom", "chiffreAffaires", "nombreCommandes"));
        verifierChamps(corpsJson, "topRecoltes",
                Set.of("recolteId", "nom", "quantiteVendue", "unite", "revenu"));
    }

    // --- Période -------------------------------------------------------------

    @Test
    void unePeriodeInconnueRepond400AvecLeMessageDeStat1() throws Exception {
        mockMvc.perform(get(URL).param("periode", "15j").with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statut").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Période inconnue : « 15j ». Valeurs admises : 7j, 30j, mois."));
    }

    @Test
    void leDefautEstTrenteJoursEtLaPeriodeFiltreCommandesVolumeEtSemaines() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        // Référence lue fenêtre par fenêtre : une fenêtre plus courte exclut déjà des commandes
        // préexistantes, un écart ne se mesure donc que contre la même fenêtre.
        Map<String, JsonNode> avant = Map.of(
                "7j", lire("7j"), "30j", lire("30j"), "mois", lire("mois"));

        CommandeResponse recente = creerCommandeViaApi(acheteur, tomate, "2.00");
        CommandeResponse ancienne = creerCommandeViaApi(acheteur, tomate, "4.00");
        retrodater(ancienne.id(), LocalDate.now().minusDays(40));
        assertThat(recente.id()).isNotEqualTo(ancienne.id());

        // 40 jours : hors des trois fenêtres, quel que soit le jour d'exécution du test.
        for (String periode : List.of("7j", "30j", "mois")) {
            JsonNode reponse = lire(periode);
            assertThat(nombre(reponse, "commandesPeriode") - nombre(avant.get(periode), "commandesPeriode"))
                    .as("une seule commande dans la fenêtre « %s »", periode)
                    .isEqualTo(1);
            assertThat(ecart(reponse, avant.get(periode), "volumeAffaires"))
                    .as("volume de la fenêtre « %s » : la vieille commande est exclue", periode)
                    .isEqualByComparingTo(new BigDecimal("900.00"));
            assertThat(tableau(reponse, "inscriptionsParSemaine")).hasSize(semainesCouvertes(ouverture(periode)));
        }

        // Absence de paramètre = la fenêtre de 30 jours : mêmes compteurs, même volume.
        assertThat(ecart(lire(null), lire("30j"), "volumeAffaires")).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(nombre(lire(null), "commandesPeriode")).isEqualTo(nombre(lire("30j"), "commandesPeriode"));
    }

    // --- Volume d'affaires : la règle de STAT-1 ------------------------------

    @Test
    void leVolumeExclutLesCommandesAnnuleesMaisLeurNombreResteCompte() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.00");

        JsonNode avant = lire(null);
        creerCommandeViaApi(acheteur, tomate, "2.00");
        CommandeResponse annulee = creerCommandeViaApi(acheteur, tomate, "4.00");
        annulerViaApi(acheteur, annulee.id());

        JsonNode apres = lire(null);
        // 1 800.00 annulés ne contribuent pas, les 900.00 retenus si.
        assertThat(ecart(apres, avant, "volumeAffaires")).isEqualByComparingTo(new BigDecimal("900.00"));
        // Les deux commandes sont bien passées : le décompte de l'administration les garde toutes les deux.
        assertThat(nombre(apres, "commandesPeriode") - nombre(avant, "commandesPeriode")).isEqualTo(2);
    }

    @Test
    void uneCommandeMixteCompteUneSeuleFoisDansLeVolumeGlobal() throws Exception {
        Producteur premier = creerProducteur();
        Producteur second = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(premier, "Tomate", "100.00", "450.00");
        Recolte oignon = creerRecolte(second, "Oignon", "100.00", "200.00");

        JsonNode avant = lire(null);
        CommandeResponse mixte = creerCommandeViaApi(acheteur, List.of(
                Map.of("recolteId", tomate.getId(), "quantite", "2.00"),
                Map.of("recolteId", oignon.getId(), "quantite", "3.00")));
        // Le total mêle deux producteurs : la preuve qu'il n'est pas lu est la valeur du volume, 1 500.00
        // de lignes retenues, pour UNE seule commande.
        assertThat(mixte.total()).isEqualByComparingTo(new BigDecimal("1500.00"));

        JsonNode apres = lire(null);
        assertThat(nombre(apres, "commandesPeriode") - nombre(avant, "commandesPeriode"))
                .as("une commande, deux producteurs")
                .isEqualTo(1);
        assertThat(ecart(apres, avant, "volumeAffaires")).isEqualByComparingTo(new BigDecimal("1500.00"));
    }

    @Test
    void unRemboursementSimuleNentrePasDansLeVolumeDAffaires() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "500.00");

        JsonNode avant = lire(null);
        CommandeResponse commande = creerCommandeViaApi(acheteur, tomate, "4.00");
        payerViaApi(acheteur, commande.id(), "WAVE");
        annulerViaApi(acheteur, commande.id());

        JsonNode apres = lire(null);
        assertThat(ecart(apres, avant, "volumeAffaires")).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(nombre(apres, "commandesPeriode") - nombre(avant, "commandesPeriode")).isEqualTo(1);
    }

    @Test
    void lesDeuxTopsSontOrdonnesParRevenuEtPlafonnesACinq() throws Exception {
        JsonNode avant = lire(null);
        // Pour observer le sommet du classement producteurs, l'apport créé dépasse strictement le premier
        // actuel. On reste sous 1 000 000.00 : `producteurs.prix_unitaire` est un numeric(10,2) et
        // 99 999 999.99 est la valeur maximale admise en base, un plafond plus haut ferait échouer
        // l'INSERT pour une raison étrangère à ce qui est testé.
        List<JsonNode> tete = tableau(avant, "topProducteurs");
        BigDecimal meneur = tete.isEmpty() ? BigDecimal.ZERO : decimal(tete.get(0), "chiffreAffaires");
        BigDecimal apport = meneur.min(new BigDecimal("990000.00")).add(new BigDecimal("1000.00"));

        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte recolte = creerRecolte(producteur, "ProduitDuTest", "1.00", apport.toPlainString());
        creerCommandeViaApi(acheteur, recolte, "1.00");

        JsonNode apres = lire(null);
        List<JsonNode> producteurs = tableau(apres, "topProducteurs");
        assertThat(producteurs).hasSizeLessThanOrEqualTo(5);
        assertThat(producteurs.get(0).get("producteurId").asLong()).isEqualTo(producteur.getId());
        // Une seule unité vendue au prix demandé : le classement lit la ligne, pas un total inventé.
        assertThat(decimal(producteurs.get(0), "chiffreAffaires")).isEqualByComparingTo(apport);
        assertThat(producteurs.get(0).get("nombreCommandes").asLong()).isEqualTo(1);
        assertThat(producteurs.get(0).get("nom").asText()).isEqualTo("Awa Diop");
        for (int rang = 1; rang < producteurs.size(); rang++) {
            assertThat(decimal(producteurs.get(rang - 1), "chiffreAffaires"))
                    .isGreaterThanOrEqualTo(decimal(producteurs.get(rang), "chiffreAffaires"));
        }

        List<JsonNode> recoltes = tableau(apres, "topRecoltes");
        assertThat(recoltes).hasSizeLessThanOrEqualTo(5);
        for (int rang = 1; rang < recoltes.size(); rang++) {
            assertThat(decimal(recoltes.get(rang - 1), "revenu"))
                    .isGreaterThanOrEqualTo(decimal(recoltes.get(rang), "revenu"));
        }
        // Aucune classe « autre » n'est ajoutée : seule l'unité portée par la récolte sort.
        assertThat(recoltes).allMatch(ligne -> !ligne.get("unite").asText().isBlank());
    }

    // --- Comptes, récoltes actives -------------------------------------------

    @Test
    void leTotalDesComptesExclutLAdministrateur() throws Exception {
        JsonNode avant = lire(null);
        creerProducteur();
        creerAcheteur();
        creerAcheteur();
        creerAdministrateur();

        JsonNode apres = lire(null);
        assertThat(nombre(apres, "producteurs") - nombre(avant, "producteurs")).isEqualTo(1);
        assertThat(nombre(apres, "acheteurs") - nombre(avant, "acheteurs")).isEqualTo(2);
        // Un administrateur n'est pas une inscription publique : ni dans son compteur, ni dans le total.
        assertThat(nombre(apres, "utilisateursTotal") - nombre(avant, "utilisateursTotal")).isEqualTo(3);
        assertThat(nombre(apres, "utilisateursTotal"))
                .isEqualTo(nombre(apres, "producteurs") + nombre(apres, "acheteurs"));
    }

    @Test
    void lesRecoltesActivesSontLesSeulesRecoltesDisponibles() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();

        JsonNode avant = lire(null);
        creerRecolte(producteur, "Concombre", "30.00", "300.00");
        Recolte epuisee = creerRecolte(producteur, "Piment", "2.00", "400.00");
        // Vendue entièrement : le service de commande la passe à EPUISEE.
        creerCommandeViaApi(acheteur, epuisee, "2.00");

        assertThat(nombre(lire(null), "recoltesActives") - nombre(avant, "recoltesActives"))
                .as("une récolte reste disponible, l'autre est épuisée")
                .isEqualTo(1);
    }

    // --- Inscriptions par semaine --------------------------------------------

    @Test
    void lesInscriptionsAgregentParSemaineCivileSansTrou() throws Exception {
        JsonNode avant = lire("30j");
        // Trois comptes créés aujourd'hui, tous dans la semaine du lundi courant.
        creerProducteur();
        creerAcheteur();
        creerAcheteur();

        JsonNode reponse = lire("30j");
        List<JsonNode> semaines = tableau(reponse, "inscriptionsParSemaine");
        assertThat(semaines).isNotEmpty();
        assertThat(semaines.get(0).get("semaineDebut").asText())
                .isEqualTo(lundiDe(LocalDate.now().minusDays(29)).toString());
        assertThat(semaines.get(semaines.size() - 1).get("semaineDebut").asText())
                .isEqualTo(lundiDe(LocalDate.now()).toString());
        // Sans trou : chaque lundi suit le précédent de exactement sept jours, y compris une semaine vide.
        for (int rang = 1; rang < semaines.size(); rang++) {
            assertThat(LocalDate.parse(semaines.get(rang).get("semaineDebut").asText()))
                    .isEqualTo(LocalDate.parse(semaines.get(rang - 1).get("semaineDebut").asText()).plusDays(7));
        }
        assertThat(somme(semaines, "producteurs") - somme(tableau(avant, "inscriptionsParSemaine"), "producteurs"))
                .isEqualTo(1);
        assertThat(somme(semaines, "acheteurs") - somme(tableau(avant, "inscriptionsParSemaine"), "acheteurs"))
                .isEqualTo(2);
    }

    // --- Filières et zones ---------------------------------------------------

    @Test
    void laFiliereRendueEstCellePorteeParLeProducteur() throws Exception {
        JsonNode avant = lire(null);
        creerProducteur(Filiere.CEREALES);

        JsonNode reponse = lire(null);
        assertThat(nombreDeNom(tableau(reponse, "repartitionParFiliere"), "CEREALES"))
                .isEqualTo(nombreDeNom(tableau(avant, "repartitionParFiliere"), "CEREALES") + 1);
        // Une filière sans producteur n'est pas inventée.
        assertThat(tableau(reponse, "repartitionParFiliere")).allMatch(ligne -> ligne.get("nombre").longValue() > 0);
    }

    @Test
    void lesZonesSontRegroupeesParNormalisationEtPlafonneesAHuit() throws Exception {
        // Une même localité en quatre saisies, plus une exploitation sans localisation renseignée.
        // Deux formes « Zona Test Alpha » : c'est elle que le service affiche, la plus fréquente.
        nommerZone(creerProducteur(), "Zona Test Alpha");
        nommerZone(creerProducteur(), "Zona Test Alpha");
        nommerZone(creerProducteur(), "zona test alpha");
        nommerZone(creerProducteur(), "  ZONA   TEST   ALPHA  ");
        nommerZone(creerProducteur(), null);

        JsonNode reponse = lire(null);
        List<JsonNode> zones = tableau(reponse, "repartitionParZone");
        assertThat(zones).hasSizeLessThanOrEqualTo(8);

        List<JsonNode> correspondantes = zones.stream()
                .filter(ligne -> "zona test alpha".equals(normaliser(ligne.get("nom").asText())))
                .toList();
        assertThat(correspondantes).hasSize(1);
        assertThat(correspondantes.get(0).get("nom").asText()).isEqualTo("Zona Test Alpha");
        assertThat(correspondantes.get(0).get("nombre").longValue()).isGreaterThanOrEqualTo(4);
    }

    // --- Paiements -----------------------------------------------------------

    @Test
    void laRepartitionParMoyenEtLesRemboursesSuiventLesCommandesDeLaPeriode() throws Exception {
        Producteur producteur = creerProducteur();
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "500.00");

        JsonNode avant = lire(null);
        CommandeResponse payee = creerCommandeViaApi(acheteur, tomate, "2.00");
        payerViaApi(acheteur, payee.id(), "WAVE");
        CommandeResponse annulee = creerCommandeViaApi(acheteur, tomate, "2.00");
        payerViaApi(acheteur, annulee.id(), "ORANGE_MONEY");
        annulerViaApi(acheteur, annulee.id());

        JsonNode apres = lire(null);
        assertThat(ecartMoyen(apres, avant, "WAVE", "nombre").longValueExact()).isEqualTo(1);
        assertThat(ecartMoyen(apres, avant, "WAVE", "montant")).isEqualByComparingTo(new BigDecimal("1000.00"));
        // Une annulation laisse son paiement derrière elle : le moyen garde la ligne, le remboursement aussi.
        assertThat(ecartMoyen(apres, avant, "ORANGE_MONEY", "nombre").longValueExact()).isEqualTo(1);
        assertThat(nombre(apres, "nombreRembourses") - nombre(avant, "nombreRembourses")).isEqualTo(1);
        // L'enum ne compte que deux moyens : aucun « autre » n'apparaît, parce qu'aucun n'existe.
        assertThat(tableau(apres, "repartitionParMoyenPaiement"))
                .allMatch(ligne -> List.of("WAVE", "ORANGE_MONEY").contains(ligne.get("moyen").asText()));
    }

    // --- Aides locales -------------------------------------------------------

    private JsonNode lire(String periode) throws Exception {
        var requete = get(URL);
        if (periode != null) {
            requete = requete.param("periode", periode);
        }
        String corps = mockMvc.perform(requete.with(avecJetonDe(creerAdministrateur())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(corps);
    }

    private static long nombre(JsonNode reponse, String champ) {
        return reponse.get(champ).longValue();
    }

    /** Un montant rendu par la réponse, lu sans perte d'échelle. */
    private static BigDecimal decimal(JsonNode ligne, String champ) {
        return ligne.get(champ).decimalValue();
    }

    private static BigDecimal ecart(JsonNode apres, JsonNode avant, String champ) {
        return apres.get(champ).decimalValue().subtract(avant.get(champ).decimalValue())
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** Une ligne de liste rendue par le record, copiée dans une {@code List} pour les assertions. */
    private static List<JsonNode> tableau(JsonNode reponse, String champ) {
        List<JsonNode> lignes = new ArrayList<>();
        reponse.get(champ).forEach(lignes::add);
        return lignes;
    }

    /** Chaque ligne d'un classement expose exactement ces champs, ni plus (fuite), ni moins (contrat cassé). */
    private static void verifierChamps(JsonNode reponse, String champ, Set<String> attendus) {
        tableau(reponse, champ).forEach(ligne -> {
            Set<String> reels = new TreeSet<>();
            ligne.fieldNames().forEachRemaining(reels::add);
            assertThat(reels).isEqualTo(attendus);
        });
    }

    private static long somme(List<JsonNode> lignes, String champ) {
        return lignes.stream().mapToLong(ligne -> ligne.get(champ).longValue()).sum();
    }

    private static long nombreDeNom(List<JsonNode> lignes, String nom) {
        return lignes.stream()
                .filter(ligne -> nom.equals(ligne.get("nom").asText()))
                .mapToLong(ligne -> ligne.get("nombre").longValue())
                .findFirst()
                .orElse(0L);
    }

    private static BigDecimal ecartMoyen(JsonNode apres, JsonNode avant, String moyen, String champ) {
        return valeurMoyen(apres, moyen, champ).subtract(valeurMoyen(avant, moyen, champ))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** Nombre ou montant d'un moyen de paiement, zéro si la base ne porte encore aucun paiement de ce moyen. */
    private static BigDecimal valeurMoyen(JsonNode reponse, String moyen, String champ) {
        return tableau(reponse, "repartitionParMoyenPaiement").stream()
                .filter(ligne -> moyen.equals(ligne.get("moyen").asText()))
                .findFirst()
                .map(ligne -> "montant".equals(champ)
                        ? ligne.get("montant").decimalValue()
                        : BigDecimal.valueOf(ligne.get("nombre").longValue()))
                .orElse(BigDecimal.ZERO);
    }

    private void nommerZone(Producteur producteur, String zone) {
        producteur.setLocalisationExploitation(zone);
        producteurRepository.save(producteur);
    }

    /** Ouverture civile de la fenêtre demandée, pour compter les semaines attendues. */
    private static LocalDate ouverture(String periode) {
        LocalDate aujourdhui = LocalDate.now();
        return switch (periode) {
            case "7j" -> aujourdhui.minusDays(6);
            case "mois" -> aujourdhui.withDayOfMonth(1);
            default -> aujourdhui.minusDays(29);
        };
    }

    private static LocalDate lundiDe(LocalDate jour) {
        return jour.minusDays(jour.getDayOfWeek().getValue() - 1L);
    }

    /** Nombre de semaines civiles touchées entre le jour donné et aujourd'hui, bornes incluses. */
    private static int semainesCouvertes(LocalDate debut) {
        return (int) ChronoUnit.WEEKS.between(lundiDe(debut), lundiDe(LocalDate.now())) + 1;
    }

    private static String normaliser(String valeur) {
        return Normalizer.normalize(valeur.trim().replaceAll("\\s+", " "), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }

    /**
     * Recule la date de création d'une commande en base : le filtre de période se lit sur cette colonne,
     * et le flush est nécessaire — sans lui l'UPDATE de JDBC partirait avant l'INSERT encore différé
     * de Hibernate et ne toucherait aucune ligne.
     */
    private void retrodater(Long commandeId, LocalDate date) {
        entityManager.flush();
        int lignesModifiees = jdbcTemplate.update(
                "UPDATE commandes SET date_creation = ? WHERE id = ?",
                Timestamp.valueOf(date.atStartOfDay()), commandeId);
        assertThat(lignesModifiees).isEqualTo(1);
    }

    private void payerViaApi(Acheteur acheteur, Long commandeId, String moyen) throws Exception {
        mockMvc.perform(post("/api/paiements")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"commandeId\": " + commandeId + ", \"moyenPaiement\": \"" + moyen + "\"}"))
                .andExpect(status().isCreated());
    }

    private void annulerViaApi(Acheteur acheteur, Long commandeId) throws Exception {
        mockMvc.perform(patch("/api/commandes/{id}/statut", commandeId)
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statut\": \"ANNULEE\"}"))
                .andExpect(status().isOk());
    }

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, Recolte recolte, String quantite)
            throws Exception {
        return creerCommandeViaApi(acheteur, List.of(
                Map.of("recolteId", recolte.getId(), "quantite", quantite)));
    }

    private CommandeResponse creerCommandeViaApi(Acheteur acheteur, List<Map<String, Object>> lignes)
            throws Exception {
        Map<String, Object> corps = new HashMap<>();
        corps.put("acheteurId", acheteur.getId());
        corps.put("modeReception", "RETRAIT");
        corps.put("lignes", lignes);

        String reponse = mockMvc.perform(post("/api/commandes")
                        .with(avecJetonDe(acheteur.getUtilisateur()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(corps)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readValue(reponse, CommandeResponse.class);
    }
}
