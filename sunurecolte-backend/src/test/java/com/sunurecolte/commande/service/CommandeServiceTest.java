package com.sunurecolte.commande.service;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.notification.entity.Notification;
import com.sunurecolte.paiement.entity.MoyenPaiement;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests des règles métier de la création et du suivi des commandes.
 *
 * S'exécute contre le PostgreSQL local (aucun mock), dans une transaction
 * annulée par le rollback : chaque test part d'un état propre.
 */
class CommandeServiceTest extends IntegrationTestSupport {

    @Autowired
    private CommandeService commandeService;

    // --- Création : vérifications des références ---------------------------

    @Test
    void creerAvecUnAcheteurInexistantLeveUne404() {
        Recolte recolte = creerRecolte(creerProducteur(), "Tomate", "100.00", "450.00");

        CommandeRequest request = new CommandeRequest(
                999_999L, ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(recolte.getId(), new BigDecimal("2.00"))));

        assertThatThrownBy(() -> commandeService.creer(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Acheteur introuvable avec l'id : 999999");
    }

    @Test
    void creerAvecUneRecolteInexistanteLeveUne404() {
        Acheteur acheteur = creerAcheteur();

        CommandeRequest request = new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(999_999L, new BigDecimal("2.00"))));

        assertThatThrownBy(() -> commandeService.creer(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Recolte introuvable avec l'id : 999999");
    }

    // --- Création : calcul serveur du total et des sous-totaux -------------

    @Test
    void creerCalculeLeTotalEtLesSousTotauxCoteServeur() {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "100.00", "450.50");
        Recolte oignon = creerRecolte(producteur, "Oignon", "50.00", "300.00");

        CommandeResponse response = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(
                        new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")),
                        new LigneCommandeRequest(oignon.getId(), new BigDecimal("3.00")))));

        assertThat(response.statut()).isEqualTo(StatutCommande.EN_ATTENTE);
        assertThat(response.total()).isEqualByComparingTo("1801.00");
        assertThat(response.lignes()).hasSize(2);
        assertThat(response.lignes())
                .extracting(ligne -> ligne.sousTotal().toPlainString())
                .containsExactlyInAnyOrder("901.00", "900.00");
        assertThat(response.nomAcheteur()).isEqualTo("Awa Diop");
    }

    @Test
    void creerFusionneLesLignesPortantSurLaMemeRecolte() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "500.00");

        CommandeResponse response = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(
                        new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")),
                        new LigneCommandeRequest(tomate.getId(), new BigDecimal("3.00")))));

        assertThat(response.lignes()).hasSize(1);
        assertThat(response.lignes().get(0).quantite()).isEqualByComparingTo("5.00");
        assertThat(response.total()).isEqualByComparingTo("2500.00");
    }

    // --- Création : décrément du stock -------------------------------------

    @Test
    void creerDecrementeLeStockEtMarqueLaRecolteEpuisee() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "500.00");

        commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("30.00")))));

        Recolte rechargee = recolteRepository.findById(tomate.getId()).orElseThrow();
        assertThat(rechargee.getQuantiteDisponible()).isEqualByComparingTo("70.00");
        assertThat(rechargee.getStatut()).isEqualTo(StatutRecolte.DISPONIBLE);

        commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("70.00")))));

        Recolte vide = recolteRepository.findById(tomate.getId()).orElseThrow();
        assertThat(vide.getQuantiteDisponible()).isEqualByComparingTo("0.00");
        assertThat(vide.getStatut()).isEqualTo(StatutRecolte.EPUISEE);
    }

    @Test
    void creerAvecUnStockInsuffisantLeveUne400EtNeTouchePasAuStock() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "10.00", "500.00");
        int commandesAvant = commandeRepository.findAllByOrderByDateCreationDesc().size();

        CommandeRequest request = new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("11.00"))));

        assertThatThrownBy(() -> commandeService.creer(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Stock insuffisant pour « Tomate » : disponible 10.00, demandé 11.00.");

        Recolte inchangee = recolteRepository.findById(tomate.getId()).orElseThrow();
        assertThat(inchangee.getQuantiteDisponible()).isEqualByComparingTo("10.00");
        assertThat(inchangee.getStatut()).isEqualTo(StatutRecolte.DISPONIBLE);
        assertThat(commandeRepository.findAllByOrderByDateCreationDesc()).hasSize(commandesAvant);
    }

    @Test
    void creerAvecUneRecolteIndisponibleLeveUne400() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        tomate.setStatut(StatutRecolte.EPUISEE);
        recolteRepository.save(tomate);

        CommandeRequest request = new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("1.00"))));

        assertThatThrownBy(() -> commandeService.creer(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("La récolte « Tomate » n'est pas disponible.");
    }

    @Test
    void creerUneLivraisonSansAdresseNiTelephoneEstRefuse() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");

        CommandeRequest request = new CommandeRequest(
                acheteur.getId(), ModeReception.LIVRAISON, " ", null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("1.00"))));

        assertThatThrownBy(() -> commandeService.creer(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Une livraison exige une adresse et un numéro de téléphone de livraison.");
    }

    // --- Création : prix historique et notification ------------------------

    @Test
    void creerConserveLePrixHistoriqueDeLaRecolte() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");

        CommandeResponse commande = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")))));

        tomate.setPrixUnitaire(new BigDecimal("900.00"));
        recolteRepository.save(tomate);

        CommandeResponse relue = commandeService.findById(commande.id());
        assertThat(relue.lignes().get(0).prixUnitaire()).isEqualByComparingTo("500.00");
        assertThat(relue.total()).isEqualByComparingTo("1000.00");
    }

    @Test
    void creerNotifieLeProducteurDeLaNouvelleCommande() {
        Acheteur acheteur = creerAcheteur();
        Producteur producteur = creerProducteur();
        Recolte tomate = creerRecolte(producteur, "Tomate", "50.00", "500.00");

        CommandeResponse response = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")))));

        List<Notification> notifications = notificationRepository
                .findByUtilisateurIdOrderByDateCreationDesc(producteur.getUtilisateur().getId());
        assertThat(notifications).hasSize(1);
        assertThat(notifications.get(0).getTitre()).isEqualTo("Nouvelle commande");
        assertThat(notifications.get(0).getMessage())
                .contains("commande n° " + response.id())
                .contains("Awa Diop");
        assertThat(notifications.get(0).isLu()).isFalse();
    }

    // --- Transitions de statut ---------------------------------------------

    @Test
    void changerStatutAppliqueUneTransitionValideEtNotifieLAcheteur() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        CommandeResponse commande = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")))));

        CommandeResponse confirmee = commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.CONFIRMEE));
        assertThat(confirmee.statut()).isEqualTo(StatutCommande.CONFIRMEE);

        List<Notification> notifications = notificationRepository
                .findByUtilisateurIdOrderByDateCreationDesc(acheteur.getUtilisateur().getId());
        assertThat(notifications).hasSize(1);
        assertThat(notifications.get(0).getMessage()).contains("CONFIRMEE");
    }

    @Test
    void changerStatutRefuseUneTransitionInterdite() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        CommandeResponse commande = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")))));

        commandeService.changerStatut(commande.id(), new StatutCommandeRequest(StatutCommande.CONFIRMEE));
        commandeService.changerStatut(commande.id(), new StatutCommandeRequest(StatutCommande.PRETE));
        commandeService.changerStatut(commande.id(), new StatutCommandeRequest(StatutCommande.LIVREE));

        assertThatThrownBy(() -> commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.EN_ATTENTE)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Transition de statut interdite : LIVREE vers EN_ATTENTE.");

        assertThatThrownBy(() -> commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.CONFIRMEE)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Transition de statut interdite : LIVREE vers CONFIRMEE.");
    }

    @Test
    void changerStatutAvecLeMemeStatutEstRefuse() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        CommandeResponse commande = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("2.00")))));

        assertThatThrownBy(() -> commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.EN_ATTENTE)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("La commande est déjà au statut EN_ATTENTE.");
    }

    // --- Annulation : restauration du stock et du paiement -----------------

    @Test
    void annulerRestaureLeStockEtAnnuleLePaiementEnAttente() {
        Acheteur acheteur = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "50.00", "500.00");
        CommandeResponse commande = commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("50.00")))));

        assertThat(recolteRepository.findById(tomate.getId()).orElseThrow().getStatut())
                .isEqualTo(StatutRecolte.EPUISEE);

        Paiement paiement = new Paiement();
        paiement.setCommande(commandeRepository.findById(commande.id()).orElseThrow());
        paiement.setReferenceTransaction("SIMU-TEST-ANNULE");
        paiement.setMontant(new BigDecimal("25000.00"));
        paiement.setMoyenPaiement(MoyenPaiement.WAVE);
        paiementRepository.save(paiement);

        CommandeResponse annulee = commandeService.changerStatut(
                commande.id(), new StatutCommandeRequest(StatutCommande.ANNULEE));

        assertThat(annulee.statut()).isEqualTo(StatutCommande.ANNULEE);
        Recolte restauree = recolteRepository.findById(tomate.getId()).orElseThrow();
        assertThat(restauree.getQuantiteDisponible()).isEqualByComparingTo("50.00");
        assertThat(restauree.getStatut()).isEqualTo(StatutRecolte.DISPONIBLE);
        assertThat(paiementRepository.findByCommandeId(commande.id()).orElseThrow().getStatut())
                .isEqualTo(StatutPaiement.ANNULE);
    }

    // --- Consultation ------------------------------------------------------

    @Test
    void consulterUneCommandeInconnueLeveUne404() {
        assertThatThrownBy(() -> commandeService.findById(999_999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Commande introuvable avec l'id : 999999");
    }

    @Test
    void rechercherFiltreParAcheteur() {
        Acheteur premier = creerAcheteur();
        Acheteur second = creerAcheteur();
        Recolte tomate = creerRecolte(creerProducteur(), "Tomate", "100.00", "500.00");

        commandeService.creer(new CommandeRequest(
                premier.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("1.00")))));
        commandeService.creer(new CommandeRequest(
                second.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(tomate.getId(), new BigDecimal("1.00")))));

        assertThat(commandeService.rechercher(premier.getId())).hasSize(1);
        assertThat(commandeService.rechercher(premier.getId()).get(0).acheteurId())
                .isEqualTo(premier.getId());
    }
}
