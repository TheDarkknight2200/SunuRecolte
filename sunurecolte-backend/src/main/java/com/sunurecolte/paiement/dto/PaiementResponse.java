package com.sunurecolte.paiement.dto;

import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO de réponse représentant un paiement.
 */
public record PaiementResponse(
        Long id,
        Long commandeId,
        String referenceTransaction,
        BigDecimal montant,
        MoyenPaiement moyenPaiement,
        StatutPaiement statut,
        LocalDateTime dateCreation,
        LocalDateTime dateConfirmation
) {}
