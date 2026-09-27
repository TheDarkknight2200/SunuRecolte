package com.sunurecolte.user.repository;

import com.sunurecolte.user.entity.Acheteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AcheteurRepository extends JpaRepository<Acheteur, Long> {

    Optional<Acheteur> findByUtilisateurId(Long utilisateurId);

    boolean existsByUtilisateurId(Long utilisateurId);
}
