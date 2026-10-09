package com.sunurecolte.statistiques.projection;

import com.sunurecolte.user.entity.Role;

/**
 * Nombre de comptes portés par un rôle, sur toute la base.
 * Le rôle ADMIN est rendu comme les autres : c'est au service de décider ce qu'il en affiche.
 */
public interface EffectifRoleProjection {

    Role getRole();

    long getNombre();
}
