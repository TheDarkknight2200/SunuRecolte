package com.sunurecolte.statistiques.dto;

import java.math.BigDecimal;

/**
 * Récolte du producteur dans le classement des revenus (5 maximum, revenu décroissant).
 * `nom` est la colonne réelle {@code recoltes.produit} — le modèle n'a pas de champ « nom » ;
 * `unite` est celle portée par la récolte, et `quantiteVendue` agrège les lignes retenues.
 */
public record TopRecolteResponse(
        Long recolteId,
        String nom,
        BigDecimal quantiteVendue,
        String unite,
        BigDecimal revenu
) {}
