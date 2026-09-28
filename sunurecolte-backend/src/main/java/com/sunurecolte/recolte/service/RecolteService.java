package com.sunurecolte.recolte.service;

import com.sunurecolte.commande.repository.LigneCommandeRepository;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.recolte.dto.RecolteRequest;
import com.sunurecolte.recolte.dto.RecolteResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.ProducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Gestion des récoltes publiées par les producteurs.
 *
 * Règles métier :
 * - une récolte appartient à un seul producteur (le producteur ne peut pas être changé) ;
 * - une récolte utilisée dans une commande ne peut pas être supprimée ;
 * - le statut EPUISEE est attribué automatiquement quand le stock tombe à zéro
 *   (voir CommandeService) et redevient DISPONIBLE si du stock est réapprovisionné.
 *
 * Règles d'accès (Phase 3) : la consultation reste publique ; la création,
 * la modification et la suppression sont réservées au producteur propriétaire
 * ou à l'administrateur (403 sinon).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecolteService {

    private final RecolteRepository recolteRepository;
    private final ProducteurRepository producteurRepository;
    private final LigneCommandeRepository ligneCommandeRepository;

    public List<RecolteResponse> rechercher(StatutRecolte statut, Filiere filiere, String recherche) {
        String rechercheNettoyee = (recherche == null || recherche.isBlank()) ? null : recherche.trim();
        return recolteRepository.rechercher(statut, filiere, rechercheNettoyee)
                .stream()
                .map(this::versResponse)
                .toList();
    }

    public RecolteResponse findById(Long id) {
        return versResponse(trouver(id));
    }

    @Transactional
    public RecolteResponse creer(RecolteRequest request, UtilisateurPrincipal principal) {
        Producteur producteur = producteurRepository.findById(request.producteurId())
                .orElseThrow(() -> new ResourceNotFoundException("Producteur", request.producteurId()));
        ControleAcces.exigerProprietaireOuAdmin(principal, producteur.getUtilisateur().getId());
        validerCoherenceQuantites(request);

        Recolte recolte = new Recolte();
        recolte.setProducteur(producteur);
        appliquer(recolte, request);
        recolte.setStatut(StatutRecolte.DISPONIBLE);
        return versResponse(recolteRepository.save(recolte));
    }

    @Transactional
    public RecolteResponse modifier(Long id, RecolteRequest request, UtilisateurPrincipal principal) {
        Recolte recolte = trouver(id);
        ControleAcces.exigerProprietaireOuAdmin(
                principal, recolte.getProducteur().getUtilisateur().getId());
        if (!recolte.getProducteur().getId().equals(request.producteurId())) {
            throw new BusinessException("Le producteur d'une récolte ne peut pas être modifié.");
        }
        validerCoherenceQuantites(request);

        appliquer(recolte, request);
        if (recolte.getStatut() == StatutRecolte.EPUISEE
                && recolte.getQuantiteDisponible().compareTo(BigDecimal.ZERO) > 0) {
            recolte.setStatut(StatutRecolte.DISPONIBLE);
        }
        return versResponse(recolteRepository.save(recolte));
    }

    @Transactional
    public void supprimer(Long id, UtilisateurPrincipal principal) {
        Recolte recolte = trouver(id);
        ControleAcces.exigerProprietaireOuAdmin(
                principal, recolte.getProducteur().getUtilisateur().getId());
        if (ligneCommandeRepository.existsByRecolteId(id)) {
            throw new BusinessException(
                    "Cette récolte est utilisée dans une commande et ne peut pas être supprimée.");
        }
        recolteRepository.delete(recolte);
    }

    private Recolte trouver(Long id) {
        return recolteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recolte", id));
    }

    private void validerCoherenceQuantites(RecolteRequest request) {
        BigDecimal min = request.quantiteMin();
        BigDecimal max = request.quantiteMax();
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new BusinessException("La quantité minimale ne peut pas dépasser la quantité maximale.");
        }
    }

    private void appliquer(Recolte recolte, RecolteRequest request) {
        recolte.setProduit(request.produit());
        recolte.setDescription(request.description());
        recolte.setQuantiteDisponible(request.quantiteDisponible());
        recolte.setQuantiteMin(request.quantiteMin());
        recolte.setQuantiteMax(request.quantiteMax());
        recolte.setUnite(request.unite());
        recolte.setPrixUnitaire(request.prixUnitaire());
        recolte.setImageUrl(request.imageUrl());
        recolte.setLocalisation(request.localisation());
        recolte.setDateDisponibilite(request.dateDisponibilite());
    }

    private RecolteResponse versResponse(Recolte recolte) {
        Producteur producteur = recolte.getProducteur();
        Utilisateur utilisateur = producteur.getUtilisateur();
        return new RecolteResponse(
                recolte.getId(),
                producteur.getId(),
                utilisateur.getPrenom() + " " + utilisateur.getNom(),
                producteur.getLocalisationExploitation(),
                recolte.getProduit(),
                recolte.getDescription(),
                recolte.getQuantiteDisponible(),
                recolte.getQuantiteMin(),
                recolte.getQuantiteMax(),
                recolte.getUnite(),
                recolte.getPrixUnitaire(),
                recolte.getImageUrl(),
                recolte.getLocalisation(),
                recolte.getDateDisponibilite(),
                recolte.getStatut(),
                recolte.getDateCreation());
    }
}
