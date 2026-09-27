package com.sunurecolte.paiement.dto;

import com.sunurecolte.paiement.entity.MoyenPaiement;
import jakarta.validation.constraints.NotNull;

/**
 * DTO pour initier un paiement (simulation/sandbox dans le MVP).
 */
public record PaiementRequest(

        @NotNull(message = "L'identifiant de la commande est obligatoire")
        Long commandeId,

        @NotNull(message = "Le moyen de paiement est obligatoire")
        MoyenPaiement moyenPaiement
) {}
