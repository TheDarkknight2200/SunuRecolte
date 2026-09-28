package com.sunurecolte.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration JWT centralisée (préfixe « jwt »).
 *
 * Le secret n'est jamais versionné : il provient de la variable d'environnement
 * JWT_SECRET (ou de la ligne jwt.secret de application-local.properties, hors Git).
 * La durée d'expiration (jwt.expiration, en millisecondes) est versionnée car non sensible.
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(String secret, long expiration) {
}
