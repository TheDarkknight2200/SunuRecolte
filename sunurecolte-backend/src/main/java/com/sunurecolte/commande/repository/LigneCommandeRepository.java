package com.sunurecolte.commande.repository;

import com.sunurecolte.commande.entity.LigneCommande;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LigneCommandeRepository extends JpaRepository<LigneCommande, Long> {

    List<LigneCommande> findByCommandeId(Long commandeId);

    boolean existsByRecolteId(Long recolteId);
}
