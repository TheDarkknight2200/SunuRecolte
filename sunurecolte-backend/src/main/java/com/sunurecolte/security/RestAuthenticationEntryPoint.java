package com.sunurecolte.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sunurecolte.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Réponse 401 lorsque la requête n'est pas authentifiée (jeton absent, expiré,
 * invalide, ou compte désactivé). Produit le même JSON que les autres erreurs :
 * jamais de page HTML, jamais de détail interne ni de jeton dans la réponse.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        log.warn("Requête non authentifiée sur {} {}.", request.getMethod(), request.getRequestURI());

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(),
                new ErrorResponse(HttpStatus.UNAUTHORIZED.value(),
                        "Authentification requise : fournissez un jeton JWT valide."));
    }
}
