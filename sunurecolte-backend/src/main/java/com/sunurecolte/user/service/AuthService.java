package com.sunurecolte.user.service;

import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.security.JwtService;
import com.sunurecolte.security.LimiteTentativesConnexion;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.AuthResponse;
import com.sunurecolte.user.dto.ConnexionRequest;
import com.sunurecolte.user.dto.InscriptionRequest;
import com.sunurecolte.user.dto.RoleInscription;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Inscription et connexion.
 *
 * Règles de sécurité :
 * - le mot de passe n'est jamais stocké en clair : seul le hash BCrypt est persisté ;
 * - l'inscription publique ne peut créer que PRODUCTEUR ou ACHETEUR (RoleInscription) ;
 * - un email déjà utilisé est refusé (comparaison insensible à la casse) ;
 * - la connexion ne distingue pas « email inconnu » et « mot de passe erroné » ;
 * - cinq tentatives sans succès sur un même couple (email, adresse du client) bloquent
 *   provisoirement ce couple, et ce contrôle passe avant toute comparaison de mot de passe
 *   (LimiteTentativesConnexion).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final ProducteurRepository producteurRepository;
    private final AcheteurRepository acheteurRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final LimiteTentativesConnexion limite;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse inscrire(InscriptionRequest request) {
        String email = normaliserEmail(request.email());
        if (utilisateurRepository.existsByEmail(email)) {
            throw new BusinessException("Un compte existe déjà avec cette adresse email.");
        }
        validerProfil(request);

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom(request.nom().trim());
        utilisateur.setPrenom(request.prenom().trim());
        utilisateur.setEmail(email);
        utilisateur.setTelephone(request.telephone().trim());
        utilisateur.setMotDePasse(passwordEncoder.encode(request.motDePasse()));
        utilisateur.setRole(request.role().versRole());
        utilisateur.setActif(true);
        Utilisateur enregistre = utilisateurRepository.save(utilisateur);

        if (request.role() == RoleInscription.PRODUCTEUR) {
            Producteur producteur = new Producteur();
            producteur.setUtilisateur(enregistre);
            producteur.setFiliere(request.filiere());
            producteurRepository.save(producteur);
        } else {
            Acheteur acheteur = new Acheteur();
            acheteur.setUtilisateur(enregistre);
            acheteur.setTypeAcheteur(request.typeAcheteur());
            acheteurRepository.save(acheteur);
        }

        return versResponse(UtilisateurPrincipal.depuis(enregistre));
    }

    @Transactional(readOnly = true)
    public AuthResponse connecter(ConnexionRequest request, String adresseClient) {
        String email = normaliserEmail(request.email());

        // Le comptage passe avant l'authentification : pendant la fenêtre de blocage le compte est
        // inaccessible même à son titulaire, et un email inconnu est traité de la même façon.
        limite.autoriserTentative(email, adresseClient);
        Authentication authentification = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.motDePasse()));
        limite.reinitialiserApresSucces(email, adresseClient);
        return versResponse((UtilisateurPrincipal) authentification.getPrincipal());
    }

    private void validerProfil(InscriptionRequest request) {
        if (request.role() == RoleInscription.PRODUCTEUR && request.filiere() == null) {
            throw new BusinessException("La filière est obligatoire pour un compte producteur.");
        }
        if (request.role() == RoleInscription.ACHETEUR && request.typeAcheteur() == null) {
            throw new BusinessException("Le type d'acheteur est obligatoire pour un compte acheteur.");
        }
    }

    private AuthResponse versResponse(UtilisateurPrincipal principal) {
        return new AuthResponse(
                jwtService.generer(principal),
                principal.getId(),
                principal.getNom(),
                principal.getPrenom(),
                principal.getUsername(),
                principal.getRole());
    }

    private static String normaliserEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
