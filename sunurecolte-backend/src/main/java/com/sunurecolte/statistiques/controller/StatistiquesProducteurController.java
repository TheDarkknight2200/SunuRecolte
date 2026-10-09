package com.sunurecolte.statistiques.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.statistiques.dto.StatistiquesProducteurResponse;
import com.sunurecolte.statistiques.service.StatistiquesProducteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints REST des statistiques de vente du producteur (lot STAT-1).
 *
 * <p>Le chemin suit celui du profil connecté (« /api/producteurs/moi ») : l'identité du
 * producteur vient du jeton, aucun identifiant n'est accepté du client. La période est le
 * seul paramètre admis, et une valeur hors de 7j, 30j, mois est refusée par le service (400).
 * Toute la logique de calcul et le contrôle de rôle sont dans {@code StatistiquesProducteurService}.
 */
@RestController
@RequestMapping("/api/producteurs/moi")
@RequiredArgsConstructor
public class StatistiquesProducteurController {

    private final StatistiquesProducteurService statistiquesProducteurService;

    /**
     * {@code GET /api/producteurs/moi/statistiques?periode=7j|30j|mois} — réservé PRODUCTEUR.
     * Absence de paramètre ou valeur blanche = 30j.
     */
    @GetMapping("/statistiques")
    public StatistiquesProducteurResponse statistiques(
            @RequestParam(required = false) String periode,
            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return statistiquesProducteurService.statistiques(periode, principal);
    }
}
