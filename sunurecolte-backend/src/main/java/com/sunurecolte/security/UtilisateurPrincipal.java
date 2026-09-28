package com.sunurecolte.security;

import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Identité authentifiée exposée à Spring Security.
 *
 * Ne contient pas l'entité JPA (qui serait détachée hors transaction, car
 * spring.jpa.open-in-view=false) : uniquement les données nécessaires à
 * l'authentification et aux contrôles d'accès.
 */
public class UtilisateurPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String motDePasseHash;
    private final Role role;
    private final boolean actif;
    private final String nom;
    private final String prenom;

    private UtilisateurPrincipal(Long id, String email, String motDePasseHash, Role role, boolean actif,
                                String nom, String prenom) {
        this.id = id;
        this.email = email;
        this.motDePasseHash = motDePasseHash;
        this.role = role;
        this.actif = actif;
        this.nom = nom;
        this.prenom = prenom;
    }

    public static UtilisateurPrincipal depuis(Utilisateur utilisateur) {
        return new UtilisateurPrincipal(
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getMotDePasse(),
                utilisateur.getRole(),
                utilisateur.isActif(),
                utilisateur.getNom(),
                utilisateur.getPrenom());
    }

    public Long getId() {
        return id;
    }

    public Role getRole() {
        return role;
    }

    public String getNom() {
        return nom;
    }

    public String getPrenom() {
        return prenom;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return motDePasseHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return actif;
    }
}
