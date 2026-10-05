package com.sunurecolte.user.controller;

import com.sunurecolte.user.dto.AuthResponse;
import com.sunurecolte.user.dto.ConnexionRequest;
import com.sunurecolte.user.dto.InscriptionRequest;
import com.sunurecolte.user.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.HttpServletRequest;
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
 *
 * La connexion transmet l'adresse vue par le serveur au service, seule information dont
 * {@link com.sunurecolte.security.LimiteTentativesConnexion} ait besoin pour compter les essais
 * ratés. L'entête {@code X-Forwarded-For} est volontairement ignoré : un client peut y mettre
 * l'adresse qu'il veut et échapper ainsi à sa propre limite. Derrière un proxy inverse, ce n'est
 * pas ce code qu'il faut modifier mais la résolution d'adresse (par exemple
 * {@code server.forward-headers-strategy=FRAMEWORK} avec un proxy de confiance déclaré), sinon
 * toutes les requêtes arrivent avec l'adresse du proxy et le blocage frapperait tout le monde.
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
    public AuthResponse connecter(@Valid @RequestBody ConnexionRequest request,
                                  HttpServletRequest requete) {
        return authService.connecter(request, requete.getRemoteAddr());
    }
}
