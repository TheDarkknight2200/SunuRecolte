package com.sunurecolte.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Horloge système unique, injectée là où le temps qui passe est une règle métier
 * (aujourd'hui : {@link com.sunurecolte.security.LimiteTentativesConnexion}).
 *
 * <p>Passer par un bean plutôt que par {@code Instant.now()} permet aux tests de déplacer le
 * temps au lieu d'attendre qu'il passe : une fenêtre de quinze minutes se vérifie en dix lignes,
 * jamais par un sommeil de quinze minutes.
 */
@Configuration
public class HorlogeConfiguration {

    @Bean
    Clock horloge() {
        return Clock.systemUTC();
    }
}
