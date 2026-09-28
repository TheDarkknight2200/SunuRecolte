package com.sunurecolte.config;

import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Amorçage local du compte ADMIN (aucune migration Flyway ne contient de secret).
 *
 * Le compte n'est créé que si un email et un mot de passe sont fournis localement :
 * variable d'environnement APP_ADMIN_PASSWORD (et APP_ADMIN_EMAIL) ou lignes
 * app.admin.email / app.admin.password du fichier application-local.properties,
 * qui est hors Git. Sans mot de passe, l'amorçage est ignoré.
 *
 * Le mot de passe est haché avec le même encodeur BCrypt que l'inscription et
 * n'apparaît jamais dans les journaux. Procédure détaillée : README.md,
 * section « Compte administrateur initial ».
 */
@Slf4j
@Component
public class AdminInitializer implements ApplicationRunner {

    /** Téléphone du compte local : aucune fonctionnalité du MVP ne l'utilise. */
    private static final String TELEPHONE_PAR_DEFAUT = "0000000000";

    /** Même longueur minimale que l'inscription publique. */
    private static final int LONGUEUR_MINIMALE_MOT_DE_PASSE = 6;

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String motDePasse;
    private final String telephone;

    public AdminInitializer(UtilisateurRepository utilisateurRepository,
                            PasswordEncoder passwordEncoder,
                            @Value("${app.admin.email:}") String email,
                            @Value("${app.admin.password:}") String motDePasse,
                            @Value("${app.admin.telephone:" + TELEPHONE_PAR_DEFAUT + "}") String telephone) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.motDePasse = motDePasse;
        this.telephone = telephone;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() || motDePasse.isBlank()) {
            log.info("Compte ADMIN non amorcé : renseignez app.admin.email et app.admin.password "
                    + "(ou APP_ADMIN_EMAIL / APP_ADMIN_PASSWORD) pour créer le compte local.");
            return;
        }
        if (motDePasse.length() < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
            log.warn("Compte ADMIN non amorcé : le mot de passe fourni doit contenir au moins "
                    + LONGUEUR_MINIMALE_MOT_DE_PASSE + " caractères.");
            return;
        }

        String emailNormalise = email.trim().toLowerCase(Locale.ROOT);
        if (utilisateurRepository.existsByEmail(emailNormalise)) {
            log.info("Compte ADMIN : un utilisateur existe déjà pour {} , aucun amorçage.", emailNormalise);
            return;
        }

        Utilisateur admin = new Utilisateur();
        admin.setNom("Administrateur");
        admin.setPrenom("SunuRecolte");
        admin.setEmail(emailNormalise);
        admin.setTelephone(telephone.isBlank() ? TELEPHONE_PAR_DEFAUT : telephone.trim());
        admin.setMotDePasse(passwordEncoder.encode(motDePasse));
        admin.setRole(Role.ADMIN);
        admin.setActif(true);
        utilisateurRepository.save(admin);

        log.info("Compte ADMIN initial créé pour {}.", emailNormalise);
    }
}
