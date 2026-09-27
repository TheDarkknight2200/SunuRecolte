package com.sunurecolte.paiement.entity;

import com.sunurecolte.commande.entity.Commande;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité Paiement — un paiement par commande (MVP).
 * Le paiement est d'abord en simulation/sandbox.
 * Intégration Wave / Orange Money uniquement si accès API disponible.
 */
@Entity
@Table(name = "paiements")
@Getter
@Setter
@NoArgsConstructor
public class Paiement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commande_id", nullable = false, unique = true)
    private Commande commande;

    @Column(name = "reference_transaction", length = 100)
    private String referenceTransaction;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(name = "moyen_paiement", nullable = false, length = 20)
    private MoyenPaiement moyenPaiement;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutPaiement statut = StatutPaiement.EN_ATTENTE;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_confirmation")
    private LocalDateTime dateConfirmation;

    @PrePersist
    protected void prePersist() {
        this.dateCreation = LocalDateTime.now();
    }
}
