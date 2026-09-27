package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Role;

import java.time.LocalDateTime;

/**
 * DTO de réponse contenant le JWT et les informations de l'utilisateur connecté.
 */
public record AuthResponse(
        String token,
        Long utilisateurId,
        String nom,
        String prenom,
        String email,
        Role role
) {}
