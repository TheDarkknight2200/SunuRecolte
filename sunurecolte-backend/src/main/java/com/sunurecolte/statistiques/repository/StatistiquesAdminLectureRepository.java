package com.sunurecolte.statistiques.repository;

import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.statistiques.projection.EffectifRoleProjection;
import com.sunurecolte.statistiques.projection.FiliereNombreProjection;
import com.sunurecolte.statistiques.projection.InscriptionProjection;
import com.sunurecolte.statistiques.projection.MoyenPaiementNombreProjection;
import com.sunurecolte.statistiques.projection.TopProducteurProjection;
import com.sunurecolte.statistiques.projection.TopRecolteProjection;
import com.sunurecolte.statistiques.projection.ZoneNombreProjection;
import com.sunurecolte.user.entity.Role;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Lectures agrégées de la plateforme entière pour le tableau de bord de l'administration
 * (lot STAT-2).
 *
 * <p>Pas de CRUD : l'interface ne porte que des requêtes {@code @Query}, aucune écriture n'est possible par elle.
 * Chaque méthode est un unique aller-retour avec agrégation SQL — aucune boucle ne relit producteur
 * par producteur ni compte par compte, et aucune entité n'est chargée pour calculer une somme.
 *
 * <p>Le grain des sommes est celui de STAT-1, et pour la même raison : les montants sont lus sur
 * {@code lignes_commande.sous_total}, jamais sur {@code commandes.total}, qui peut mélanger plusieurs
 * producteurs. Les statuts retenus (annulées exclues) viennent de {@code ReglesStatistiques}.
 *
 * <p>Contrairement au repository de STAT-1, aucune requête n'est filtrée par un producteur : ce sont
 * des totaux transverses, réservés au rôle ADMIN par {@code SecurityConfig} puis revérifiés dans le service.
 */
public interface StatistiquesAdminLectureRepository extends Repository<Commande, Long> {

    /** Volume d'affaires de la période, sur les lignes des commandes retenues. Null si aucune ligne. */
    @Query("""
            SELECT SUM(l.sousTotal)
            FROM LigneCommande l
            WHERE l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            """)
    BigDecimal volumeAffaires(@Param("statuts") Collection<StatutCommande> statuts,
                             @Param("debut") LocalDateTime debut,
                             @Param("fin") LocalDateTime fin);

    /** Commandes créées sur la période, tous statuts confondus : le décompte que voit l'administration. */
    @Query("""
            SELECT COUNT(c.id)
            FROM Commande c
            WHERE c.dateCreation >= :debut
              AND c.dateCreation < :fin
            """)
    long nombreCommandesPeriode(@Param("debut") LocalDateTime debut,
                                @Param("fin") LocalDateTime fin);

    /** Comptes par rôle, sur toute la base : le total et les deux compteurs de comptes. */
    @Query("""
            SELECT u.role AS role, COUNT(u.id) AS nombre
            FROM Utilisateur u
            GROUP BY u.role
            """)
    List<EffectifRoleProjection> effectifsParRole();

    /** Comptes des deux rôles créés par la seule inscription publique, sur la période. */
    @Query("""
            SELECT u.dateCreation AS dateCreation, u.role AS role
            FROM Utilisateur u
            WHERE u.role IN :roles
              AND u.dateCreation >= :debut
              AND u.dateCreation < :fin
            ORDER BY u.dateCreation ASC
            """)
    List<InscriptionProjection> inscriptions(@Param("roles") Collection<Role> roles,
                                            @Param("debut") LocalDateTime debut,
                                            @Param("fin") LocalDateTime fin);

    /** Récoltes proposées aux acheteurs (statut actif), état du stock à un instant donné. */
    @Query("SELECT COUNT(r.id) FROM Recolte r WHERE r.statut = :statutActif")
    long nombreRecoltesActives(@Param("statutActif") StatutRecolte statutActif);

    /** Producteurs par filière, dans l'ordre des effectifs décroissants puis de la filière. */
    @Query("""
            SELECT p.filiere AS filiere, COUNT(p.id) AS nombre
            FROM Producteur p
            GROUP BY p.filiere
            ORDER BY COUNT(p.id) DESC, p.filiere ASC
            """)
    List<FiliereNombreProjection> repartitionParFiliere();

    /**
     * Producteurs par localisation d'exploitation saisie, grafies distinctes séparées : le service
     * normalise et regroupe. Les exploitations sans localisation renseignée sont absentes de la liste.
     */
    @Query("""
            SELECT p.localisationExploitation AS zone, COUNT(p.id) AS nombre
            FROM Producteur p
            WHERE p.localisationExploitation IS NOT NULL
            GROUP BY p.localisationExploitation
            ORDER BY COUNT(p.id) DESC, p.localisationExploitation ASC
            """)
    List<ZoneNombreProjection> repartitionParZoneSaisie();

    /**
     * Producteurs classés par volume apporté, puis identifiant croissant pour un ordre stable.
     * {@code nombreCommandes} compte les commandes distinctes du producteur sur les statuts retenus :
     * une commande mixte n'est comptée qu'une fois, avec la seule part de ses lignes.
     */
    @Query("""
            SELECT l.recolte.producteur.id AS producteurId,
                   l.recolte.producteur.utilisateur.prenom AS prenom,
                   l.recolte.producteur.utilisateur.nom AS nom,
                   SUM(l.sousTotal) AS chiffreAffaires,
                   COUNT(DISTINCT l.commande.id) AS nombreCommandes
            FROM LigneCommande l
            WHERE l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            GROUP BY l.recolte.producteur.id,
                     l.recolte.producteur.utilisateur.prenom,
                     l.recolte.producteur.utilisateur.nom
            ORDER BY SUM(l.sousTotal) DESC, l.recolte.producteur.id ASC
            """)
    List<TopProducteurProjection> topProducteurs(@Param("statuts") Collection<StatutCommande> statuts,
                                                 @Param("debut") LocalDateTime debut,
                                                 @Param("fin") LocalDateTime fin);

    /** Récoltes de toute la plateforme classées par revenu, même requête que STAT-1 sans le filtre producteur. */
    @Query("""
            SELECT l.recolte.id AS recolteId,
                   l.recolte.produit AS nom,
                   SUM(l.quantite) AS quantiteVendue,
                   l.recolte.unite AS unite,
                   SUM(l.sousTotal) AS revenu
            FROM LigneCommande l
            WHERE l.commande.statut IN :statuts
              AND l.commande.dateCreation >= :debut
              AND l.commande.dateCreation < :fin
            GROUP BY l.recolte.id, l.recolte.produit, l.recolte.unite
            ORDER BY SUM(l.sousTotal) DESC, l.recolte.id ASC
            """)
    List<TopRecolteProjection> topRecoltes(@Param("statuts") Collection<StatutCommande> statuts,
                                           @Param("debut") LocalDateTime debut,
                                           @Param("fin") LocalDateTime fin);

    /**
     * Paiements par moyen, rattachés à une commande créée sur la période. La date de la commande fait
     * foi : {@code paiements.date_creation} porte l'horodatage de l'encaissement, qui n'est pas celui
     * de la commande — et, sur le jeu de démonstration, celui de la génération.
     */
    @Query("""
            SELECT p.moyenPaiement AS moyen, COUNT(p.id) AS nombre, SUM(p.montant) AS montant
            FROM Paiement p
            WHERE p.commande.dateCreation >= :debut
              AND p.commande.dateCreation < :fin
            GROUP BY p.moyenPaiement
            ORDER BY COUNT(p.id) DESC, p.moyenPaiement ASC
            """)
    List<MoyenPaiementNombreProjection> repartitionParMoyenPaiement(@Param("debut") LocalDateTime debut,
                                                                   @Param("fin") LocalDateTime fin);

    /** Paiements remboursés des commandes de la période — remboursements simulés, comme les paiements. */
    @Query("""
            SELECT COUNT(p.id)
            FROM Paiement p
            WHERE p.statut = :statutRembourse
              AND p.commande.dateCreation >= :debut
              AND p.commande.dateCreation < :fin
            """)
    long nombrePaiementsRembourses(@Param("statutRembourse") StatutPaiement statutRembourse,
                                  @Param("debut") LocalDateTime debut,
                                  @Param("fin") LocalDateTime fin);
}
