package com.sunurecolte.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lancée quand un utilisateur authentifié tente d'accéder à une ressource
 * qui ne lui appartient pas, ou à une action non autorisée pour son rôle (→ 403 Forbidden).
 * Ex : un producteur tente de modifier la récolte d'un autre producteur.
 *
 * Nommée ForbiddenException et non AccessDeniedException pour éviter la collision
 * avec org.springframework.security.access.AccessDeniedException (sécurité Spring).
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
