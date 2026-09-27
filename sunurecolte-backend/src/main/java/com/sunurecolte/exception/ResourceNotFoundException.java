package com.sunurecolte.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lancée quand une ressource demandée n'existe pas en base (→ 404 Not Found).
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String ressource, Long id) {
        super(ressource + " introuvable avec l'id : " + id);
    }
}
