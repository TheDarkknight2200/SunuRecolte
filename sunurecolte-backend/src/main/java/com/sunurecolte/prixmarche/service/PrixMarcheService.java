package com.sunurecolte.prixmarche.service;

import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.prixmarche.dto.PrixMarcheResponse;
import com.sunurecolte.prixmarche.entity.PrixMarche;
import com.sunurecolte.prixmarche.repository.PrixMarcheRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Consultation des prix indicatifs de marché (lecture seule dans le MVP).
 * Le modèle ne prévoit pas de filière : aucun filtrage par filière n'est possible.
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
        PrixMarche prix = prixMarcheRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PrixMarche", id));
        return versResponse(prix);
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
