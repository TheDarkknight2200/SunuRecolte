package com.sunurecolte.api;

import com.sunurecolte.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de la documentation OpenAPI : métadonnées de l'API et présence
 * des principaux endpoints publics dans le document généré.
 */
class DocumentationApiTest extends IntegrationTestSupport {

    @Test
    void leDocumentOpenApiExposeLesMetadonneesDeLApplication() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("SunuRecolte API"))
                .andExpect(jsonPath("$.info.description")
                        .value(containsString("API REST de la plateforme SunuRecolte.")))
                .andExpect(jsonPath("$.info.version").value("1.0"));
    }

    @Test
    void lesPrincipauxEndpointsSontDocumentes() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/recoltes']").exists())
                .andExpect(jsonPath("$.paths['/api/recoltes/{id}']").exists())
                .andExpect(jsonPath("$.paths['/api/commandes']").exists())
                .andExpect(jsonPath("$.paths['/api/commandes/{id}/statut']").exists())
                .andExpect(jsonPath("$.paths['/api/paiements']").exists())
                .andExpect(jsonPath("$.paths['/api/notifications']").exists())
                .andExpect(jsonPath("$.paths['/api/prix-marche']").exists())
                .andExpect(jsonPath("$.paths['/api/utilisateurs/{id}']").exists())
                .andExpect(jsonPath("$.paths['/api/producteurs/{id}']").exists())
                .andExpect(jsonPath("$.paths['/api/acheteurs/{id}']").exists());
    }
}
