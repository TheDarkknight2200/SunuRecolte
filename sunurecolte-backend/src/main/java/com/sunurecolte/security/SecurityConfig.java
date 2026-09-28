package com.sunurecolte.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuration de sécurité TEMPORAIRE (Phase 2).
 *
 * Spring Security est présent sur le classpath : sans configuration explicite,
 * toutes les requêtes seraient rejetées en 401 (y compris Swagger UI).
 *
 * Cette configuration ouvre donc tous les endpoints sans authentification.
 * Elle sera remplacée en Phase 3 par l'authentification JWT (filtre JWT,
 * contrôle des rôles, endpoints /api/auth/...).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
