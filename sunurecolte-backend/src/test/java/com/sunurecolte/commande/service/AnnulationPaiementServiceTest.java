package com.sunurecolte.commande.service;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Solde du paiement à l'annulation (LOT P1) : un paiement REUSSI devient REMBOURSE
 * (remboursement simulé, comme la réussite), un paiement EN_ATTENTE devient ANNULE,
 * et l'absence de paiement ne change rien. Le stock est restauré dans les trois cas.
 *
 * L'annulation reste ouverte même à une LIVRAISON jamais payée : la règle
 * « paiement avant confirmation » ne bloque que CONFIRMEE et PRETE.
 */
class AnnulationPaiementServiceTest extends IntegrationTestSupport {

    @Autowired
    private CommandeService commandeService;

    @Test
    void annulerUnPaiementReussiLeMarqueRembourseEtRestaureLeStock() {
        Acheteur acheteur = creerAcheteur();
        UtilisateurPrincipal principal = principalDe(acheteur.getUtilisateur());
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        CommandeResponse commande = commander(principal, acheteur, tomate, "50.00", ModeReception.RETRAIT);

        Paiement paiement = enregistrerPaiement(commande.id(), StatutPaiement.REUSSI);
        assertThat(recolteRepository.findById(tomate.getId()).orElseThrow().getStatut())
                .isEqualTo(StatutRecolte.EPUISEE);

        CommandeResponse annulee = commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.ANNULEE), principal);

        assertThat(annulee.statut()).isEqualTo(StatutCommande.ANNULEE);
        assertThat(paiementRepository.findById(paiement.getId()).orElseThrow().getStatut())
                .isEqualTo(StatutPaiement.REMBOURSE);
        Recolte restauree = recolteRepository.findById(tomate.getId()).orElseThrow();
        assertThat(restauree.getQuantiteDisponible()).isEqualByComparingTo("50.00");
        assertThat(restauree.getStatut()).isEqualTo(StatutRecolte.DISPONIBLE);
    }

    @Test
    void annulerUnPaiementEnAttenteLeMarqueAnnule() {
        Acheteur acheteur = creerAcheteur();
        UtilisateurPrincipal principal = principalDe(acheteur.getUtilisateur());
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "20.00", "500.00");
        CommandeResponse commande = commander(principal, acheteur, tomate, "10.00", ModeReception.RETRAIT);

        Paiement paiement = enregistrerPaiement(commande.id(), StatutPaiement.EN_ATTENTE);

        commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.ANNULEE), principal);

        assertThat(paiementRepository.findById(paiement.getId()).orElseThrow().getStatut())
                .isEqualTo(StatutPaiement.ANNULE);
    }

    @Test
    void annulerSansPaiementNenCreeAucunEtRestaureLeStock() {
        Acheteur acheteur = creerAcheteur();
        UtilisateurPrincipal principal = principalDe(acheteur.getUtilisateur());
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "20.00", "500.00");
        CommandeResponse commande = commander(principal, acheteur, tomate, "20.00", ModeReception.RETRAIT);

        commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.ANNULEE), principal);

        assertThat(paiementRepository.findByCommandeId(commande.id())).isEmpty();
        assertThat(recolteRepository.findById(tomate.getId()).orElseThrow().getQuantiteDisponible())
                .isEqualByComparingTo("20.00");
    }

    /** La règle « paiement avant confirmation » ne doit jamais verrouiller l'annulation. */
    @Test
    void annulerUneLivraisonJamaisPayeeRestePossible() {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        UtilisateurPrincipal principal = principalDe(acheteur.getUtilisateur());
        Recolte tomate = creerRecolte(producteur, "Tomate", "20.00", "500.00");
        CommandeResponse commande = commander(principal, acheteur, tomate, "10.00", ModeReception.LIVRAISON);

        // Le producteur concerné a le droit de confirmer : seul le paiement lui manque.
        assertThatThrownBy(() -> commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.CONFIRMEE),
                principalDe(producteur.getUtilisateur())))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une commande en livraison doit être payée avant d'être confirmée.");

        CommandeResponse annulee = commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.ANNULEE), principal);

        assertThat(annulee.statut()).isEqualTo(StatutCommande.ANNULEE);
        assertThat(recolteRepository.findById(tomate.getId()).orElseThrow().getQuantiteDisponible())
                .isEqualByComparingTo("20.00");
    }

    // --- Fabriques locales ---------------------------------------------------

    private CommandeResponse commander(UtilisateurPrincipal principal, Acheteur acheteur, Recolte recolte,
                                       String quantite, ModeReception modeReception) {
        return commandeService.creer(new CommandeRequest(
                acheteur.getId(), modeReception,
                modeReception == ModeReception.LIVRAISON ? "Parcelles 123, Sacré-Coeur 3, Dakar" : null,
                modeReception == ModeReception.LIVRAISON ? telephoneUnique() : null,
                null,
                List.of(new LigneCommandeRequest(recolte.getId(), new BigDecimal(quantite)))),
                principal);
    }

    private Paiement enregistrerPaiement(Long commandeId, StatutPaiement statut) {
        Paiement paiement = new Paiement();
        paiement.setCommande(commandeRepository.findById(commandeId).orElseThrow());
        paiement.setReferenceTransaction("SIMU-TEST-" + suffixeUnique());
        paiement.setMontant(new BigDecimal("5000.00"));
        paiement.setMoyenPaiement(MoyenPaiement.WAVE);
        paiement.setStatut(statut);
        return paiementRepository.save(paiement);
    }
}
