package com.sunurecolte.paiement.repository;

import com.sunurecolte.paiement.entity.Paiement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {

    Optional<Paiement> findByCommandeId(Long commandeId);

    /** Paiements de plusieurs commandes, en une seule requête : évite un appel par commande. */
    List<Paiement> findByCommandeIdIn(Collection<Long> commandeIds);

    Optional<Paiement> findByReferenceTransaction(String referenceTransaction);
}
