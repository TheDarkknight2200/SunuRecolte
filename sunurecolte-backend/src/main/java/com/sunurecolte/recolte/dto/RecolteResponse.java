package com.sunurecolte.recolte.dto;

import com.sunurecolte.recolte.entity.StatutRecolte;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO de réponse représentant une récolte.
 */
public record RecolteResponse(
        Long id,
        Long producteurId,
        String nomProducteur,
        String localisationProducteur,
        String produit,
        String description,
        BigDecimal quantiteDisponible,
        BigDecimal quantiteMin,
        BigDecimal quantiteMax,
        String unite,
        BigDecimal prixUnitaire,
        String imageUrl,
        String localisation,
        LocalDate dateDisponibilite,
        StatutRecolte statut,
        LocalDateTime dateCreation
) {}
