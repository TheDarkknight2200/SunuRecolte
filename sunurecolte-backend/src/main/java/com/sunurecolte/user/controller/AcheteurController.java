package com.sunurecolte.user.controller;

import com.sunurecolte.user.dto.AcheteurResponse;
import com.sunurecolte.user.service.AcheteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultation du profil acheteur.
 */
@RestController
@RequestMapping("/api/acheteurs")
@RequiredArgsConstructor
public class AcheteurController {

    private final AcheteurService acheteurService;

    @GetMapping("/{id}")
    public AcheteurResponse findById(@PathVariable Long id) {
        return acheteurService.findById(id);
    }
}
