package com.sunurecolte.prixmarche.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * DTO d'écriture d'un prix indicatif de marché (administrateur uniquement).
 * Les bornes reprennent colonne par colonne le schéma réel : `produit` et
 * `marche_reference` sont des varchar(150), `unite` un varchar(30) et `prix_moyen`
 * un numeric(10,2) NOT NULL. `date_mise_a_jour` n'est jamais saisi par le client :
 * il est alimenté par l'entité (@PrePersist / @PreUpdate).
 */
public record PrixMarcheRequest(

        @NotBlank(message = "Le produit est obligatoire")
        @Size(max = 150, message = "Le produit ne peut pas dépasser 150 caractères")
        String produit,

        @NotBlank(message = "L'unité est obligatoire")
        @Size(max = 30)
        String unite,

        @NotNull(message = "Le prix moyen est obligatoire")
        @DecimalMin(value = "0.01", message = "Le prix moyen doit être positif")
        @DecimalMax(value = "99999999.99", message = "Le prix moyen dépasse la précision autorisée")
        BigDecimal prixMoyen,

        @Size(max = 150, message = "Le marché de référence ne peut pas dépasser 150 caractères")
        String marcheReference
) {}
