package com.sunurecolte.paiement.repository;

import com.sunurecolte.paiement.entity.Paiement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {

    Optional<Paiement> findByCommandeId(Long commandeId);

    Optional<Paiement> findByReferenceTransaction(String referenceTransaction);
}
