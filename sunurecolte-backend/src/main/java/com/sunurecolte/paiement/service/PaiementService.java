package com.sunurecolte.paiement.service;

import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.LigneCommande;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.notification.service.NotificationService;
import com.sunurecolte.paiement.dto.PaiementRequest;
import com.sunurecolte.paiement.dto.PaiementResponse;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.paiement.repository.PaiementRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Producteur;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Paiements simulés (MVP) : aucune transaction réelle n'est effectuée auprès de
 * Wave ou Orange Money. Le paiement est créé au statut EN_ATTENTE avec une
 * référence de simulation ; la confirmation ou l'échec relèvera d'une phase ultérieure.
 *
 * Le montant est toujours repris du total de la commande calculé côté serveur.
 *
 * Un paiement enregistré notifie chaque producteur distinct concerné par une ligne de la
 * commande. Le message rend le statut persisté par le serveur et rappelle la simulation : il
 * n'affirme jamais un paiement reçu, réussi ou payé.
 *
 * Règles d'accès (Phase 3) : un paiement suit les droits de sa commande
 * (acheteur propriétaire, producteurs concernés, administrateur) ; seul
 * l'acheteur propriétaire peut initier un paiement (403 sinon).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaiementService {

    private final PaiementRepository paiementRepository;
    private final CommandeRepository commandeRepository;
    private final CommandeService commandeService;
    private final NotificationService notificationService;

    public PaiementResponse findById(Long id, UtilisateurPrincipal principal) {
        Paiement paiement = trouver(id);
        commandeService.verifierAcces(paiement.getCommande(), principal);
        return versResponse(paiement);
    }

    public PaiementResponse findByCommande(Long commandeId, UtilisateurPrincipal principal) {
        Commande commande = trouverCommande(commandeId);
        commandeService.verifierAcces(commande, principal);
        return versResponse(paiementRepository.findByCommandeId(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucun paiement n'existe pour la commande : " + commandeId)));
    }

    @Transactional
    public PaiementResponse creer(PaiementRequest request, UtilisateurPrincipal principal) {
        Commande commande = trouverCommande(request.commandeId());
        ControleAcces.exigerProprietaireOuAdmin(
                principal, commande.getAcheteur().getUtilisateur().getId());

        if (commande.getStatut() == StatutCommande.ANNULEE) {
            throw new BusinessException("Impossible d'initier un paiement pour une commande annulée.");
        }
        if (commande.getStatut() == StatutCommande.LIVREE) {
            throw new BusinessException("Cette commande est déjà livrée.");
        }
        if (paiementRepository.findByCommandeId(commande.getId()).isPresent()) {
            throw new BusinessException("Un paiement existe déjà pour cette commande.");
        }

        Paiement paiement = new Paiement();
        paiement.setCommande(commande);
        paiement.setMontant(commande.getTotal());
        paiement.setMoyenPaiement(request.moyenPaiement());
        paiement.setStatut(StatutPaiement.EN_ATTENTE);
        paiement.setReferenceTransaction("SIMU-" + UUID.randomUUID());
        Paiement enregistre = paiementRepository.save(paiement);

        notifierProducteursConcernes(enregistre);

        return versResponse(enregistre);
    }

    private Paiement trouver(Long id) {
        return paiementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", id));
    }

    private Commande trouverCommande(Long commandeId) {
        return commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande", commandeId));
    }

    /** Une notification par producteur distinct concerné, comme « Nouvelle commande » à la création. */
    private void notifierProducteursConcernes(Paiement paiement) {
        Commande commande = paiement.getCommande();
        Set<Producteur> producteurs = new LinkedHashSet<>();
        for (LigneCommande ligne : commande.getLignes()) {
            producteurs.add(ligne.getRecolte().getProducteur());
        }

        for (Producteur producteur : producteurs) {
            notificationService.notifier(
                    producteur.getUtilisateur(),
                    "Paiement simulé",
                    "Un paiement simulé a été enregistré pour la commande n° " + commande.getId()
                            + " : statut " + paiement.getStatut()
                            + ", aucune transaction réelle n'a été effectuée.");
        }
    }

    private PaiementResponse versResponse(Paiement paiement) {
        return new PaiementResponse(
                paiement.getId(),
                paiement.getCommande().getId(),
                paiement.getReferenceTransaction(),
                paiement.getMontant(),
                paiement.getMoyenPaiement(),
                paiement.getStatut(),
                paiement.getDateCreation(),
                paiement.getDateConfirmation());
    }
}
