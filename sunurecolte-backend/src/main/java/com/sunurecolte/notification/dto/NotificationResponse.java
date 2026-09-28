package com.sunurecolte.notification.dto;

import java.time.LocalDateTime;

/**
 * DTO de réponse représentant une notification.
 */
public record NotificationResponse(
        Long id,
        Long utilisateurId,
        String titre,
        String message,
        boolean lu,
        LocalDateTime dateCreation
) {}
