package com.sunurecolte.statistiques.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Ventes d'une journée civile pour le graphique « ventes par jour ».
 * Les jours sans vente sont rendus avec un montant à zéro : la liste couvre toute la période,
 * sans trou, par construction du service.
 */
public record VenteJourResponse(
        LocalDate date,
        BigDecimal montant
) {}
