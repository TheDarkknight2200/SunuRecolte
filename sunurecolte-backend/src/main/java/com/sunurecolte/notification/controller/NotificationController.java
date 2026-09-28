package com.sunurecolte.notification.controller;

import com.sunurecolte.notification.dto.NotificationResponse;
import com.sunurecolte.notification.service.NotificationService;
import com.sunurecolte.security.UtilisateurPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des notifications.
 * Pas de temps réel dans le MVP : consultation et marquage comme lue uniquement.
 * Les contrôles d'accès sont délégués à NotificationService.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> rechercher(
            @RequestParam(required = false) Long utilisateurId,
            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return notificationService.rechercher(utilisateurId, principal);
    }

    @GetMapping("/{id}")
    public NotificationResponse findById(@PathVariable Long id,
                                         @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return notificationService.findById(id, principal);
    }

    @PutMapping("/{id}/lue")
    public NotificationResponse marquerLue(@PathVariable Long id,
                                           @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return notificationService.marquerLue(id, principal);
    }
}
