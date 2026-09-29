package com.sunurecolte.user.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.AcheteurResponse;
import com.sunurecolte.user.service.AcheteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultation du profil acheteur : réservée à l'acheteur propriétaire ou à
 * l'administrateur (voir AcheteurService).
 */
@RestController
@RequestMapping("/api/acheteurs")
@RequiredArgsConstructor
public class AcheteurController {

    private final AcheteurService acheteurService;

    /**
     * Profil de l'acheteur connecté. Déclaré avant « /{id} » : l'identité vient du
     * jeton, aucun identifiant n'est accepté du client.
     */
    @GetMapping("/moi")
    public AcheteurResponse moi(@AuthenticationPrincipal UtilisateurPrincipal principal) {
        return acheteurService.moi(principal);
    }

    @GetMapping("/{id}")
    public AcheteurResponse findById(@PathVariable Long id,
                                     @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return acheteurService.findById(id, principal);
    }
}
