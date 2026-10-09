package com.sunurecolte.statistiques.projection;

import com.sunurecolte.user.entity.Filiere;

/**
 * Nombre de producteurs exerçant dans une filière. Seules les filières réellement portées par
 * un producteur sont rendues : le service n'invente aucune ligne à zéro pour une filière absente.
 */
public interface FiliereNombreProjection {

    Filiere getFiliere();

    long getNombre();
}
