package com.sunurecolte.prixmarche.controller;

import com.sunurecolte.prixmarche.dto.PrixMarcheResponse;
import com.sunurecolte.prixmarche.service.PrixMarcheService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints REST des prix indicatifs de marché (consultation seule dans le MVP).
 * Consultation publique : aucun jeton requis.
 */
@RestController
@RequestMapping("/api/prix-marche")
@RequiredArgsConstructor
@SecurityRequirements
public class PrixMarcheController {

    private final PrixMarcheService prixMarcheService;

    @GetMapping
    public List<PrixMarcheResponse> findAll() {
        return prixMarcheService.findAll();
    }

    @GetMapping("/{id}")
    public PrixMarcheResponse findById(@PathVariable Long id) {
        return prixMarcheService.findById(id);
    }
}
