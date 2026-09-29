package com.sunurecolte.user.service;

import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.dto.ModifierActifRequest;
import com.sunurecolte.user.dto.UtilisateurResponse;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Consultation et administration des comptes utilisateurs (le mot de passe n'est jamais exposé).
 *
 * Règles d'accès (Phase 3, administration Phase 5) : le profil expose l'email et le
 * téléphone ; il est donc réservé au titulaire du compte ou à l'administrateur (403 sinon).
 * La liste de tous les comptes et l'activation d'un compte sont des opérations
 * d'administrateur : tout autre rôle répond 403, et le refus est vérifié avant
 * l'existence de la ressource pour ne rien révéler d'un identifiant.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    public UtilisateurResponse findById(Long id, UtilisateurPrincipal principal) {
        ControleAcces.exigerProprietaireOuAdmin(principal, id);
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        return versResponse(utilisateur);
    }

    /**
     * Liste des comptes pour l'administration. `role` est un filtre facultatif : sans lui,
     * tous les comptes sont renvoyés. Aucun compte caché, aucune pagination : le volume du
     * MVP (une région) ne le justifie pas.
     */
    public List<UtilisateurResponse> lister(Role role, UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        List<Utilisateur> utilisateurs = role == null
                ? utilisateurRepository.findAllByOrderByDateCreationDescIdDesc()
                : utilisateurRepository.findByRoleOrderByDateCreationDescIdDesc(role);
        return utilisateurs.stream().map(UtilisateurService::versResponse).toList();
    }

    /**
     * Active ou désactive un compte (ADMIN uniquement).
     *
     * Un administrateur ne peut pas modifier son propre compte : se désactiver soi-même
     * fermerait la porte à la seule administration restante. L'état est porté par
     * `Utilisateur.actif` (colonne déjà présente, aucune migration) : la réactivation est
     * le chemin inverse du même champ.
     */
    @Transactional
    public UtilisateurResponse changerActif(Long id, ModifierActifRequest request,
                                            UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        if (id.equals(principal.getId())) {
            throw new BusinessException(
                    "Vous ne pouvez pas modifier l'état de votre propre compte.");
        }
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        utilisateur.setActif(request.actif());
        return versResponse(utilisateurRepository.save(utilisateur));
    }

    static UtilisateurResponse versResponse(Utilisateur utilisateur) {
        return new UtilisateurResponse(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getEmail(),
                utilisateur.getTelephone(),
                utilisateur.getRole(),
                utilisateur.getDateCreation(),
                utilisateur.isActif());
    }
}
