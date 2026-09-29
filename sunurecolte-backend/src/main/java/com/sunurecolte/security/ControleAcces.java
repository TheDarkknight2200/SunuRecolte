package com.sunurecolte.security;

import com.sunurecolte.exception.ForbiddenException;
import com.sunurecolte.user.entity.Role;

/**
 * Règles d'accès partagées par les services.
 *
 * Stratégie retenue (Phase 3) : un accès à une ressource dont on n'est pas
 * propriétaire répond 403 Forbidden (et non 404), de façon uniforme sur tous
 * les endpoints. L'administrateur est le seul rôle transverse.
 *
 * Le message ne révèle jamais l'existence ni le contenu de la ressource.
 */
public final class ControleAcces {

    private static final String MESSAGE_REFUS =
            "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.";

    private ControleAcces() {
    }

    /** Exception de refus, à lancer quand la règle ne peut pas s'exprimer par exigerProprietaireOuAdmin. */
    public static ForbiddenException accesRefuse() {
        return new ForbiddenException(MESSAGE_REFUS);
    }

    public static boolean estAdmin(UtilisateurPrincipal principal) {
        return principal.getRole() == Role.ADMIN;
    }

    /**
     * Opérations d'administration (liste des comptes, activation d'un compte, modération
     * d'une récolte, gestion des prix indicatifs) : refus 403 pour tout autre rôle.
     * Toujours vérifié ici en plus de la règle `hasRole("ADMIN")` de `SecurityConfig`,
     * pour que la règle métier reste dans la couche service.
     */
    public static void exigerAdmin(UtilisateurPrincipal principal) {
        if (!estAdmin(principal)) {
            throw accesRefuse();
        }
    }

    /** Le demandeur est le propriétaire de la ressource, ou un administrateur. */
    public static boolean estProprietaireOuAdmin(UtilisateurPrincipal principal, Long idUtilisateurProprietaire) {
        return estAdmin(principal) || idUtilisateurProprietaire.equals(principal.getId());
    }

    public static void exigerProprietaireOuAdmin(UtilisateurPrincipal principal, Long idUtilisateurProprietaire) {
        if (!estProprietaireOuAdmin(principal, idUtilisateurProprietaire)) {
            throw accesRefuse();
        }
    }
}
