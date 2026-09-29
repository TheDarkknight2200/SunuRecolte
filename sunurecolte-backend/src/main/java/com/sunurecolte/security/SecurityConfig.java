package com.sunurecolte.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuration de sécurité de l'API (Phase 3 : authentification JWT).
 *
 * Matrice d'accès retenue (analyse des entités et endpoints réels) :
 * - PUBLIC : inscription, connexion (/api/auth/**), documentation OpenAPI, et la
 *   consultation du catalogue (GET /api/recoltes, GET /api/recoltes/{id},
 *   GET /api/prix-marche...) : un visiteur non connecté doit pouvoir consulter
 *   les récoltes et les prix avant de créer un compte ;
 * - PRODUCTEUR : publier et modifier ses récoltes, faire évoluer les commandes ;
 * - ACHETEUR : commander, payer, annuler sa propre commande ;
 * - ADMIN : accès transverse en écriture sur les récoltes, les commandes et les
 *   paiements (même doctrine que les contrôles d'ownership des services) ;
 * - tout le reste exige une authentification, puis un contrôle de propriété
 *   dans les services (403 sinon).
 *
 * CSRF : désactivé car l'API est sans état et le jeton JWT est transmis dans
 * l'en-tête Authorization, jamais dans un cookie. Aucun cookie de session n'étant
 * utilisé, une requête forgée par un autre site ne peut pas porter les identifiants
 * de l'utilisateur : la protection CSRF (qui protège les cookies) est donc sans objet.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties({JwtProperties.class, CorsProperties.class})
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                           JwtAuthenticationFilter filtreJwt,
                                           RestAuthenticationEntryPoint entreeNonAuthentifie,
                                           RestAccessDeniedHandler accesRefuse,
                                           @Qualifier("corsConfigurationSource") CorsConfigurationSource sourceCors)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(sourceCors))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(erreurs -> erreurs
                        .authenticationEntryPoint(entreeNonAuthentifie)
                        .accessDeniedHandler(accesRefuse))
                .authorizeHttpRequests(acces -> acces
                        // Préflight CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Inscription, connexion et documentation
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        // Récoltes personnelles : à déclarer avant le GET public, dont le
                        // motif /api/recoltes/* couvrirait aussi cette URL.
                        .requestMatchers(HttpMethod.GET, "/api/recoltes/mes-recoltes").hasRole("PRODUCTEUR")
                        // Catalogue : consultation publique
                        .requestMatchers(HttpMethod.GET, "/api/recoltes", "/api/recoltes/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/prix-marche", "/api/prix-marche/*").permitAll()
                        // Récoltes : écriture réservée aux producteurs (ADMIN en secours)
                        .requestMatchers(HttpMethod.POST, "/api/recoltes").hasAnyRole("PRODUCTEUR", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/recoltes/*").hasAnyRole("PRODUCTEUR", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/recoltes/*").hasAnyRole("PRODUCTEUR", "ADMIN")
                        // Commandes : création par un acheteur, évolution du statut par les parties prenantes
                        .requestMatchers(HttpMethod.POST, "/api/commandes").hasAnyRole("ACHETEUR", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/commandes/*/statut")
                        .hasAnyRole("ACHETEUR", "PRODUCTEUR", "ADMIN")
                        // Paiements : un acheteur paie sa commande
                        .requestMatchers(HttpMethod.POST, "/api/paiements").hasAnyRole("ACHETEUR", "ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(filtreJwt, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties proprietes) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(proprietes.originesAutorisees());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        // Le jeton circule dans l'en-tête Authorization : aucun cookie, donc pas de credentials.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
