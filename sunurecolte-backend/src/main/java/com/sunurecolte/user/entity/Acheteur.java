package com.sunurecolte.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Profil acheteur. Lié à Utilisateur par utilisateur_id.
 * Ce n'est pas une sous-classe de Utilisateur.
 */
@Entity
@Table(name = "acheteurs")
@Getter
@Setter
@NoArgsConstructor
public class Acheteur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_acheteur", nullable = false, length = 20)
    private TypeAcheteur typeAcheteur;
}
