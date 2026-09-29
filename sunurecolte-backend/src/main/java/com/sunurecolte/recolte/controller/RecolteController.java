package com.sunurecolte.recolte.controller;

import com.sunurecolte.recolte.dto.RecolteRequest;
import com.sunurecolte.recolte.dto.RecolteResponse;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.service.RecolteService;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Filiere;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des récoltes.
 * Toute la logique métier et les contrôles d'accès sont dans RecolteService.
 */
@RestController
@RequestMapping("/api/recoltes")
@RequiredArgsConstructor
public class RecolteController {

    private final RecolteService recolteService;

    @GetMapping
    @SecurityRequirements
    public List<RecolteResponse> rechercher(
            @RequestParam(required = false) StatutRecolte statut,
            @RequestParam(required = false) Filiere filiere,
            @RequestParam(required = false) String recherche) {
        return recolteService.rechercher(statut, filiere, null, recherche);
    }

    @GetMapping("/mes-recoltes")
    public List<RecolteResponse> mesRecoltes(
            @RequestParam(required = false) StatutRecolte statut,
            @RequestParam(required = false) String recherche,
            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return recolteService.mesRecoltes(statut, recherche, principal);
    }

    @GetMapping("/{id}")
    @SecurityRequirements
    public RecolteResponse findById(@PathVariable Long id) {
        return recolteService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecolteResponse creer(@Valid @RequestBody RecolteRequest request,
                                 @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return recolteService.creer(request, principal);
    }

    @PutMapping("/{id}")
    public RecolteResponse modifier(@PathVariable Long id,
                                    @Valid @RequestBody RecolteRequest request,
                                    @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return recolteService.modifier(id, request, principal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id,
                          @AuthenticationPrincipal UtilisateurPrincipal principal) {
        recolteService.supprimer(id, principal);
    }
}
