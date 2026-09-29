package com.sunurecolte.user.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ModifierProfilProducteurRequest;
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

    /**
     * Profil du producteur connecté. Déclaré avant « /{id} » : l'identité vient du
     * jeton, aucun identifiant n'est accepté du client.
     */
    @GetMapping("/moi")
    public ProducteurResponse moi(@AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.moi(principal);
    }

    /**
     * Mise à jour de son propre profil (compte et exploitation). Déclaré avant « /{id} » :
     * le producteur connecté n'a aucun identifiant à fournir, et un PUT /{id} d'un autre
     * compte reste de toute façon refusé par le service.
     */
    @PutMapping("/moi")
    public ProducteurResponse modifierMoi(@Valid @RequestBody ModifierProfilProducteurRequest request,
                                          @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.modifierMoi(request, principal);
    }

    @GetMapping("/{id}")
    public ProducteurResponse findById(@PathVariable Long id,
                                       @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.findById(id, principal);
    }

    /**
     * Mise à jour ciblée des seules colonnes d'exploitation d'un producteur donné :
     * le contrat historique, conservé pour la modération ADMIN (le service autorise
     * le propriétaire ou un ADMIN). L'identité d'un compte ne se modifie que par « /moi ».
     */
    @PutMapping("/{id}")
    public ProducteurResponse modifier(@PathVariable Long id,
                                       @Valid @RequestBody ProducteurRequest request,
                                       @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return producteurService.modifier(id, request, principal);
    }
}
