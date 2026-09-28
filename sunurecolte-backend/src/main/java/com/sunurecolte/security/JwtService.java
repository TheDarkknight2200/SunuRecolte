package com.sunurecolte.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Émission et lecture des jetons JWT (HS256, signature symétrique).
 *
 * Le secret est validé au démarrage : l'application refuse de se lancer si
 * JWT_SECRET est absent ou fait moins de 32 octets (minimum HS256).
 * Ni le secret ni le contenu d'un jeton ne sont journalisés.
 */
@Slf4j
@Service
public class JwtService {

    private static final int LONGUEUR_MINIMALE_SECRET_OCTETS = 32;
    private static final String CLAIM_UTILISATEUR_ID = "utilisateurId";

    private final SecretKey cle;
    private final long expirationMillisecondes;

    public JwtService(JwtProperties proprietes) {
        String secret = proprietes.secret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "Secret JWT absent : définissez la variable d'environnement JWT_SECRET "
                            + "(ou la propriété jwt.secret dans application-local.properties, hors Git).");
        }
        byte[] octets = secret.getBytes(StandardCharsets.UTF_8);
        if (octets.length < LONGUEUR_MINIMALE_SECRET_OCTETS) {
            throw new IllegalStateException(
                    "Secret JWT trop court (" + octets.length + " octets) : HS256 exige au moins "
                            + LONGUEUR_MINIMALE_SECRET_OCTETS + " octets. Renseignez un secret plus long "
                            + "dans JWT_SECRET.");
        }
        if (proprietes.expiration() <= 0) {
            throw new IllegalStateException(
                    "Durée d'expiration JWT invalide (jwt.expiration doit être strictement positive).");
        }
        this.cle = Keys.hmacShaKeyFor(octets);
        this.expirationMillisecondes = proprietes.expiration();
    }

    public String generer(UtilisateurPrincipal principal) {
        Instant emission = Instant.now();
        return Jwts.builder()
                .subject(principal.getUsername())
                .claim(CLAIM_UTILISATEUR_ID, principal.getId())
                .issuedAt(Date.from(emission))
                .expiration(Date.from(emission.plusMillis(expirationMillisecondes)))
                // Algorithme fixé explicitement (et non choisi selon la taille de la clé) :
                // le comportement est ainsi identique quel que soit l'environnement.
                .signWith(cle, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Vérifie la signature et la date d'expiration, puis retourne l'identifiant
     * de l'utilisateur porté par le jeton. Un jeton absent, malformé, expiré ou
     * signé avec une autre clé donne un Optional vide (jamais d'exception
     * remontée au client).
     */
    public Optional<Long> extraireUtilisateurId(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(cle)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Number identifiant = claims.get(CLAIM_UTILISATEUR_ID, Number.class);
            return (identifiant == null) ? Optional.empty() : Optional.of(identifiant.longValue());
        } catch (JwtException | IllegalArgumentException exception) {
            // Jamais le jeton ni le secret dans les logs : uniquement la nature de l'échec.
            log.debug("Jeton JWT rejeté : {}", exception.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
