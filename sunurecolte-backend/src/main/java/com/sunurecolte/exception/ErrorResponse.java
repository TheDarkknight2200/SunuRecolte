package com.sunurecolte.exception;

import java.time.LocalDateTime;

/**
 * Réponse d'erreur standard de l'API.
 * Utilisée par le gestionnaire centralisé d'exceptions et par les points d'entrée
 * de sécurité (401/403), afin que toutes les erreurs aient le même format JSON.
 */
public record ErrorResponse(int statut, String message, LocalDateTime timestamp) {
    public ErrorResponse(int statut, String message) {
        this(statut, message, LocalDateTime.now());
    }
}
