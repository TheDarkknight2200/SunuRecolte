package com.sunurecolte.recolte.dto;

import com.sunurecolte.recolte.entity.StatutRecolte;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO de création ou de mise à jour d'une récolte.
 * Les quantités et le prix doivent être strictement positifs.
 */
public record RecolteRequest(

        @NotBlank(message = "Le produit est obligatoire")
        @Size(max = 150, message = "Le produit ne peut pas dépasser 150 caractères")
        String produit,

        String description,

        @NotNull(message = "La quantité disponible est obligatoire")
        @DecimalMin(value = "0.01", message = "La quantité disponible doit être positive")
        BigDecimal quantiteDisponible,

        @DecimalMin(value = "0.01", message = "La quantité minimale doit être positive")
        BigDecimal quantiteMin,

        @DecimalMin(value = "0.01", message = "La quantité maximale doit être positive")
        BigDecimal quantiteMax,

        @NotBlank(message = "L'unité est obligatoire")
        @Size(max = 30)
        String unite,

        @NotNull(message = "Le prix unitaire est obligatoire")
        @DecimalMin(value = "0.01", message = "Le prix unitaire doit être positif")
        BigDecimal prixUnitaire,

        String imageUrl,

        String localisation,

        LocalDate dateDisponibilite
) {}
