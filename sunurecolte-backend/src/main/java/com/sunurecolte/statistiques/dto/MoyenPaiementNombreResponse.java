package com.sunurecolte.statistiques.dto;

import com.sunurecolte.paiement.entity.MoyenPaiement;

import java.math.BigDecimal;

/**
 * Paiements regroupés par moyen (lot STAT-2). Le moyen reste l'enum Java réelle,
 * {@code MoyenPaiement}, qui ne compte que {@code WAVE} et {@code ORANGE_MONEY} : la liste
 * n'invente aucun troisième moyen.
 *
 * <p>{@code montant} est la somme des montants portés par les paiements, en simulation comme chaque
 * encaissement du projet.
 */
public record MoyenPaiementNombreResponse(
        MoyenPaiement moyen,
        long nombre,
        BigDecimal montant
) {}
