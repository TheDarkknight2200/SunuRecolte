package com.sunurecolte.recolte.repository;

import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.user.entity.Filiere;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecolteRepository extends JpaRepository<Recolte, Long> {

    List<Recolte> findByProducteurId(Long producteurId);

    List<Recolte> findByStatut(StatutRecolte statut);

    List<Recolte> findByProduitContainingIgnoreCaseAndStatut(String produit, StatutRecolte statut);

    /**
     * Recherche avec filtres optionnels : un filtre null est ignore.
     * Le CAST force le type varchar du parametre : sans lui, PostgreSQL
     * ne peut pas typer un parametre null et rejette la requete.
     */
    @Query("""
            SELECT r FROM Recolte r
            WHERE (:statut IS NULL OR r.statut = :statut)
              AND (:filiere IS NULL OR r.producteur.filiere = :filiere)
              AND (:producteurId IS NULL OR r.producteur.id = :producteurId)
              AND (:recherche IS NULL
                   OR LOWER(r.produit) LIKE LOWER(CONCAT('%', CAST(:recherche AS string), '%')))
            ORDER BY r.dateCreation DESC
            """)
    List<Recolte> rechercher(@Param("statut") StatutRecolte statut,
                             @Param("filiere") Filiere filiere,
                             @Param("producteurId") Long producteurId,
                             @Param("recherche") String recherche);

    /**
     * Verrou pessimiste en ecriture : utilise lors de la creation d'une commande
     * pour proteger le stock contre les commandes concurrentes.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Recolte r WHERE r.id = :id")
    Optional<Recolte> findByIdForUpdate(@Param("id") Long id);
}
