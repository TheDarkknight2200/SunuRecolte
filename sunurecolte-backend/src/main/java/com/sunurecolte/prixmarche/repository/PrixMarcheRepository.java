package com.sunurecolte.prixmarche.repository;

import com.sunurecolte.prixmarche.entity.PrixMarche;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrixMarcheRepository extends JpaRepository<PrixMarche, Long> {

    List<PrixMarche> findAllByOrderByProduitAsc();

    Optional<PrixMarche> findByProduitIgnoreCase(String produit);
}
