package com.sunurecolte.statistiques.projection;

import com.sunurecolte.commande.entity.StatutCommande;

/**
 * Nombre de commandes du producteur portant un statut donné sur la période.
 * Une commande mélangeant plusieurs producteurs n'est comptée qu'une fois par statut.
 */
public interface StatutNombreProjection {

    StatutCommande getStatut();

    long getNombre();
}
