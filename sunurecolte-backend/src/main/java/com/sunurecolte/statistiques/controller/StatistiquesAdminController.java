package com.sunurecolte.statistiques.controller;

import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.statistiques.dto.StatistiquesAdminResponse;
import com.sunurecolte.statistiques.service.StatistiquesAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint REST du tableau de bord statistiques de l'administration (lot STAT-2).
 *
 * <p>{@code /api/admin/statistiques} est le <b>premier endpoint du préfixe {@code /api/admin}</b> :
 * les routes d'administration ouvertes jusque-là étaient greffées sur la racine de leur ressource
 * ({@code /api/utilisateurs}, {@code /api/prix-marche}, {@code PATCH /api/recoltes/{id}/statut}).
 * Cette statistique-là n'est la ressource d'aucune entité : elle porte sur la plateforme entière,
 * d'où une racine propre, réservée à ADMIN par {@code SecurityConfig} et revérifiée dans le service.
 *
 * <p>Le seul paramètre admis est le libellé de période ; une valeur hors de {@code 7j}, {@code 30j},
 * {@code mois} est refusée (400) par le service. Toute la logique d'agrégation, les bornes et le
 * contrôle de rôle sont dans {@code ReglesStatistiques} et {@code StatistiquesAdminService}.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class StatistiquesAdminController {

    private final StatistiquesAdminService statistiquesAdminService;

    /**
     * {@code GET /api/admin/statistiques?periode=7j|30j|mois} — réservé ADMIN.
     * Absence de paramètre ou valeur blanche = 30j.
     */
    @GetMapping("/statistiques")
    public StatistiquesAdminResponse statistiques(
            @RequestParam(required = false) String periode,
            @AuthenticationPrincipal UtilisateurPrincipal principal) {
        return statistiquesAdminService.statistiques(periode, principal);
    }
}
