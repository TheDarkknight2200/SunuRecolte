package com.sunurecolte.user.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.sunurecolte.user.entity.Role;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Vérifie la protection structurelle de l'inscription publique :
 * le rôle ADMIN ne peut pas être obtenu, même avec un corps JSON forgé
 * manuellement (aucune validation frontend n'intervient ici).
 */
class InscriptionRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void lesRolesProducteurEtAcheteurSontAcceptes() throws Exception {
        InscriptionRequest producteur = objectMapper.readValue(corpsJson("PRODUCTEUR"), InscriptionRequest.class);
        assertThat(producteur.role().versRole()).isEqualTo(Role.PRODUCTEUR);

        InscriptionRequest acheteur = objectMapper.readValue(corpsJson("ACHETEUR"), InscriptionRequest.class);
        assertThat(acheteur.role().versRole()).isEqualTo(Role.ACHETEUR);
    }

    @Test
    void leRoleAdminEstRejeteMemeDansUnCorpsJsonManipule() {
        // En API, cet echec de deserialisation devient un HTTP 400
        // (HttpMessageNotReadableException) : aucune requete ADMIN n'atteint le service.
        assertThatThrownBy(() -> objectMapper.readValue(corpsJson("ADMIN"), InscriptionRequest.class))
                .isInstanceOf(InvalidFormatException.class);
    }

    @Test
    void lesRolesDInscriptionNeContiennentQueProducteurEtAcheteur() {
        assertThat(List.of(RoleInscription.values()))
                .extracting(Enum::name)
                .containsExactlyInAnyOrder("PRODUCTEUR", "ACHETEUR");
    }

    private String corpsJson(String role) {
        return """
                {
                  "nom": "Diop",
                  "prenom": "Awa",
                  "email": "awa.diop@sunurecolte.sn",
                  "telephone": "771234567",
                  "motDePasse": "secret123",
                  "role": "%s"
                }
                """.formatted(role);
    }
}
