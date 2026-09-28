package com.sunurecolte.user.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.user.dto.ProducteurRequest;
import com.sunurecolte.user.dto.ProducteurResponse;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.ProducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultation et mise à jour du profil producteur.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProducteurService {

    private final ProducteurRepository producteurRepository;

    public ProducteurResponse findById(Long id) {
        return versResponse(trouver(id));
    }

    @Transactional
    public ProducteurResponse modifier(Long id, ProducteurRequest request) {
        Producteur producteur = trouver(id);
        producteur.setLocalisationExploitation(request.localisationExploitation());
        producteur.setFiliere(request.filiere());
        producteur.setDescription(request.description());
        return versResponse(producteurRepository.save(producteur));
    }

    private Producteur trouver(Long id) {
        return producteurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producteur", id));
    }

    private ProducteurResponse versResponse(Producteur producteur) {
        Utilisateur utilisateur = producteur.getUtilisateur();
        return new ProducteurResponse(
                producteur.getId(),
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getEmail(),
                utilisateur.getTelephone(),
                producteur.getLocalisationExploitation(),
                producteur.getFiliere(),
                producteur.getDescription());
    }
}
