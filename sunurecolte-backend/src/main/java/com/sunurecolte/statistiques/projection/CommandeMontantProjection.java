package com.sunurecolte.statistiques.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Une ligne par commande retenue (annulées exclues) : la date de la commande et la somme
 * des sous-totaux des lignes du producteur. Le service regroupe ensuite par jour civil et
 * comble les jours sans vente — la requête ne rend donc qu'un seul aller-retour en base.
 */
public interface CommandeMontantProjection {

    Long getCommandeId();

    LocalDateTime getDateCreation();

    BigDecimal getMontant();
}
