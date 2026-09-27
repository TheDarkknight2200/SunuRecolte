package com.sunurecolte.commande.dto;

import com.sunurecolte.commande.entity.ModeReception;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * DTO de création de commande.
 * Règle : si LIVRAISON → adresseLivraison et telephoneLivraison sont obligatoires (vérifiés en service).
 */
public record CommandeRequest(

        @NotNull(message = "Le mode de réception est obligatoire")
        ModeReception modeReception,

        @Size(max = 255)
        String adresseLivraison,

        @Size(max = 20)
        String telephoneLivraison,

        String instructionsLivraison,

        @NotEmpty(message = "La commande doit contenir au moins une ligne")
        @Valid
        List<LigneCommandeRequest> lignes
) {}
