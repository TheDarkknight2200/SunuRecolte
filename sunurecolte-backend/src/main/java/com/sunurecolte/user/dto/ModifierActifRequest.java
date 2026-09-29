package com.sunurecolte.user.dto;

import jakarta.validation.constraints.NotNull;

/**
 * DTO d'activation / désactivation d'un compte (opération d'administration).
 * Le type `Boolean` et non `boolean` permet de distinguer l'absence de la valeur
 * `false` ; l'absence répond 400 par la validation, jamais une désactivation implicite.
 */
public record ModifierActifRequest(

        @NotNull(message = "L'état actif est obligatoire")
        Boolean actif
) {}
