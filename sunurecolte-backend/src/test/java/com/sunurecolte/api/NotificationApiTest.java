package com.sunurecolte.api;

import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests HTTP des endpoints /api/notifications : consultation et marquage comme lue.
 * Le MVP n'a pas de temps réel : uniquement de la consultation REST.
 */
class NotificationApiTest extends IntegrationTestSupport {

    @Test
    void laListeFiltreeParUtilisateurRepond200() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        creerNotification(utilisateur, "Commande 1");
        creerNotification(utilisateur, "Commande 2");

        mockMvc.perform(get("/api/notifications")
                        .with(avecJetonDe(utilisateur))
                        .param("utilisateurId", String.valueOf(utilisateur.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].utilisateurId").value(utilisateur.getId()))
                .andExpect(jsonPath("$[0].lu").value(false));
    }

    @Test
    void laListePourUnUtilisateurInconnuRepond404() throws Exception {
        // Seul un administrateur peut viser l'identifiant d'un autre utilisateur :
        // le contrat 404 est donc verifie avec un jeton ADMIN.
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/notifications")
                        .with(avecJetonDe(admin))
                        .param("utilisateurId", "999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Utilisateur introuvable avec l'id : 999999"));
    }

    @Test
    void consulterUneNotificationRepond200() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.PRODUCTEUR);
        Notification notification = creerNotification(utilisateur, "Nouvelle commande");

        mockMvc.perform(get("/api/notifications/{id}", notification.getId())
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Nouvelle commande"))
                .andExpect(jsonPath("$.message").value("Contenu de la notification."))
                .andExpect(jsonPath("$.dateCreation").exists());
    }

    @Test
    void marquerUneNotificationCommeLueRepond200EtPersiste() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        Notification notification = creerNotification(utilisateur, "Suivi de commande");

        mockMvc.perform(put("/api/notifications/{id}/lue", notification.getId())
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lu").value(true));

        mockMvc.perform(get("/api/notifications/{id}", notification.getId())
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lu").value(true));
    }

    @Test
    void marquerUneNotificationDejaLueResteIdempotent() throws Exception {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        Notification notification = creerNotification(utilisateur, "Suivi de commande");

        mockMvc.perform(put("/api/notifications/{id}/lue", notification.getId())
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/notifications/{id}/lue", notification.getId())
                        .with(avecJetonDe(utilisateur)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lu").value(true));
    }

    @Test
    void uneNotificationInconnueRepond404() throws Exception {
        Utilisateur admin = creerAdministrateur();

        mockMvc.perform(get("/api/notifications/{id}", 999_999L)
                        .with(avecJetonDe(admin)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Notification introuvable avec l'id : 999999"));
    }

    // --- Fabrique locale ---------------------------------------------------

    private Notification creerNotification(Utilisateur utilisateur, String titre) {
        Notification notification = new Notification();
        notification.setUtilisateur(utilisateur);
        notification.setTitre(titre);
        notification.setMessage("Contenu de la notification.");
        return notificationRepository.save(notification);
    }
}
