package com.sunurecolte.commande.controller;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.service.CommandeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des commandes.
 * Toute la logique métier est dans CommandeService.
 */
@RestController
@RequestMapping("/api/commandes")
@RequiredArgsConstructor
public class CommandeController {

    private final CommandeService commandeService;

    @GetMapping
    public List<CommandeResponse> rechercher(@RequestParam(required = false) Long acheteurId) {
        return commandeService.rechercher(acheteurId);
    }

    @GetMapping("/{id}")
    public CommandeResponse findById(@PathVariable Long id) {
        return commandeService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommandeResponse creer(@Valid @RequestBody CommandeRequest request) {
        return commandeService.creer(request);
    }

    @PatchMapping("/{id}/statut")
    public CommandeResponse changerStatut(@PathVariable Long id,
                                          @Valid @RequestBody StatutCommandeRequest request) {
        return commandeService.changerStatut(id, request);
    }
}
