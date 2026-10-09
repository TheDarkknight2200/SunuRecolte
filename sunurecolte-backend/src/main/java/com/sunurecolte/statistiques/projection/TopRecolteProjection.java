package com.sunurecolte.statistiques.projection;

import java.math.BigDecimal;

/**
 * Une ligne par récolte vendue (commandes annulées exclues) : quantité vendue, unité portée
 * par la récolte, et revenu engrangé. `getNom()` lit la colonne réelle `recoltes.produit`,
 * seule appellation d'une récolte dans le modèle approuvé.
 */
public interface TopRecolteProjection {

    Long getRecolteId();

    String getNom();

    BigDecimal getQuantiteVendue();

    String getUnite();

    BigDecimal getRevenu();
}
