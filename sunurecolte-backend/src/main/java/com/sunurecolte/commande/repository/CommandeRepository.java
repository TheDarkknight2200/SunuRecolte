package com.sunurecolte.commande.repository;

import com.sunurecolte.commande.entity.Commande;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommandeRepository extends JpaRepository<Commande, Long> {

    /** Toutes les commandes, de la plus récente à la plus ancienne (vue administrateur). */
    List<Commande> findAllByOrderByDateCreationDesc();

    List<Commande> findByAcheteurIdOrderByDateCreationDesc(Long acheteurId);

    /**
     * Verrou pessimiste en écriture, dans le style de {@code RecolteRepository.findByIdForUpdate} :
     * l'annulation, la confirmation et le paiement d'une même commande doivent se sérialiser sur cette
     * ligne. Le statut lu ici est la version commitée : sans ce verrou, deux requêtes simultanées
     * lisent toutes deux EN_ATTENTE, et l'annulation rend le stock deux fois.
     *
     * <p>Le délai d'attente est déclaré comme garde-fou, mais il est mesuré inerte : avec
     * {@code spring.jpa.show-sql} activé, aucune requête {@code SET LOCAL lock_timeout} n'est émise —
     * le dialecte PostgreSQL ne traduit pas {@code jakarta.persistence.lock.timeout}, et
     * {@code FOR NO KEY UPDATE} ne porte pas de durée d'attente. L'absence de blocage indéfini repose
     * donc sur la brièveté des sections critiques des services (aucun appel externe sous verrou), pas
     * sur ce hint.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000"))
    @Query("SELECT c FROM Commande c WHERE c.id = :id")
    Optional<Commande> findByIdForUpdate(@Param("id") Long id);

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
