package com.sunurecolte.recolte.repository;

import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecolteRepository extends JpaRepository<Recolte, Long> {

    List<Recolte> findByProducteurId(Long producteurId);

    List<Recolte> findByStatut(StatutRecolte statut);

    List<Recolte> findByProduitContainingIgnoreCaseAndStatut(String produit, StatutRecolte statut);
}
