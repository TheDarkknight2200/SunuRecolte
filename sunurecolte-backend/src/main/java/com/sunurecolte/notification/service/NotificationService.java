package com.sunurecolte.notification.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.notification.dto.NotificationResponse;
import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.notification.repository.NotificationRepository;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Notifications internes (pas de temps réel : consultation REST uniquement).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;

    public List<NotificationResponse> rechercher(Long utilisateurId) {
        List<Notification> notifications;
        if (utilisateurId == null) {
            notifications = notificationRepository.findAllByOrderByDateCreationDesc();
        } else {
            if (!utilisateurRepository.existsById(utilisateurId)) {
                throw new ResourceNotFoundException("Utilisateur", utilisateurId);
            }
            notifications = notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(utilisateurId);
        }
        return notifications.stream().map(this::versResponse).toList();
    }

    public NotificationResponse findById(Long id) {
        return versResponse(trouver(id));
    }

    @Transactional
    public NotificationResponse marquerLue(Long id) {
        Notification notification = trouver(id);
        notification.setLu(true);
        return versResponse(notificationRepository.save(notification));
    }

    /**
     * Création d'une notification destinée à un utilisateur (appelée par les autres services).
     */
    @Transactional
    public void notifier(Utilisateur utilisateur, String titre, String message) {
        Notification notification = new Notification();
        notification.setUtilisateur(utilisateur);
        notification.setTitre(titre);
        notification.setMessage(message);
        notificationRepository.save(notification);
    }

    private Notification trouver(Long id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));
    }

    private NotificationResponse versResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getUtilisateur().getId(),
                notification.getTitre(),
                notification.getMessage(),
                notification.isLu(),
                notification.getDateCreation());
    }
}
