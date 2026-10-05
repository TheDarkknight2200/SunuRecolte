package com.sunurecolte.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lancée quand un couple (email, adresse du client) a dépassé le nombre de tentatives
 * de connexion autorisé (→ 429 Too Many Requests).
 *
 * <p>Porte la durée restante du blocage, en secondes, pour que le gestionnaire centralisé
 * puisse la renvoyer dans l'en-tête {@code Retry-After}. Le message affiché n'est pas porté
 * ici : c'est le gestionnaire d'erreurs qui formule la réponse HTTP, comme pour les autres
 * statuts.
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TropDeTentativesException extends RuntimeException {

    private final long secondesAvantNouvelleTentative;

    public TropDeTentativesException(long secondesAvantNouvelleTentative) {
        super("Trop de tentatives de connexion.");
        this.secondesAvantNouvelleTentative = secondesAvantNouvelleTentative;
    }

    public long secondesAvantNouvelleTentative() {
        return secondesAvantNouvelleTentative;
    }
}
