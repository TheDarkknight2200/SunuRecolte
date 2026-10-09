package com.sunurecolte.statistiques.projection;

/**
 * Nombre de producteurs déclarant une localisation d'exploitation, cette localisation telle qu'elle
 * est saisie. {@code producteurs.localisation_exploitation} est un texte libre : deux grafies d'une
 * même localité donnent deux lignes, que le service rapproche par normalisation.
 */
public interface ZoneNombreProjection {

    String getZone();

    long getNombre();
}
