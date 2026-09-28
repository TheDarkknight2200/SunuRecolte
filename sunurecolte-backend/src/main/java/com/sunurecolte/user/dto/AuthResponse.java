package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Role;

/**
 * DTO de réponse contenant le JWT et les informations de l'utilisateur connecté.
 * Ne contient jamais le mot de passe ni son empreinte.
 */
public record AuthResponse(
        String token,
        Long utilisateurId,
        String nom,
        String prenom,
        String email,
        Role role
) {}
