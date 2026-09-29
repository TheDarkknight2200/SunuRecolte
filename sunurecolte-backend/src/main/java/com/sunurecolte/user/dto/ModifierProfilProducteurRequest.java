package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Filiere;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO d'écriture du profil du producteur connecté (PUT /api/producteurs/moi).
 *
 * Sept champs, toujours envoyés ensemble : le service réécrit les colonnes concernées
 * sans fusion partielle. Ni id, ni rôle, ni « actif », ni mot de passe, ni lien vers le
 * compte : un client qui les ajoute ne les fait pas passer, le record ne les déclare pas.
 *
 * Les bornes viennent du schéma réel : utilisateurs.nom et prenom varchar(100),
 * email varchar(150), telephone varchar(20), producteurs.localisation_exploitation
 * varchar(255). La colonne description est un TEXT : aucune limite n'est inventée ici.
 * Téléphone : aucune contrainte d'unicité n'existe en base, aucune n'est donc ajoutée.
 */
public record ModifierProfilProducteurRequest(

        @NotBlank(message = "Le prénom est obligatoire")
        @Size(max = 100, message = "Le prénom ne peut pas dépasser 100 caractères")
        String prenom,

        @NotBlank(message = "Le nom est obligatoire")
        @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
        String nom,

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        @Size(max = 150)
        String email,

        @NotBlank(message = "Le téléphone est obligatoire")
        @Size(max = 20, message = "Le téléphone ne peut pas dépasser 20 caractères")
        String telephone,

        @Size(max = 255, message = "La localisation ne peut pas dépasser 255 caractères")
        String localisationExploitation,

        @NotNull(message = "La filière est obligatoire")
        Filiere filiere,

        String description
) {}
