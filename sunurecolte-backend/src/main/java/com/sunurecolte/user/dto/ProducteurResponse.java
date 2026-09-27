package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Filiere;

/**
 * DTO de réponse représentant un profil producteur.
 */
public record ProducteurResponse(
        Long id,
        Long utilisateurId,
        String nom,
        String prenom,
        String email,
        String telephone,
        String localisationExploitation,
        Filiere filiere,
        String description
) {}
