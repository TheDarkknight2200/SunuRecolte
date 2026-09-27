package com.sunurecolte.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de connexion (login).
 */
public record ConnexionRequest(

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le mot de passe est obligatoire")
        String motDePasse
) {}
