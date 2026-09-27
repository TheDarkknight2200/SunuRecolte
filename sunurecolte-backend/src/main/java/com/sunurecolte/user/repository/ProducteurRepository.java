package com.sunurecolte.user.repository;

import com.sunurecolte.user.entity.Producteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProducteurRepository extends JpaRepository<Producteur, Long> {

    Optional<Producteur> findByUtilisateurId(Long utilisateurId);

    boolean existsByUtilisateurId(Long utilisateurId);
}
