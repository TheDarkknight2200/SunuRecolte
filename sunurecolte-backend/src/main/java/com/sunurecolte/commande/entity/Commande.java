package com.sunurecolte.commande.entity;

import com.sunurecolte.user.entity.Acheteur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entité représentant une commande passée par un acheteur.
 * Règle métier : si mode_reception = LIVRAISON, adresse_livraison et telephone_livraison sont obligatoires.
 */
@Entity
@Table(name = "commandes")
@Getter
@Setter
@NoArgsConstructor
public class Commande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "acheteur_id", nullable = false)
    private Acheteur acheteur;

    /**
     * Date de la commande, posée par le serveur à l'insertion et figée ensuite — comme les quatre autres
     * {@code date_creation} du modèle ({@link com.sunurecolte.user.entity.Utilisateur},
     * {@link com.sunurecolte.recolte.entity.Recolte},
     * {@link com.sunurecolte.paiement.entity.Paiement},
     * {@link com.sunurecolte.notification.entity.Notification}).
     *
     * <p>Aucun chemin d'API n'accepte cette valeur d'un client : le DTO de création ne la déclare pas.
     * Reculer une date — l'étalement du jeu de démonstration
     * ({@link com.sunurecolte.config.DemoDataInitializer}) comme les bornes de période des tests de
     * statistiques — passe donc par une écriture SQL directe, jamais par l'entité.
     */
    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutCommande statut = StatutCommande.EN_ATTENTE;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_reception", nullable = false, length = 20)
    private ModeReception modeReception;

    @Column(name = "adresse_livraison", length = 255)
    private String adresseLivraison;

    @Column(name = "telephone_livraison", length = 20)
    private String telephoneLivraison;

    @Column(name = "instructions_livraison", columnDefinition = "TEXT")
    private String instructionsLivraison;

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LigneCommande> lignes = new ArrayList<>();

    /**
     * Horodatage du serveur à l'insertion, comme sur les quatre autres entités datées. La colonne étant
     * {@code updatable = false}, aucun UPDATE ne la reprendra ensuite.
     */
    @PrePersist
    protected void prePersist() {
        this.dateCreation = LocalDateTime.now();
    }
}
