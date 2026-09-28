package com.sunurecolte.commande.repository;

import com.sunurecolte.commande.entity.Commande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommandeRepository extends JpaRepository<Commande, Long> {

    /** Toutes les commandes, de la plus récente à la plus ancienne (vue administrateur). */
    List<Commande> findAllByOrderByDateCreationDesc();

    List<Commande> findByAcheteurIdOrderByDateCreationDesc(Long acheteurId);

    /** Commandes contenant au moins une récolte du producteur donné. */
    @Query("""
            SELECT DISTINCT c
            FROM Commande c
            JOIN c.lignes l
            WHERE l.recolte.producteur.id = :producteurId
            ORDER BY c.dateCreation DESC
            """)
    List<Commande> findByProducteurIdOrderByDateCreationDesc(@Param("producteurId") Long producteurId);
}
