package com.sunurecolte.prixmarche.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO de réponse représentant un prix indicatif de marché.
 */
public record PrixMarcheResponse(
        Long id,
        String produit,
        String unite,
        BigDecimal prixMoyen,
        String marcheReference,
        LocalDateTime dateMiseAJour
) {}
