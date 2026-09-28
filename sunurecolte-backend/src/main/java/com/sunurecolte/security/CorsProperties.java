package com.sunurecolte.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Origines autorisées pour les appels du navigateur (CORS).
 * Par défaut le frontend Angular local : http://localhost:4200.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> originesAutorisees) {
}
