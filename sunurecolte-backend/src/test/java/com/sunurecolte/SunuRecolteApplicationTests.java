package com.sunurecolte;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test de démarrage du socle technique.
 *
 * Ce test charge le contexte Spring complet et vérifie donc réellement :
 * - la configuration (application.properties + secrets locaux hors Git) ;
 * - la connexion à la base PostgreSQL "sunurecolte" ;
 * - l'exécution de la migration Flyway V1 ;
 * - le mapping JPA des 9 entités, contrôlé par Hibernate en ddl-auto=validate
 *   (un écart entre une entité et une table ferait échouer le démarrage).
 *
 * Il nécessite une base PostgreSQL locale accessible avec les identifiants
 * définis dans application-local.properties.
 */
@SpringBootTest
class SunuRecolteApplicationTests {

    private static final List<String> TABLES_ATTENDUES = List.of(
            "utilisateurs",
            "producteurs",
            "acheteurs",
            "recoltes",
            "commandes",
            "lignes_commande",
            "paiements",
            "notifications",
            "prix_marche"
    );

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Environment environment;

    @Test
    void leContexteSpringDemarre() {
        // Le chargement du contexte suffit : Flyway migre, Hibernate valide.
        assertThat(jdbcTemplate).isNotNull();
    }

    @Test
    void flywayACreeLesNeufTablesDuModele() {
        List<String> tables = jdbcTemplate.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'",
                String.class
        );
        assertThat(tables).containsAll(TABLES_ATTENDUES);
    }

    @Test
    void laMigrationV1EstAppliqueeEtReussie() {
        Integer migrationsReussies = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where version = '1' and success = true",
                Integer.class
        );
        assertThat(migrationsReussies).isEqualTo(1);
    }

    @Test
    void hibernateNeModifiePasLeSchemaMaisLeValide() {
        assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
    }
}
