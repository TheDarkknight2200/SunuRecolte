package com.sunurecolte.statistiques.projection;

import com.sunurecolte.paiement.entity.MoyenPaiement;

import java.math.BigDecimal;

/**
 * Nombre de paiements et montant total réglés par un moyen (Wave, Orange Money).
 * `montant` est la somme des {@code paiements.montant} — le montant porté par le paiement, pas le
 * total d'une commande qui pourrait mélanger plusieurs producteurs.
 */
public interface MoyenPaiementNombreProjection {

    MoyenPaiement getMoyen();

    long getNombre();

    BigDecimal getMontant();
}
