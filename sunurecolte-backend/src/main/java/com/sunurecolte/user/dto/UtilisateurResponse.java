package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Role;

import java.time.LocalDateTime;

/**
 * DTO de réponse représentant un utilisateur (sans mot de passe).
 */
public record UtilisateurResponse(
        Long id,
        String nom,
        String prenom,
        String email,
        String telephone,
        Role role,
        LocalDateTime dateCreation,
        boolean actif
) {}
