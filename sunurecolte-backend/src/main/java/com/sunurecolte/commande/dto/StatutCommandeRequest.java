package com.sunurecolte.commande.dto;

import com.sunurecolte.commande.entity.StatutCommande;
import jakarta.validation.constraints.NotNull;

/**
 * DTO de changement de statut d'une commande.
 */
public record StatutCommandeRequest(

        @NotNull(message = "Le statut est obligatoire")
        StatutCommande statut
) {}
