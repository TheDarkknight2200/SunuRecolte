package com.sunurecolte.user.repository;

import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByTelephone(String telephone);

    /**
     * Liste d'administration : le plus récent d'abord. Le `id` en second critère rend l'ordre
     * déterministe quand plusieurs comptes sont créés dans la même milliseconde.
     */
    List<Utilisateur> findAllByOrderByDateCreationDescIdDesc();

    List<Utilisateur> findByRoleOrderByDateCreationDescIdDesc(Role role);
}
