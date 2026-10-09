package com.sunurecolte.statistiques.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Tableau de bord statistiques de l'administration (lot STAT-2), pour une période.
 *
 * <p>{@code utilisateursTotal} = {@code producteurs} + {@code acheteurs} : le rôle ADMIN est
 * <b>exclu du total</b>, pour que la somme des deux compteurs affichés corresponde au total affiché.
 * Un administrateur vient de l'amorçage local, jamais d'une inscription publique.
 *
 * <p>{@code volumeAffaires} suit la règle de STAT-1 : somme des {@code sous_total} des lignes de
 * commande dont la commande est sur un statut retenu, sur la période — <b>jamais</b>
 * {@code commandes.total}, qui peut mélanger plusieurs producteurs. {@code commandesPeriode} compte
 * les commandes distinctes créées sur la période, <b>tous statuts confondus</b>, annulées comprises :
 * c'est ce que l'administration voit passer.
 *
 * <p>{@code recoltesActives} est un état du stock à un instant donné (récoltes au statut DISPONIBLE),
 * la période ne s'y applique pas. {@code nombreRembourses} compte les paiements au statut REMBOURSE des
 * commandes de la période — des remboursements simulés, comme les paiements.
 */
public record StatistiquesAdminResponse(
        long utilisateursTotal,
        long producteurs,
        long acheteurs,
        long recoltesActives,
        long commandesPeriode,
        BigDecimal volumeAffaires,
        List<InscriptionSemaineResponse> inscriptionsParSemaine,
        List<NomNombreResponse> repartitionParFiliere,
        List<NomNombreResponse> repartitionParZone,
        List<TopProducteurResponse> topProducteurs,
        List<TopRecolteResponse> topRecoltes,
        List<MoyenPaiementNombreResponse> repartitionParMoyenPaiement,
        long nombreRembourses
) {}
