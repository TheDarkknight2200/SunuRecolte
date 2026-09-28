package com.sunurecolte.user.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.AcheteurResponse;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultation du profil acheteur.
 *
 * Règles d'accès (Phase 3) : le profil expose l'email et le téléphone ; il est
 * donc réservé à l'acheteur propriétaire ou à l'administrateur (403 sinon).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AcheteurService {

    private final AcheteurRepository acheteurRepository;

    public AcheteurResponse findById(Long id, UtilisateurPrincipal principal) {
        Acheteur acheteur = acheteurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Acheteur", id));
        ControleAcces.exigerProprietaireOuAdmin(principal, acheteur.getUtilisateur().getId());
        return versResponse(acheteur);
    }

    private AcheteurResponse versResponse(Acheteur acheteur) {
        Utilisateur utilisateur = acheteur.getUtilisateur();
        return new AcheteurResponse(
                acheteur.getId(),
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getEmail(),
                utilisateur.getTelephone(),
                acheteur.getTypeAcheteur());
    }
}
