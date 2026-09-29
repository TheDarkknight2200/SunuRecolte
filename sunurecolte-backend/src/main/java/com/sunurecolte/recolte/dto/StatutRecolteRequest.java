package com.sunurecolte.recolte.dto;

import com.sunurecolte.recolte.entity.StatutRecolte;
import jakarta.validation.constraints.NotNull;

/**
 * DTO de modération du statut d'une récolte par l'administrateur.
 * Volontairement séparé de `RecolteRequest` : le formulaire de saisie d'une récolte
 * par un producteur ne porte jamais de statut (le statut est géré par le cycle de vie
 * du stock), ici seule l'administration l'écrit. Seules les valeurs réelles de
 * `StatutRecolte` (DISPONIBLE, EPUISEE) sont acceptées.
 */
public record StatutRecolteRequest(

        @NotNull(message = "Le statut est obligatoire")
        StatutRecolte statut
) {}
