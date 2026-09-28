package com.sunurecolte.notification.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.notification.dto.NotificationResponse;
import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.notification.repository.NotificationRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Notifications internes (pas de temps réel : consultation REST uniquement).
 *
 * Règles d'accès (Phase 3) : un utilisateur ne consulte et ne marque comme lues
 * que ses propres notifications ; préciser l'identifiant d'un autre utilisateur
 * est refusé (403). L'administrateur reste transverse.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;

    public List<NotificationResponse> rechercher(Long utilisateurId, UtilisateurPrincipal principal) {
        Long cible = utilisateurId;
        if (!ControleAcces.estAdmin(principal)) {
            if (cible != null && !cible.equals(principal.getId())) {
                throw ControleAcces.accesRefuse();
            }
            cible = principal.getId();
        }

        List<Notification> notifications;
        if (cible == null) {
            notifications = notificationRepository.findAllByOrderByDateCreationDesc();
        } else {
            if (!utilisateurRepository.existsById(cible)) {
                throw new ResourceNotFoundException("Utilisateur", cible);
            }
            notifications = notificationRepository.findByUtilisateurIdOrderByDateCreationDesc(cible);
        }
        return notifications.stream().map(this::versResponse).toList();
    }

    public NotificationResponse findById(Long id, UtilisateurPrincipal principal) {
        Notification notification = trouver(id);
        verifierDestinataire(notification, principal);
        return versResponse(notification);
    }

    @Transactional
    public NotificationResponse marquerLue(Long id, UtilisateurPrincipal principal) {
        Notification notification = trouver(id);
        verifierDestinataire(notification, principal);
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

    private void verifierDestinataire(Notification notification, UtilisateurPrincipal principal) {
        ControleAcces.exigerProprietaireOuAdmin(principal, notification.getUtilisateur().getId());
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
