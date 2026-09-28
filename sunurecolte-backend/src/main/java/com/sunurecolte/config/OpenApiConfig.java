package com.sunurecolte.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Métadonnées exposées dans Swagger UI / OpenAPI 3.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sunuRecolteOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SunuRecolte API")
                        .description("API REST de la plateforme SunuRecolte")
                        .version("1.0"));
    }
}
