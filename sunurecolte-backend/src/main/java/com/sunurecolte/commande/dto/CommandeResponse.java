package com.sunurecolte.commande.dto;

import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.StatutPaiement;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO de réponse représentant une commande avec ses lignes.
 *
 * `statutPaiement` et `moyenPaiement` sont nullables : une commande sans paiement
 * rend `null`, l'API n'invente jamais de paiement pour elle. Ces deux champs sont
 * ajoutés en fin de record, après `lignes`, pour ne casser aucun appelant positionnel.
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
        List<LigneCommandeResponse> lignes,
        StatutPaiement statutPaiement,
        MoyenPaiement moyenPaiement
) {}
