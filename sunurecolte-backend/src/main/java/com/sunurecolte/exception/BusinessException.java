package com.sunurecolte.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lancée quand une règle métier est violée (→ 400 Bad Request).
 * Ex : stock insuffisant, récolte indisponible, commande déjà payée, etc.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
