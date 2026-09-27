package com.sunurecolte.notification.repository;

import com.sunurecolte.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUtilisateurIdOrderByDateCreationDesc(Long utilisateurId);

    List<Notification> findByUtilisateurIdAndLuFalseOrderByDateCreationDesc(Long utilisateurId);
}
