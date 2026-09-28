package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.TypeAcheteur;

/**
 * DTO de réponse représentant un profil acheteur.
 */
public record AcheteurResponse(
        Long id,
        Long utilisateurId,
        String nom,
        String prenom,
        String email,
        String telephone,
        TypeAcheteur typeAcheteur
) {}
