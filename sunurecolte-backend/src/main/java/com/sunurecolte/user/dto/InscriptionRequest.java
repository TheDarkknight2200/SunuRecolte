package com.sunurecolte.user.dto;

import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.TypeAcheteur;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO d'inscription d'un nouvel utilisateur.
 *
 * Le rôle est de type {@link RoleInscription} (PRODUCTEUR ou ACHETEUR) :
 * un compte ADMIN ne peut pas être obtenu via l'inscription publique,
 * y compris par un appel HTTP forgé manuellement.
 *
 * L'inscription crée aussi le profil correspondant. Les colonnes filiere
 * (producteur) et type_acheteur (acheteur) sont obligatoires en base :
 * le champ correspondant au rôle choisi est donc exigé par le service.
 *
 * Le mot de passe exige au moins 8 caractères à la création. Cette règle n'est pas
 * reprise dans {@link ConnexionRequest} : un compte créé plus tôt avec 6 ou 7 caractères
 * doit continuer à pouvoir se connecter.
 */
public record InscriptionRequest(

        @NotBlank(message = "Le nom est obligatoire")
        @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
        String nom,

        @NotBlank(message = "Le prénom est obligatoire")
        @Size(max = 100, message = "Le prénom ne peut pas dépasser 100 caractères")
        String prenom,

        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        @Size(max = 150)
        String email,

        @NotBlank(message = "Le téléphone est obligatoire")
        @Size(max = 20, message = "Le téléphone ne peut pas dépasser 20 caractères")
        String telephone,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
        String motDePasse,

        @NotNull(message = "Le rôle est obligatoire")
        RoleInscription role,

        /** Obligatoire pour un compte PRODUCTEUR. */
        Filiere filiere,

        /** Obligatoire pour un compte ACHETEUR. */
        TypeAcheteur typeAcheteur
) {}
