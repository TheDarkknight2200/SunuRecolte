package com.sunurecolte.security;

import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Chargement de l'identité authentifiée depuis la base.
 *
 * Le message d'erreur reste volontairement générique et identique pour un email
 * inconnu et un mot de passe erroné : il ne permet pas de découvrir quels emails
 * existent dans la plateforme.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return utilisateurRepository.findByEmail(email)
                .map(UtilisateurPrincipal::depuis)
                .orElseThrow(() -> new UsernameNotFoundException("Email ou mot de passe incorrect."));
    }

    /**
     * Recharge l'identité à partir de l'identifiant contenu dans le JWT.
     * Le rôle et l'état « actif » viennent de la base, jamais du token :
     * une désactivation de compte est donc appliquée immédiatement.
     */
    @Transactional(readOnly = true)
    public Optional<UtilisateurPrincipal> chargerParId(Long id) {
        return utilisateurRepository.findById(id).map(UtilisateurPrincipal::depuis);
    }
}
