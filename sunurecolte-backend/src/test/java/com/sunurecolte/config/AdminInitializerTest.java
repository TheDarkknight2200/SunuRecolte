package com.sunurecolte.config;

import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de l'amorçage du compte ADMIN (AdminInitializer).
 *
 * Aucune migration Flyway ne contient de secret : le compte n'est créé que si
 * un email et un mot de passe sont fournis localement. Les tests instancient
 * l'amorçeur directement pour vérifier chaque cas de figure.
 */
class AdminInitializerTest extends IntegrationTestSupport {

    private static final String MOT_DE_PASSE = "MotDePasse-Admin-2026";

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void sansConfigurationAucunCompteNEstCree() {
        long nombreAvant = utilisateurRepository.count();

        amorceur("", "", "0000000000").run(null);

        assertThat(utilisateurRepository.count()).isEqualTo(nombreAvant);
    }

    @Test
    void avecUnMotDePasseTropCourtAucunCompteNEstCree() {
        long nombreAvant = utilisateurRepository.count();

        amorceur("admin.court." + suffixeUnique() + "@sunurecolte.sn", "court", "0000000000").run(null);

        assertThat(utilisateurRepository.count()).isEqualTo(nombreAvant);
    }

    @Test
    void unCompteAdminEstCreeAvecUnMotDePasseHacheEtNormalise() {
        String email = "Admin.Local." + suffixeUnique() + "@SunuRecolte.sn";

        amorceur(email, MOT_DE_PASSE, "0000000000").run(null);

        Utilisateur admin = utilisateurRepository.findByEmail(email.toLowerCase()).orElseThrow();
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isActif()).isTrue();
        assertThat(admin.getMotDePasse()).startsWith("$2");
        assertThat(passwordEncoder.matches(MOT_DE_PASSE, admin.getMotDePasse())).isTrue();
    }

    @Test
    void lAmorcageEstIdempotentEtNEcrasePasLeMotDePasseExistant() {
        String email = "admin.idempotent." + suffixeUnique() + "@sunurecolte.sn";
        AdminInitializer amortisseur = amorceur(email, MOT_DE_PASSE, "0000000000");

        amortisseur.run(null);
        String empreinteInitiale = utilisateurRepository.findByEmail(email).orElseThrow().getMotDePasse();

        amortisseur.run(null);

        long occurrences = utilisateurRepository.findAll().stream()
                .filter(utilisateur -> email.equals(utilisateur.getEmail()))
                .count();
        assertThat(occurrences).isEqualTo(1);
        assertThat(utilisateurRepository.findByEmail(email).orElseThrow().getMotDePasse())
                .isEqualTo(empreinteInitiale);
    }

    private AdminInitializer amorceur(String email, String motDePasse, String telephone) {
        return new AdminInitializer(utilisateurRepository, passwordEncoder, email, motDePasse, telephone);
    }
}
