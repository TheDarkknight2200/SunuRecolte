package com.sunurecolte.statistiques.dto;

import java.time.LocalDate;

/**
 * Comptes créés pendant une semaine civile (lot STAT-2), datée de son lundi.
 *
 * <p>Une entrée par semaine de la période, sans trou : une semaine sans inscription est rendue
 * à zéro. La dernière semaine peut être partielle, elle s'arrête au dernier jour de la période.
 * Le rôle ADMIN est absent de ces deux compteurs — un administrateur n'arrive pas par l'inscription
 * publique, il vient de l'amorçage.
 */
public record InscriptionSemaineResponse(
        LocalDate semaineDebut,
        long producteurs,
        long acheteurs
) {}
