package com.sunurecolte.statistiques.service;

import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.exception.BusinessException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

/**
 * Règles de calcul communes aux deux écrans de statistiques (lot STAT-1 producteur,
 * lot STAT-2 administration) : le découpage de la période, les statuts de commande dont
 * les lignes contribuent aux sommes, et l'arrondi monétaire.
 *
 * <p>Extraites ici plutôt que dupliquées : un chiffre d'affaires et un « volume d'affaires »
 * qui ne suivraient pas la même règle seraient incomparables. La sémantique est celle validée
 * par les tests de STAT-1, inchangée.
 */
final class ReglesStatistiques {

    private static final String PERIODE_SEPT_JOURS = "7j";
    private static final String PERIODE_TRENTE_JOURS = "30j";
    private static final String PERIODE_MOIS = "mois";

    /** Nombre d'éléments exposés par un classement (top récoltes de STAT-1, deux tops de STAT-2). */
    static final int NOMBRE_TOP = 5;

    /**
     * Statuts dont les lignes de commande contribuent aux sommes, commandes annulées exclues.
     * Dans le modèle approuvé aucun statut « refusée » n'existe, et {@code REMBOURSE} est un statut
     * de paiement que seule l'annulation écrit : exclure {@code ANNULEE} exclut donc les remboursements.
     */
    static final Set<StatutCommande> STATUTS_RETENUS =
            EnumSet.of(StatutCommande.EN_ATTENTE, StatutCommande.CONFIRMEE,
                    StatutCommande.PRETE, StatutCommande.LIVREE);

    private ReglesStatistiques() {
    }

    /**
     * Bornes civiles de la période demandée : {@code 7j} = les 7 jours civils courants,
     * {@code 30j} (défaut, aussi pour une valeur absente ou blanche) = les 30 jours civils
     * courants, {@code mois} = du 1ᵉʳ du mois courant à aujourd'hui. Toute autre valeur répond 400.
     */
    static Bornes bornes(String periode) {
        LocalDate aujourdhui = LocalDate.now();
        String valeur = (periode == null || periode.isBlank()) ? PERIODE_TRENTE_JOURS : periode;
        return switch (valeur) {
            case PERIODE_SEPT_JOURS -> new Bornes(aujourdhui.minusDays(6), aujourdhui);
            case PERIODE_TRENTE_JOURS -> new Bornes(aujourdhui.minusDays(29), aujourdhui);
            case PERIODE_MOIS -> new Bornes(aujourdhui.withDayOfMonth(1), aujourdhui);
            default -> throw new BusinessException("Période inconnue : « " + valeur
                    + " ». Valeurs admises : 7j, 30j, mois.");
        };
    }

    /** Un {@code null} du SQL (aucune ligne agrégée) devient un zéro à deux décimales, jamais un montant inventé. */
    static BigDecimal arrondir(BigDecimal valeur) {
        return (valeur == null ? BigDecimal.ZERO : valeur).setScale(2, RoundingMode.HALF_UP);
    }

    /** Lundi de la semaine civile contenant ce jour : repère d'agrégation des inscriptions. */
    static LocalDate lundiDeLaSemaine(LocalDate jour) {
        return jour.minusDays(jour.getDayOfWeek().getValue() - 1L);
    }

    /** Clé de regroupement insensible à la casse, aux accents et aux espaces superflus. */
    static String normaliser(String libelle) {
        return Normalizer.normalize(libelle.trim().replaceAll("\\s+", " "), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }

    /** Bornes civiles inclusives de la période demandée. */
    record Bornes(LocalDate debut, LocalDate fin) {

        /** Instant inclusif d'ouverture de la fenêtre. */
        LocalDateTime debutInstant() {
            return debut.atStartOfDay();
        }

        /** Instant exclusif de fermeture : le lendemain du dernier jour de la période, à minuit. */
        LocalDateTime finInstant() {
            return fin.plusDays(1).atStartOfDay();
        }
    }
}
