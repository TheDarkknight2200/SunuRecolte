package com.sunurecolte.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.commande.repository.LigneCommandeRepository;
import com.sunurecolte.notification.repository.NotificationRepository;
import com.sunurecolte.paiement.repository.PaiementRepository;
import com.sunurecolte.prixmarche.repository.PrixMarcheRepository;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.user.entity.*;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import com.sunurecolte.user.repository.UtilisateurRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Base commune des tests d'integration de la Phase 2.
 *
 * Memes principes que les tests de la Phase 1 : aucune base embarque, aucun mock.
 * Les tests s'executent contre le PostgreSQL local, avec le schema cree par Flyway.
 * Chaque test est transactionnel : ses donnees sont annulees par le rollback.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public abstract class IntegrationTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UtilisateurRepository utilisateurRepository;

    @Autowired
    protected ProducteurRepository producteurRepository;

    @Autowired
    protected AcheteurRepository acheteurRepository;

    @Autowired
    protected RecolteRepository recolteRepository;

    @Autowired
    protected CommandeRepository commandeRepository;

    @Autowired
    protected LigneCommandeRepository ligneCommandeRepository;

    @Autowired
    protected PaiementRepository paiementRepository;

    @Autowired
    protected NotificationRepository notificationRepository;

    @Autowired
    protected PrixMarcheRepository prixMarcheRepository;

    protected String suffixeUnique() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    protected Utilisateur creerUtilisateur(Role role) {
        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom("Diop");
        utilisateur.setPrenom("Awa");
        utilisateur.setEmail(role.name().toLowerCase() + "." + suffixeUnique() + "@sunurecolte.sn");
        utilisateur.setTelephone("77" + String.format("%07d", Math.abs(UUID.randomUUID().hashCode()) % 10_000_000));
        utilisateur.setMotDePasse("empreinte-de-mot-de-passe-de-test");
        utilisateur.setRole(role);
        return utilisateurRepository.save(utilisateur);
    }

    protected Producteur creerProducteur() {
        return creerProducteur(Filiere.MARAICHAGE);
    }

    protected Producteur creerProducteur(Filiere filiere) {
        Utilisateur utilisateur = creerUtilisateur(Role.PRODUCTEUR);
        Producteur producteur = new Producteur();
        producteur.setUtilisateur(utilisateur);
        producteur.setFiliere(filiere);
        producteur.setLocalisationExploitation("Rufisque");
        return producteurRepository.save(producteur);
    }

    protected Acheteur creerAcheteur() {
        Utilisateur utilisateur = creerUtilisateur(Role.ACHETEUR);
        Acheteur acheteur = new Acheteur();
        acheteur.setUtilisateur(utilisateur);
        acheteur.setTypeAcheteur(TypeAcheteur.RESTAURATEUR);
        return acheteurRepository.save(acheteur);
    }

    protected Recolte creerRecolte(Producteur producteur, String produit, String quantite, String prixUnitaire) {
        Recolte recolte = new Recolte();
        recolte.setProducteur(producteur);
        recolte.setProduit(produit);
        recolte.setQuantiteDisponible(new BigDecimal(quantite));
        recolte.setUnite("kg");
        recolte.setPrixUnitaire(new BigDecimal(prixUnitaire));
        return recolteRepository.save(recolte);
    }
}
