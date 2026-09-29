package com.sunurecolte.prixmarche.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.prixmarche.dto.PrixMarcheRequest;
import com.sunurecolte.prixmarche.dto.PrixMarcheResponse;
import com.sunurecolte.prixmarche.entity.PrixMarche;
import com.sunurecolte.prixmarche.repository.PrixMarcheRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Consultation publique et gestion administrative des prix indicatifs de marché.
 * Le modèle ne prévoit pas de filière : aucun filtrage par filière n'est possible.
 *
 * Écriture réservée à l'administrateur : la consultation des deux GET reste publique,
 * un producteur comme un acheteur ne peut ni créer, ni modifier, ni supprimer une ligne.
 * `dateMiseAJour` n'est jamais accepté du client : l'entité le remplit elle-même.
 *
 * Aucune unicité n'est imposée sur `produit` : le schéma approuvé ne porte aucune
 * contrainte `unique` sur la table `prix_marche` et le domaine prévoit plusieurs marchés
 * de référence pour un même produit.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrixMarcheService {

    private final PrixMarcheRepository prixMarcheRepository;

    public List<PrixMarcheResponse> findAll() {
        return prixMarcheRepository.findAllByOrderByProduitAsc()
                .stream()
                .map(this::versResponse)
                .toList();
    }

    public PrixMarcheResponse findById(Long id) {
        return versResponse(trouver(id));
    }

    @Transactional
    public PrixMarcheResponse creer(PrixMarcheRequest request, UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        PrixMarche prix = new PrixMarche();
        appliquer(prix, request);
        return versResponse(prixMarcheRepository.save(prix));
    }

    @Transactional
    public PrixMarcheResponse modifier(Long id, PrixMarcheRequest request,
                                       UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        PrixMarche prix = trouver(id);
        appliquer(prix, request);
        return versResponse(prixMarcheRepository.save(prix));
    }

    @Transactional
    public void supprimer(Long id, UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        prixMarcheRepository.delete(trouver(id));
    }

    private PrixMarche trouver(Long id) {
        return prixMarcheRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PrixMarche", id));
    }

    private void appliquer(PrixMarche prix, PrixMarcheRequest request) {
        prix.setProduit(request.produit());
        prix.setUnite(request.unite());
        prix.setPrixMoyen(request.prixMoyen());
        prix.setMarcheReference(request.marcheReference());
    }

    private PrixMarcheResponse versResponse(PrixMarche prix) {
        return new PrixMarcheResponse(
                prix.getId(),
                prix.getProduit(),
                prix.getUnite(),
                prix.getPrixMoyen(),
                prix.getMarcheReference(),
                prix.getDateMiseAJour());
    }
}
