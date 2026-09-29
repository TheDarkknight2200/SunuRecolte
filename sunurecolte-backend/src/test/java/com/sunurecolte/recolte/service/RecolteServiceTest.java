package com.sunurecolte.recolte.service;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.service.CommandeService;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ForbiddenException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.recolte.dto.RecolteRequest;
import com.sunurecolte.recolte.dto.RecolteResponse;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.support.IntegrationTestSupport;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Filiere;
import com.sunurecolte.user.entity.Producteur;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests des regles metier de RecolteService (base PostgreSQL reelle, rollback).
 *
 * Depuis la Phase 3, les operations d'ecriture verifient l'identite portee par
 * le principal : chaque appel passe donc le principal du producteur concerne
 * (ou celui d'un administrateur pour verifier les contrats 404).
 */
class RecolteServiceTest extends IntegrationTestSupport {

    @Autowired
    private RecolteService recolteService;

    @Autowired
    private CommandeService commandeService;

    @Test
    void creerAvecUnProducteurInexistantLeveUne404() {
        RecolteRequest request = new RecolteRequest(
                999_999L, "Tomate", null, new BigDecimal("50.00"), null, null,
                "kg", new BigDecimal("400.00"), null, null, null);

        // Le chargement du producteur precede le controle d'acces : 404 avant 403.
        assertThatThrownBy(() -> recolteService.creer(request, principalDe(creerAdministrateur())))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Producteur");
    }

    @Test
    void creerPuisConsulterUneRecolte() {
        Producteur producteur = creerProducteur(Filiere.MARAICHAGE);

        RecolteResponse creee = recolteService.creer(new RecolteRequest(
                producteur.getId(), "Tomate", "Tomates fraiches", new BigDecimal("50.00"),
                new BigDecimal("5.00"), new BigDecimal("20.00"), "kg", new BigDecimal("400.00"),
                null, "Rufisque", LocalDate.now().plusDays(1)),
                principalDe(producteur.getUtilisateur()));

        assertThat(creee.id()).isNotNull();
        assertThat(creee.statut()).isEqualTo(StatutRecolte.DISPONIBLE);
        assertThat(creee.nomProducteur()).isEqualTo("Awa Diop");
        assertThat(creee.localisationProducteur()).isEqualTo("Rufisque");
        assertThat(creee.prixUnitaire()).isEqualByComparingTo("400.00");
        assertThat(recolteService.findById(creee.id()).produit()).isEqualTo("Tomate");
    }

    @Test
    void consulterUneRecolteInconnueLeveUne404() {
        assertThatThrownBy(() -> recolteService.findById(999_999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Recolte introuvable");
    }

    @Test
    void modifierAvecUnAutreProducteurEstRefuse() {
        Producteur proprietaire = creerProducteur();
        Producteur autreProducteur = creerProducteur();
        Recolte recolte = creerRecolte(proprietaire, "Tomate", "50.00", "400.00");

        RecolteRequest request = new RecolteRequest(
                autreProducteur.getId(), "Tomate", null, new BigDecimal("50.00"), null, null,
                "kg", new BigDecimal("400.00"), null, null, null);

        assertThatThrownBy(() -> recolteService.modifier(
                recolte.getId(), request, principalDe(proprietaire.getUtilisateur())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("producteur");
    }

    @Test
    void quantiteMinSuperieureALaQuantiteMaxEstRefusee() {
        Producteur producteur = creerProducteur();

        RecolteRequest request = new RecolteRequest(
                producteur.getId(), "Tomate", null, new BigDecimal("50.00"),
                new BigDecimal("30.00"), new BigDecimal("10.00"), "kg", new BigDecimal("400.00"),
                null, null, null);

        assertThatThrownBy(() -> recolteService.creer(request, principalDe(producteur.getUtilisateur())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("quantité minimale");
    }

    @Test
    void supprimerUneRecolteUtiliseeDansUneCommandeEstRefuse() {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "50.00", "400.00");
        Acheteur acheteur = creerAcheteur();

        commandeService.creer(new CommandeRequest(
                acheteur.getId(), ModeReception.RETRAIT, null, null, null,
                List.of(new LigneCommandeRequest(recolte.getId(), new BigDecimal("5.00")))),
                principalDe(acheteur.getUtilisateur()));

        assertThatThrownBy(() -> recolteService.supprimer(
                recolte.getId(), principalDe(producteur.getUtilisateur())))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("commande");
    }

    @Test
    void supprimerUneRecolteNonCommandeeFonctionne() {
        Producteur producteur = creerProducteur();
        Recolte recolte = creerRecolte(producteur, "Tomate", "50.00", "400.00");

        recolteService.supprimer(recolte.getId(), principalDe(producteur.getUtilisateur()));

        assertThat(recolteRepository.findById(recolte.getId())).isEmpty();
    }

    @Test
    void rechercherAppliqueLesFiltresStatutFiliereEtTexte() {
        String suffixe = suffixeUnique();
        Producteur maraicher = creerProducteur(Filiere.MARAICHAGE);
        Producteur eleveur = creerProducteur(Filiere.ELEVAGE);
        creerRecolte(maraicher, "Tomate-" + suffixe, "50.00", "400.00");
        creerRecolte(eleveur, "Mouton-" + suffixe, "10.00", "45000.00");

        List<RecolteResponse> sansFiltre = recolteService.rechercher(null, null, null, suffixe);
        assertThat(sansFiltre).hasSize(2);

        List<RecolteResponse> parFiliere = recolteService.rechercher(null, Filiere.MARAICHAGE, null, suffixe);
        assertThat(parFiliere).extracting(RecolteResponse::produit)
                .containsExactly("Tomate-" + suffixe);

        List<RecolteResponse> parStatut = recolteService.rechercher(
                StatutRecolte.DISPONIBLE, null, null, suffixe);
        assertThat(parStatut).hasSize(2);

        List<RecolteResponse> parStatutEpuise = recolteService.rechercher(
                StatutRecolte.EPUISEE, null, null, suffixe);
        assertThat(parStatutEpuise).isEmpty();

        List<RecolteResponse> parTexte = recolteService.rechercher(null, null, null, "mouton-" + suffixe);
        assertThat(parTexte).extracting(RecolteResponse::produit)
                .containsExactly("Mouton-" + suffixe);

        List<RecolteResponse> combinaison = recolteService.rechercher(
                StatutRecolte.DISPONIBLE, Filiere.ELEVAGE, null, "mouton-" + suffixe);
        assertThat(combinaison).hasSize(1);
    }

    @Test
    void rechercherFiltreParProducteur() {
        String suffixe = suffixeUnique();
        Producteur maraicher = creerProducteur(Filiere.MARAICHAGE);
        Producteur eleveur = creerProducteur(Filiere.ELEVAGE);
        creerRecolte(maraicher, "Tomate-" + suffixe, "50.00", "400.00");
        creerRecolte(maraicher, "Aubergine-" + suffixe, "20.00", "600.00");
        creerRecolte(eleveur, "Mouton-" + suffixe, "10.00", "45000.00");

        List<RecolteResponse> duMaraicher = recolteService.rechercher(
                null, null, maraicher.getId(), suffixe);
        assertThat(duMaraicher).extracting(RecolteResponse::produit)
                .containsExactlyInAnyOrder("Tomate-" + suffixe, "Aubergine-" + suffixe);
        assertThat(duMaraicher).extracting(RecolteResponse::producteurId)
                .containsOnly(maraicher.getId());

        List<RecolteResponse> combineAvecLeStatut = recolteService.rechercher(
                StatutRecolte.DISPONIBLE, Filiere.MARAICHAGE, maraicher.getId(), suffixe);
        assertThat(combineAvecLeStatut).hasSize(2);

        List<RecolteResponse> autreProduitEtAutreFiliere = recolteService.rechercher(
                null, Filiere.ELEVAGE, maraicher.getId(), suffixe);
        assertThat(autreProduitEtAutreFiliere).isEmpty();
    }

    @Test
    void mesRecoltesRetournentUniquementCellesDuProducteurConnecte() {
        String suffixe = suffixeUnique();
        Producteur producteur = creerProducteur();
        Producteur autre = creerProducteur(Filiere.ELEVAGE);
        creerRecolte(producteur, "Tomate-" + suffixe, "50.00", "400.00");
        creerRecolte(autre, "Mouton-" + suffixe, "10.00", "45000.00");

        List<RecolteResponse> resultat = recolteService.mesRecoltes(
                null, suffixe, principalDe(producteur.getUtilisateur()));

        assertThat(resultat).extracting(RecolteResponse::produit)
                .containsExactly("Tomate-" + suffixe);
        assertThat(resultat).extracting(RecolteResponse::producteurId)
                .containsOnly(producteur.getId());
    }

    @Test
    void mesRecoltesRefusentUnPrincipalNonProducteur() {
        Acheteur acheteur = creerAcheteur();

        assertThatThrownBy(() -> recolteService.mesRecoltes(
                null, null, principalDe(acheteur.getUtilisateur())))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.");

        assertThatThrownBy(() -> recolteService.mesRecoltes(
                null, null, principalDe(creerAdministrateur())))
                .isInstanceOf(ForbiddenException.class);
    }
}
