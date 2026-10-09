package com.sunurecolte.statistiques.dto;

import java.math.BigDecimal;

/**
 * Producteur dans le classement des apports (5 maximum, volume décroissant).
 *
 * <p>{@code nom} est le prénom suivi du nom du compte, dans l'ordre utilisé partout dans l'interface.
 * Aucune donnée personnelle utile à un classement n'y figure : ni adresse électronique, ni téléphone,
 * ni mot de passe.
 */
public record TopProducteurResponse(
        Long producteurId,
        String nom,
        BigDecimal chiffreAffaires,
        long nombreCommandes
) {}
