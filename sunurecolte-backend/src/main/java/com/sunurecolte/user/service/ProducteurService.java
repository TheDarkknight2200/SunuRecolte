package com.sunurecolte.user.service;

import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ModifierProfilProducteurRequest;
import com.sunurecolte.user.dto.ProducteurRequest;
import com.sunurecolte.user.dto.ProducteurResponse;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

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
    private final UtilisateurRepository utilisateurRepository;

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

    /**
     * Mise à jour du profil du producteur connecté : la cible vient exclusivement du jeton,
     * aucun identifiant n'est accepté du client. Les sept champs sont réécrits à chaque appel,
     * le frontend envoyant toujours le contrat complet (FRONTEND_DESIGN.md §36).
     *
     * Réservé au rôle PRODUCTEUR, comme {@link #moi}. L'email est normalisé puis contrôlé avant
     * écriture : conserver sa propre adresse reste possible, celle d'un autre compte répond 400
     * (même message qu'à l'inscription) plutôt qu'une contrainte SQL remontée en 500.
     */
    @Transactional
    public ProducteurResponse modifierMoi(ModifierProfilProducteurRequest request,
                                           UtilisateurPrincipal principal) {
        if (principal.getRole() != Role.PRODUCTEUR) {
            throw ControleAcces.accesRefuse();
        }
        Producteur producteur = producteurRepository.findByUtilisateurId(principal.getId())
                .orElseThrow(ControleAcces::accesRefuse);

        Utilisateur utilisateur = producteur.getUtilisateur();
        String email = normaliserEmail(request.email());
        verifierEmailLibre(email, utilisateur.getId());

        utilisateur.setPrenom(request.prenom().trim());
        utilisateur.setNom(request.nom().trim());
        utilisateur.setEmail(email);
        utilisateur.setTelephone(request.telephone().trim());
        utilisateurRepository.save(utilisateur);

        producteur.setLocalisationExploitation(texteOuNull(request.localisationExploitation()));
        producteur.setFiliere(request.filiere());
        producteur.setDescription(texteOuNull(request.description()));
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

    /** Même normalisation qu'à l'inscription : la colonne email est unique et stockée en minuscules. */
    private static String normaliserEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Un e-mail déjà pris par un autre compte est refusé ; celui du titulaire reste valide. */
    private void verifierEmailLibre(String email, Long idDuTitulaire) {
        utilisateurRepository.findByEmail(email)
                .filter(unCompte -> !unCompte.getId().equals(idDuTitulaire))
                .ifPresent(unCompte -> {
                    throw new BusinessException("Un compte existe déjà avec cette adresse email.");
                });
    }

    /** Saisie facultative : une chaîne vide n'a pas de sens en base, elle devient null. */
    private static String texteOuNull(String valeur) {
        if (valeur == null) {
            return null;
        }
        String nettoye = valeur.trim();
        return nettoye.isEmpty() ? null : nettoye;
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
