package com.sunurecolte.user.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.user.dto.AcheteurResponse;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultation du profil acheteur.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AcheteurService {

    private final AcheteurRepository acheteurRepository;

    public AcheteurResponse findById(Long id) {
        Acheteur acheteur = acheteurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Acheteur", id));
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
