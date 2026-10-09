package com.sunurecolte.statistiques.repository;

import com.sunurecolte.commande.entity.LigneCommande;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.statistiques.projection.CommandeMontantProjection;
import com.sunurecolte.statistiques.projection.StatutNombreProjection;
import com.sunurecolte.statistiques.projection.TopRecolteProjection;
import com.sunurecolte.statistiques.projection.TotauxVenteProjection;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Lectures agrégées des lignes de commande pour les statistiques du producteur (lot STAT-1).
 *
 * <p>Pas de CRUD : l'interface ne porte que les `@Query` du lot, sur le même type racine que
 * {@code LigneCommandeRepository}, et n'est jamais un second chemin d'écriture.
 *
 * <p>Toutes les sommes sont lues sur {@code lignes_commande.sous_total} filtrées par
 * {@code recolte.producteur.id} : une commande peut mélanger plusieurs producteurs, son `total`
 * n'appartient donc à aucun d'eux. Chaque méthode est un unique aller-retour avec agrégation SQL —
 * aucune boucle ne relit commande par commande, et aucune entité n'est chargée pour calculer une somme.
 */
public interface StatistiquesLigneCommandeRepository extends Repository<LigneCommande, Long> {

    /**
     * Chiffre d'affaires et nombre de commandes distinctes sur les statuts retenus.
     * {@code chiffreAffaires} est null quand aucune ligne n'est retenue (aucun `SUM` rendu) :
     * le service le convertit en zéro, la requête n'invente aucun montant.
     */
    @Query("""
            SELECT SUM(l.sousTotal) AS chiffreAffaires,
                   COUNT(DISTINCT l.commande.id) AS nombreCommandes
            FROM LigneCommande l
            WHERE l.recolte.producteur.id = :producteurId
              AND l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            """)
    TotauxVenteProjection totauxVente(@Param("producteurId") Long producteurId,
                                      @Param("statuts") Collection<StatutCommande> statuts,
                                      @Param("debut") LocalDateTime debut,
                                      @Param("fin") LocalDateTime fin);

    /** Commandes distinctes du producteur par statut, annulées comprises : dénominateur du taux d'annulation. */
    @Query("""
            SELECT l.commande.statut AS statut,
                   COUNT(DISTINCT l.commande.id) AS nombre
            FROM LigneCommande l
            WHERE l.recolte.producteur.id = :producteurId
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            GROUP BY l.commande.statut
            """)
    List<StatutNombreProjection> repartitionStatuts(@Param("producteurId") Long producteurId,
                                                    @Param("debut") LocalDateTime debut,
                                                    @Param("fin") LocalDateTime fin);

    /** Une ligne par commande retenue : date de création et part du producteur sur cette commande. */
    @Query("""
            SELECT l.commande.id AS commandeId,
                   l.commande.dateCreation AS dateCreation,
                   SUM(l.sousTotal) AS montant
            FROM LigneCommande l
            WHERE l.recolte.producteur.id = :producteurId
              AND l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            GROUP BY l.commande.id, l.commande.dateCreation
            """)
    List<CommandeMontantProjection> montantsParCommande(@Param("producteurId") Long producteurId,
                                                        @Param("statuts") Collection<StatutCommande> statuts,
                                                        @Param("debut") LocalDateTime debut,
                                                        @Param("fin") LocalDateTime fin);

    /** Récoltes du producteur triées par revenu décroissant, puis identifiant croissant pour un ordre stable. */
    @Query("""
            SELECT l.recolte.id AS recolteId,
                   l.recolte.produit AS nom,
                   SUM(l.quantite) AS quantiteVendue,
                   l.recolte.unite AS unite,
                   SUM(l.sousTotal) AS revenu
            FROM LigneCommande l
            WHERE l.recolte.producteur.id = :producteurId
              AND l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            GROUP BY l.recolte.id, l.recolte.produit, l.recolte.unite
            ORDER BY SUM(l.sousTotal) DESC, l.recolte.id ASC
            """)
    List<TopRecolteProjection> topRecoltes(@Param("producteurId") Long producteurId,
                                           @Param("statuts") Collection<StatutCommande> statuts,
                                           @Param("debut") LocalDateTime debut,
                                           @Param("fin") LocalDateTime fin);

    /** Commandes distinctes attendant une action du producteur sur la période. */
    @Query("""
            SELECT COUNT(DISTINCT l.commande.id)
            FROM LigneCommande l
            WHERE l.recolte.producteur.id = :producteurId
              AND l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            """)
    long nombreCommandesATraiter(@Param("producteurId") Long producteurId,
                                 @Param("statuts") Collection<StatutCommande> statuts,
                                 @Param("debut") LocalDateTime debut,
                                 @Param("fin") LocalDateTime fin);
}
