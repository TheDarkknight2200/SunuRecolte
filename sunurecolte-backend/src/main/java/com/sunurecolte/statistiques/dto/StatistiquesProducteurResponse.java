package com.sunurecolte.statistiques.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Statistiques de vente d'un producteur sur une période (lot STAT-1).
 *
 * <p>Toutes les valeurs sont calculées sur les lignes de commande qui concernent ce producteur :
 * une commande peut mélanger les récoltes de plusieurs producteurs, son {@code total} n'est donc
 * jamais utilisée ici. Un producteur sans commande sur la période reçoit des zéros et des listes
 * vides, jamais des valeurs inventées.
 */
public record StatistiquesProducteurResponse(
        BigDecimal chiffreAffaires,
        long nombreCommandes,
        BigDecimal panierMoyen,
        BigDecimal tauxAnnulation,
        List<StatutNombreResponse> repartitionStatuts,
        List<VenteJourResponse> ventesParJour,
        List<TopRecolteResponse> topRecoltes,
        List<StockFaibleResponse> stockFaible,
        long commandesATraiter
) {}
