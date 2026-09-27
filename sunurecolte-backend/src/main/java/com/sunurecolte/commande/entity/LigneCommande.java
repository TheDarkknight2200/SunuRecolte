package com.sunurecolte.commande.entity;

import com.sunurecolte.recolte.entity.Recolte;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Ligne de commande — associe une récolte à une commande.
 * IMPORTANT : prix_unitaire conserve le prix historique au moment de la transaction.
 * La quantité commandée ne peut pas dépasser le stock disponible (règle vérifiée en service).
 */
@Entity
@Table(name = "lignes_commande")
@Getter
@Setter
@NoArgsConstructor
public class LigneCommande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commande_id", nullable = false)
    private Commande commande;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recolte_id", nullable = false)
    private Recolte recolte;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantite;

    /**
     * Prix unitaire au moment de la commande (prix historique).
     * Ne doit pas être mis à jour si le prix de la récolte change.
     */
    @Column(name = "prix_unitaire", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "sous_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal sousTotal;
}
