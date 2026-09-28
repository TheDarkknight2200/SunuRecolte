package com.sunurecolte.paiement.controller;

import com.sunurecolte.paiement.dto.PaiementRequest;
import com.sunurecolte.paiement.dto.PaiementResponse;
import com.sunurecolte.paiement.service.PaiementService;
import com.sunurecolte.security.UtilisateurPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST des paiements (simulation — aucune transaction réelle).
 * Les contrôles d'accès sont délégués à PaiementService.
 */
@RestController
@RequestMapping("/api/paiements")
@RequiredArgsConstructor
public class PaiementController {

    private final PaiementService paiementService;

    @GetMapping("/{id}")
    public PaiementResponse findById(@PathVariable Long id,
                                     @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return paiementService.findById(id, principal);
    }

    @GetMapping("/commande/{commandeId}")
    public PaiementResponse findByCommande(@PathVariable Long commandeId,
                                           @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return paiementService.findByCommande(commandeId, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaiementResponse creer(@Valid @RequestBody PaiementRequest request,
                                  @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return paiementService.creer(request, principal);
    }
}
