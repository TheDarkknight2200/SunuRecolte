package com.sunurecolte.commande.repository;

import com.sunurecolte.commande.entity.Commande;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommandeRepository extends JpaRepository<Commande, Long> {

    List<Commande> findByAcheteurId(Long acheteurId);

    List<Commande> findByAcheteurIdOrderByDateCreationDesc(Long acheteurId);
}
