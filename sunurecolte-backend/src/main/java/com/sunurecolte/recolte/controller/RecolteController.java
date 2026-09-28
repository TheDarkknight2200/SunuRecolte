package com.sunurecolte.recolte.controller;

import com.sunurecolte.recolte.dto.RecolteRequest;
import com.sunurecolte.recolte.dto.RecolteResponse;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.service.RecolteService;
import com.sunurecolte.user.entity.Filiere;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des récoltes.
 * Toute la logique métier est dans RecolteService.
 */
@RestController
@RequestMapping("/api/recoltes")
@RequiredArgsConstructor
public class RecolteController {

    private final RecolteService recolteService;

    @GetMapping
    public List<RecolteResponse> rechercher(
            @RequestParam(required = false) StatutRecolte statut,
            @RequestParam(required = false) Filiere filiere,
            @RequestParam(required = false) String recherche) {
        return recolteService.rechercher(statut, filiere, recherche);
    }

    @GetMapping("/{id}")
    public RecolteResponse findById(@PathVariable Long id) {
        return recolteService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecolteResponse creer(@Valid @RequestBody RecolteRequest request) {
        return recolteService.creer(request);
    }

    @PutMapping("/{id}")
    public RecolteResponse modifier(@PathVariable Long id, @Valid @RequestBody RecolteRequest request) {
        return recolteService.modifier(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id) {
        recolteService.supprimer(id);
    }
}
