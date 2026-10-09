package com.sunurecolte.statistiques.projection;

import java.math.BigDecimal;

/**
 * Un producteur dans le classement des revenus : la somme des {@code sous_total} de ses lignes
 * retenues et le nombre de commandes distinctes qui les portent.
 *
 * <p>Seuls l'identifiant, le nom et le prénom sont lus — l'adresse électronique, le téléphone et
 * le mot de passe du compte ne quittent jamais la table {@code utilisateurs} pour une statistique.
 */
public interface TopProducteurProjection {

    Long getProducteurId();

    String getPrenom();

    String getNom();

    BigDecimal getChiffreAffaires();

    long getNombreCommandes();
}
