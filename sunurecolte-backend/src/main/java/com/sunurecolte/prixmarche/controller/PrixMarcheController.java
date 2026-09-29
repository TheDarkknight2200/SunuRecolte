package com.sunurecolte.prixmarche.controller;

import com.sunurecolte.prixmarche.dto.PrixMarcheRequest;
import com.sunurecolte.prixmarche.dto.PrixMarcheResponse;
import com.sunurecolte.prixmarche.service.PrixMarcheService;
import com.sunurecolte.security.UtilisateurPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints REST des prix indicatifs de marché.
 *
 * Lecture publique (les deux GET, sans jeton), écriture réservée à l'administrateur :
 * la mention `@SecurityRequirements` est portée par chaque méthode publique, non par la
 * classe, sinon les trois méthodes d'écriture apparaîtraient elles aussi sans
 * authentification dans la documentation.
 */
@RestController
@RequestMapping("/api/prix-marche")
@RequiredArgsConstructor
public class PrixMarcheController {

    private final PrixMarcheService prixMarcheService;

    @GetMapping
    @SecurityRequirements
    public List<PrixMarcheResponse> findAll() {
        return prixMarcheService.findAll();
    }

    @GetMapping("/{id}")
    @SecurityRequirements
    public PrixMarcheResponse findById(@PathVariable Long id) {
        return prixMarcheService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrixMarcheResponse creer(@Valid @RequestBody PrixMarcheRequest request,
                                    @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return prixMarcheService.creer(request, principal);
    }

    @PutMapping("/{id}")
    public PrixMarcheResponse modifier(@PathVariable Long id,
                                       @Valid @RequestBody PrixMarcheRequest request,
                                       @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return prixMarcheService.modifier(id, request, principal);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable Long id,
                          @AuthenticationPrincipal UtilisateurPrincipal principal) {
        prixMarcheService.supprimer(id, principal);
    }
}
