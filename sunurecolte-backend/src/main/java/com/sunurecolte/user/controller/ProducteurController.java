package com.sunurecolte.user.controller;

import com.sunurecolte.user.dto.ProducteurRequest;
import com.sunurecolte.user.dto.ProducteurResponse;
import com.sunurecolte.user.service.ProducteurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Consultation et mise à jour du profil producteur.
 */
@RestController
@RequestMapping("/api/producteurs")
@RequiredArgsConstructor
public class ProducteurController {

    private final ProducteurService producteurService;

    @GetMapping("/{id}")
    public ProducteurResponse findById(@PathVariable Long id) {
        return producteurService.findById(id);
    }

    @PutMapping("/{id}")
    public ProducteurResponse modifier(@PathVariable Long id,
                                       @Valid @RequestBody ProducteurRequest request) {
        return producteurService.modifier(id, request);
    }
}
