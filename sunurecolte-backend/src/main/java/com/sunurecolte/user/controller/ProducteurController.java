package com.sunurecolte.user.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ProducteurRequest;
import com.sunurecolte.user.dto.ProducteurResponse;
import com.sunurecolte.user.service.ProducteurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Consultation et mise à jour du profil producteur.
 * Les contrôles d'accès sont délégués à ProducteurService.
 */
@RestController
@RequestMapping("/api/producteurs")
@RequiredArgsConstructor
public class ProducteurController {

    private final ProducteurService producteurService;

    @GetMapping("/{id}")
    public ProducteurResponse findById(@PathVariable Long id,
                                       @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.findById(id, principal);
    }

    @PutMapping("/{id}")
    public ProducteurResponse modifier(@PathVariable Long id,
                                       @Valid @RequestBody ProducteurRequest request,
                                       @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.modifier(id, request, principal);
    }
}
