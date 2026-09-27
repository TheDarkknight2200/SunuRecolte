package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Filiere;
import jakarta.validation.constraints.NotNull;

/**
 * DTO pour créer ou mettre à jour le profil producteur.
 */
public record ProducteurRequest(

        String localisationExploitation,

        @NotNull(message = "La filière est obligatoire")
        Filiere filiere,

        String description
) {}
