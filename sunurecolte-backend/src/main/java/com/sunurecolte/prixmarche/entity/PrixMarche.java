package com.sunurecolte.prixmarche.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité PrixMarche — prix indicatifs administrés par l'administrateur.
 * Ces prix sont indicatifs uniquement, sans lien direct avec les prix des récoltes.
 * Gestion automatique et IA = perspectives futures hors MVP.
 */
@Entity
@Table(name = "prix_marche")
@Getter
@Setter
@NoArgsConstructor
public class PrixMarche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String produit;

    @Column(nullable = false, length = 30)
    private String unite;

    @Column(name = "prix_moyen", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixMoyen;

    @Column(name = "marche_reference", length = 150)
    private String marcheReference;

    @Column(name = "date_mise_a_jour", nullable = false)
    private LocalDateTime dateMiseAJour;

    @PrePersist
    @PreUpdate
    protected void prePersistOrUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
    }
}
