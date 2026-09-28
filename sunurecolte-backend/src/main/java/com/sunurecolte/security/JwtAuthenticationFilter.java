package com.sunurecolte.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Filtre exécuté une fois par requête : lit l'en-tête « Authorization: Bearer <jeton> »,
 * vérifie le jeton, puis place l'identité authentifiée dans le SecurityContext.
 *
 * Aucune décision d'autorisation n'est prise ici (rôle des règles de SecurityConfig et
 * des contrôles de propriété dans les services) : un jeton absent, expiré ou invalide
 * laisse simplement la requête anonyme, ce qui produit un 401 sur les endpoints protégés.
 * Le rôle et l'état du compte sont relus en base à chaque requête, jamais repris du jeton.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String EN_TETE_AUTORISATION = "Authorization";
    private static final String PREFIXE_BEARER = "Bearer ";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<UtilisateurPrincipal> principal = jwtService.extraireUtilisateurId(jeton(request))
                .flatMap(userDetailsService::chargerParId)
                .filter(UtilisateurPrincipal::isEnabled);

        principal.ifPresent(value -> authentifier(request, value));
        chain.doFilter(request, response);
    }

    private void authentifier(HttpServletRequest request, UtilisateurPrincipal principal) {
        UsernamePasswordAuthenticationToken authentification = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        authentification.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentification);
    }

    private String jeton(HttpServletRequest request) {
        String entete = request.getHeader(EN_TETE_AUTORISATION);
        if (entete == null || !entete.startsWith(PREFIXE_BEARER)) {
            return null;
        }
        return entete.substring(PREFIXE_BEARER.length()).trim();
    }
}
