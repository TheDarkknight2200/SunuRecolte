package com.sunurecolte.user.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ModifierActifRequest;
import com.sunurecolte.user.dto.UtilisateurResponse;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.service.UtilisateurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Consultation d'un compte utilisateur : réservée au titulaire du compte ou à
 * l'administrateur (voir UtilisateurService).
 *
 * Liste des comptes et activation / désactivation : opérations d'administration,
 * réservées à ADMIN par SecurityConfig puis revérifiées dans le service.
 */
@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @GetMapping
    public List<UtilisateurResponse> lister(
            @RequestParam(required = false) Role role,
            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return utilisateurService.lister(role, principal);
    }

    @GetMapping("/{id}")
    public UtilisateurResponse findById(@PathVariable Long id,
                                        @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return utilisateurService.findById(id, principal);
    }

    @PatchMapping("/{id}/actif")
    public UtilisateurResponse changerActif(@PathVariable Long id,
                                            @Valid @RequestBody ModifierActifRequest request,
                                            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return utilisateurService.changerActif(id, request, principal);
    }
}
