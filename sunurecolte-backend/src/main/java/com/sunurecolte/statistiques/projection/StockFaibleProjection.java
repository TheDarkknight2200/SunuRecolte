package com.sunurecolte.statistiques.projection;

import com.sunurecolte.recolte.entity.StatutRecolte;

import java.math.BigDecimal;

/**
 * Récolte du producteur dont le stock appelle une décision : quantité restante, unité réelle
 * de la récolte et statut (une récolte épuisée rend une quantité à zéro, elle n'est pas inventée).
 */
public interface StockFaibleProjection {

    Long getRecolteId();

    String getNom();

    BigDecimal getQuantiteDisponible();

    String getUnite();

    StatutRecolte getStatut();
}
