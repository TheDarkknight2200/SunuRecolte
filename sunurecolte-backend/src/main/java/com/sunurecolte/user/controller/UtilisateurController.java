package com.sunurecolte.user.controller;

import com.sunurecolte.user.dto.UtilisateurResponse;
import com.sunurecolte.user.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultation d'un compte utilisateur (profil public, sans données sensibles).
 */
@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @GetMapping("/{id}")
    public UtilisateurResponse findById(@PathVariable Long id) {
        return utilisateurService.findById(id);
    }
}
