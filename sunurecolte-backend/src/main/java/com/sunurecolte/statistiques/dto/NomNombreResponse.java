package com.sunurecolte.statistiques.dto;

/**
 * Une catégorie et le nombre d'éléments qu'elle porte : filière d'un producteur, ou zone
 * déclarée par son exploitation.
 *
 * <p>Pour les filières, {@code nom} est le nom de l'enum Java {@code Filiere} — la traduction en français
 * est du ressort du frontend (referentiels.ts), comme pour les statuts de commande de STAT-1.
 * Pour les zones, {@code nom} est la forme saisie la plus fréquente derrière la normalisation.
 */
public record NomNombreResponse(
        String nom,
        long nombre
) {}
