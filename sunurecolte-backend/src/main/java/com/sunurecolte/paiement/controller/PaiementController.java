package com.sunurecolte.paiement.controller;

import com.sunurecolte.paiement.dto.PaiementRequest;
import com.sunurecolte.paiement.dto.PaiementResponse;
import com.sunurecolte.paiement.service.PaiementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST des paiements (simulation — aucune transaction réelle).
 */
@RestController
@RequestMapping("/api/paiements")
@RequiredArgsConstructor
public class PaiementController {

    private final PaiementService paiementService;

    @GetMapping("/{id}")
    public PaiementResponse findById(@PathVariable Long id) {
        return paiementService.findById(id);
    }

    @GetMapping("/commande/{commandeId}")
    public PaiementResponse findByCommande(@PathVariable Long commandeId) {
        return paiementService.findByCommande(commandeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaiementResponse creer(@Valid @RequestBody PaiementRequest request) {
        return paiementService.creer(request);
    }
}
