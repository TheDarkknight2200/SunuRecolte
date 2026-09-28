package com.sunurecolte.user.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.UtilisateurResponse;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultation des comptes utilisateurs (le mot de passe n'est jamais exposé).
 *
 * Règles d'accès (Phase 3) : le profil expose l'email et le téléphone ; il est
 * donc réservé au titulaire du compte ou à l'administrateur (403 sinon).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    public UtilisateurResponse findById(Long id, UtilisateurPrincipal principal) {
        ControleAcces.exigerProprietaireOuAdmin(principal, id);
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        return versResponse(utilisateur);
    }

    static UtilisateurResponse versResponse(Utilisateur utilisateur) {
        return new UtilisateurResponse(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getEmail(),
                utilisateur.getTelephone(),
                utilisateur.getRole(),
                utilisateur.getDateCreation(),
                utilisateur.isActif());
    }
}
