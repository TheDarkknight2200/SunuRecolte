package com.sunurecolte.statistiques.projection;

import com.sunurecolte.user.entity.Role;

import java.time.LocalDateTime;

/**
 * Un compte créé sur la période, avec sa date de création et son rôle : le service agrège ensuite
 * ces lignes par semaine civile. Une projection et non des entités — ces comptes servent à compter,
 * jamais à modifier ; et aucun champ personnel (e-mail, téléphone, mot de passe) n'est lu ici.
 */
public interface InscriptionProjection {

    LocalDateTime getDateCreation();

    Role getRole();
}
