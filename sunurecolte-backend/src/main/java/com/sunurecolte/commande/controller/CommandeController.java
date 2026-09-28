package com.sunurecolte.commande.controller;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.security.UtilisateurPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des commandes.
 * Toute la logique métier et les contrôles d'accès sont dans CommandeService.
 */
@RestController
@RequestMapping("/api/commandes")
@RequiredArgsConstructor
public class CommandeController {

    private final CommandeService commandeService;

    @GetMapping
    public List<CommandeResponse> rechercher(@RequestParam(required = false) Long acheteurId,
                                             @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return commandeService.rechercher(acheteurId, principal);
    }

    @GetMapping("/{id}")
    public CommandeResponse findById(@PathVariable Long id,
                                     @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return commandeService.findById(id, principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommandeResponse creer(@Valid @RequestBody CommandeRequest request,
                                  @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return commandeService.creer(request, principal);
    }

    @PatchMapping("/{id}/statut")
    public CommandeResponse changerStatut(@PathVariable Long id,
                                          @Valid @RequestBody StatutCommandeRequest request,
                                          @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return commandeService.changerStatut(id, request, principal);
    }
}
