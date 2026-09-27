package com.sunurecolte.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Profil producteur agricole. Lié à Utilisateur par utilisateur_id.
 * Ce n'est pas une sous-classe de Utilisateur.
 */
@Entity
@Table(name = "producteurs")
@Getter
@Setter
@NoArgsConstructor
public class Producteur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    @Column(name = "localisation_exploitation", length = 255)
    private String localisationExploitation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Filiere filiere;

    @Column(columnDefinition = "TEXT")
    private String description;
}
