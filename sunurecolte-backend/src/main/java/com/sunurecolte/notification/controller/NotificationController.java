package com.sunurecolte.notification.controller;

import com.sunurecolte.notification.dto.NotificationResponse;
import com.sunurecolte.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des notifications.
 * Pas de temps réel dans le MVP : consultation et marquage comme lue uniquement.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> rechercher(
            @RequestParam(required = false) Long utilisateurId) {
        return notificationService.rechercher(utilisateurId);
    }

    @GetMapping("/{id}")
    public NotificationResponse findById(@PathVariable Long id) {
        return notificationService.findById(id);
    }

    @PutMapping("/{id}/lue")
    public NotificationResponse marquerLue(@PathVariable Long id) {
        return notificationService.marquerLue(id);
    }
}
