package com.sunurecolte.recolte.entity;

import com.sunurecolte.user.entity.Producteur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entité représentant une récolte publiée par un producteur.
 * Une récolte appartient à un seul producteur.
 * Les quantités et le prix doivent être positifs.
 */
@Entity
@Table(name = "recoltes")
@Getter
@Setter
@NoArgsConstructor
public class Recolte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producteur_id", nullable = false)
    private Producteur producteur;

    @Column(nullable = false, length = 150)
    private String produit;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "quantite_disponible", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantiteDisponible;

    @Column(name = "quantite_min", precision = 10, scale = 2)
    private BigDecimal quantiteMin;

    @Column(name = "quantite_max", precision = 10, scale = 2)
    private BigDecimal quantiteMax;

    @Column(nullable = false, length = 30)
    private String unite;

    @Column(name = "prix_unitaire", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 255)
    private String localisation;

    @Column(name = "date_disponibilite")
    private LocalDate dateDisponibilite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutRecolte statut = StatutRecolte.DISPONIBLE;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void prePersist() {
        this.dateCreation = LocalDateTime.now();
    }
}
