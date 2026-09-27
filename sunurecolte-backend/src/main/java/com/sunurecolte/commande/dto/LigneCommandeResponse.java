package com.sunurecolte.commande.dto;

import java.math.BigDecimal;

/**
 * DTO de réponse représentant une ligne de commande.
 */
public record LigneCommandeResponse(
        Long id,
        Long recolteId,
        String produit,
        String unite,
        BigDecimal quantite,
        BigDecimal prixUnitaire,
        BigDecimal sousTotal
) {}
