package com.sunurecolte.commande.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * DTO d'une ligne dans la commande.
 */
public record LigneCommandeRequest(

        @NotNull(message = "L'identifiant de la récolte est obligatoire")
        Long recolteId,

        @NotNull(message = "La quantité est obligatoire")
        @DecimalMin(value = "0.01", message = "La quantité doit être positive")
        BigDecimal quantite
) {}
