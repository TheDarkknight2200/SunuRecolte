package com.sunurecolte.user.controller;

import com.sunurecolte.user.dto.AuthResponse;
import com.sunurecolte.user.dto.ConnexionRequest;
import com.sunurecolte.user.dto.InscriptionRequest;
import com.sunurecolte.user.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints publics d'authentification (/api/auth/**).
 *
 * L'inscription renvoie directement un jeton : l'utilisateur est connecté
 * à l'issue de la création de son compte.
 * Aucun jeton n'est requis pour ces deux endpoints (documentation OpenAPI).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@SecurityRequirements
public class AuthController {

    private final AuthService authService;

    @PostMapping("/inscription")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse inscrire(@Valid @RequestBody InscriptionRequest request) {
        return authService.inscrire(request);
    }

    @PostMapping("/connexion")
    public AuthResponse connecter(@Valid @RequestBody ConnexionRequest request) {
        return authService.connecter(request);
    }
}
