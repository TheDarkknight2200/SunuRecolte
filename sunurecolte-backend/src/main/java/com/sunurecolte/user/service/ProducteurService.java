package com.sunurecolte.user.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ProducteurRequest;
import com.sunurecolte.user.dto.ProducteurResponse;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.ProducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultation et mise à jour du profil producteur.
 *
 * Règles d'accès (Phase 3) : le profil expose l'email et le téléphone ; il est
 * donc réservé au producteur propriétaire ou à l'administrateur (403 sinon).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProducteurService {

    private final ProducteurRepository producteurRepository;

    /**
     * Profil du producteur connecté : l'identifiant vient exclusivement du jeton.
     * Réservé au rôle PRODUCTEUR (403 sinon) ; un ADMIN n'a pas de profil producteur
     * et passe par GET /api/producteurs/{id}.
     */
    public ProducteurResponse moi(UtilisateurPrincipal principal) {
        if (principal.getRole() != Role.PRODUCTEUR) {
            throw ControleAcces.accesRefuse();
        }
        Producteur producteur = producteurRepository.findByUtilisateurId(principal.getId())
                .orElseThrow(ControleAcces::accesRefuse);
        return versResponse(producteur);
    }

    public ProducteurResponse findById(Long id, UtilisateurPrincipal principal) {
        Producteur producteur = trouver(id);
        verifierAcces(producteur, principal);
        return versResponse(producteur);
    }

    @Transactional
    public ProducteurResponse modifier(Long id, ProducteurRequest request,
                                       UtilisateurPrincipal principal) {
        Producteur producteur = trouver(id);
        verifierAcces(producteur, principal);
        producteur.setLocalisationExploitation(request.localisationExploitation());
        producteur.setFiliere(request.filiere());
        producteur.setDescription(request.description());
        return versResponse(producteurRepository.save(producteur));
    }

    private void verifierAcces(Producteur producteur, UtilisateurPrincipal principal) {
        ControleAcces.exigerProprietaireOuAdmin(principal, producteur.getUtilisateur().getId());
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
