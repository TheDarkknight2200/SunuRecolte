package com.sunurecolte.statistiques.dto;

import com.sunurecolte.commande.entity.StatutCommande;

/**
 * Nombre de commandes du producteur portant un statut donné sur la période choisie.
 * Le statut reste l'enum Java réelle ({@code StatutCommande}) : aucun libellé inventé,
 * la traduction est du ressort du frontend (referentiels.ts).
 */
public record StatutNombreResponse(
        StatutCommande statut,
        long nombre
) {}
