package com.sunurecolte.commande.dto;

import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO de réponse représentant une commande avec ses lignes.
 */
public record CommandeResponse(
        Long id,
        Long acheteurId,
        String nomAcheteur,
        LocalDateTime dateCreation,
        StatutCommande statut,
        BigDecimal total,
        ModeReception modeReception,
        String adresseLivraison,
        String telephoneLivraison,
        String instructionsLivraison,
        List<LigneCommandeResponse> lignes
) {}
