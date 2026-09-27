package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Role;

/**
 * Rôles autorisés pour une inscription publique.
 *
 * ADMIN est volontairement absent de cette énumération : un compte administrateur
 * ne peut pas être créé via l'API d'inscription. Cette restriction est structurelle
 * (la valeur ADMIN ne peut pas être désérialisée), et non une simple règle de validation.
 * Le compte administrateur est créé hors inscription publique (initialisation de données).
 */
public enum RoleInscription {
    PRODUCTEUR,
    ACHETEUR;

    /** Role persisté correspondant au rôle d'inscription. */
    public Role versRole() {
        return switch (this) {
            case PRODUCTEUR -> Role.PRODUCTEUR;
            case ACHETEUR -> Role.ACHETEUR;
        };
    }
}
