package com.sunurecolte.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Métadonnées exposées dans Swagger UI / OpenAPI 3.
 *
 * Le schéma bearerAuth (HTTP Bearer, format JWT) est appliqué par défaut à tous
 * les endpoints ; les endpoints publics le désactivent avec @SecurityRequirements.
 */
@Configuration
public class OpenApiConfig {

    private static final String SCHEMA_JETON = "bearerAuth";

    @Bean
    public OpenAPI sunuRecolteOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SunuRecolte API")
                        .description("""
                                API REST de la plateforme SunuRecolte.
                                Obtenir un jeton via POST /api/auth/inscription ou POST /api/auth/connexion,
                                puis utiliser « Authorize » et saisir le jeton (le préfixe « Bearer » est
                                ajouté automatiquement).""")
                        .version("1.0"))
                .components(new Components().addSecuritySchemes(SCHEMA_JETON,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Jeton JWT renvoyé par /api/auth/inscription ou /api/auth/connexion.")))
                .addSecurityItem(new SecurityRequirement().addList(SCHEMA_JETON));
    }
}
