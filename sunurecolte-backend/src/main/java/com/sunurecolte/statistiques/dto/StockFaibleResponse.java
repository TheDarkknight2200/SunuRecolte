package com.sunurecolte.statistiques.dto;

import com.sunurecolte.recolte.entity.StatutRecolte;

import java.math.BigDecimal;

/**
 * Récolte dont le stock appelle une décision : sous le seuil du service ou déjà épuisée.
 * Les valeurs viennent de la table {@code recoltes} ; rien n'est déduit d'un hypothétique
 * réapprovisionnement.
 */
public record StockFaibleResponse(
        Long recolteId,
        String nom,
        BigDecimal quantiteDisponible,
        String unite,
        StatutRecolte statut
) {}
