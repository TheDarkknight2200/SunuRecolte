package com.sunurecolte.statistiques.projection;

import java.math.BigDecimal;

/**
 * Sommes agrégées du producteur sur une période, commandes annulées exclues.
 * `chiffreAffaires` est null quand aucune commande n'est retenue (aucun `SUM` en SQL) :
 * le service le convertit en zéro, la requête n'invente aucun montant.
 */
public interface TotauxVenteProjection {

    BigDecimal getChiffreAffaires();

    long getNombreCommandes();
}
