package com.sunurecolte.commande.service;

import com.sunurecolte.commande.dto.CommandeRequest;
import com.sunurecolte.commande.dto.CommandeResponse;
import com.sunurecolte.commande.dto.LigneCommandeRequest;
import com.sunurecolte.commande.dto.LigneCommandeResponse;
import com.sunurecolte.commande.dto.StatutCommandeRequest;
import com.sunurecolte.commande.entity.Commande;
import com.sunurecolte.commande.entity.LigneCommande;
import com.sunurecolte.commande.entity.ModeReception;
import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.commande.repository.CommandeRepository;
import com.sunurecolte.exception.BusinessException;
import com.sunurecolte.exception.ResourceNotFoundException;
import com.sunurecolte.notification.service.NotificationService;
import com.sunurecolte.paiement.entity.Paiement;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.paiement.repository.PaiementRepository;
import com.sunurecolte.recolte.entity.Recolte;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.user.entity.Acheteur;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.entity.Utilisateur;
import com.sunurecolte.user.repository.AcheteurRepository;
import com.sunurecolte.user.repository.ProducteurRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Gestion des commandes.
 *
 * Règles métier :
 * - l'acheteur, les récoltes et les quantités sont vérifiés côté serveur ;
 * - le total et les sous-totaux sont calculés par le serveur (jamais repris du client) ;
 * - prix_unitaire des lignes = prix historique au moment de la commande ;
 * - le stock est décrémenté dans la même transaction, sous verrou pessimiste,
 *   et ne peut jamais devenir négatif ;
 * - ordre des verrous : une opération qui verrouille à la fois une commande et des récoltes prend
 *   toujours la commande d'abord, puis les récoltes triées par identifiant (annulation, où le stock
 *   est rendu après le verrou de la commande ; paiement, qui ne verrouille que la commande). La
 *   création d'une commande ne verrouille que des récoltes, car sa
 *   ligne de commande n'existe pas encore. Aucun chemin n'attend une commande en tenant une récolte :
 *   le graphe d'attente ne peut donc pas boucler ;
 * - transitions de statut autorisées :
 *   EN_ATTENTE → {CONFIRMEE, ANNULEE} ; CONFIRMEE → {PRETE, ANNULEE} ;
 *   PRETE → {LIVREE} ; LIVREE et ANNULEE sont terminaux ;
 * - paiement avant confirmation : une commande en LIVRAISON ne peut être ni confirmée
 *   ni marquée prête sans un paiement au statut REUSSI. La règle vaut pour tous les rôles
 *   (producteur concerné comme administrateur) et ne s'applique pas au RETRAIT ;
 * - l'annulation restaure le stock et solde le paiement : REUSSI devient REMBOURSE
 *   (remboursement simulé), EN_ATTENTE devient ANNULE, ECHOUE reste inchangé ;
 * - la réponse d'une commande expose le statut et le moyen de son paiement (LOT P2a) :
 *   une commande sans paiement rend deux fois `null`, et une liste charge tous ses
 *   paiements en une seule requête plutôt qu'un appel par commande.
 *
 * Règles d'accès (Phase 3) :
 * - une commande n'est visible que par l'acheteur propriétaire, les producteurs
 *   concernés par au moins une ligne, et l'administrateur (403 sinon) ;
 * - seul l'acheteur propriétaire peut créer une commande (l'administrateur peut
 *   le faire pour lui) ;
 * - le cycle de vie (CONFIRMEE, PRETE, LIVREE) est piloté par un producteur
 *   concerné ou l'administrateur ; l'annulation est ouverte à l'acheteur
 *   propriétaire comme au producteur concerné.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommandeService {

    private static final Map<StatutCommande, Set<StatutCommande>> TRANSITIONS_AUTORISEES = Map.of(
            StatutCommande.EN_ATTENTE, EnumSet.of(StatutCommande.CONFIRMEE, StatutCommande.ANNULEE),
            StatutCommande.CONFIRMEE, EnumSet.of(StatutCommande.PRETE, StatutCommande.ANNULEE),
            StatutCommande.PRETE, EnumSet.of(StatutCommande.LIVREE),
            StatutCommande.LIVREE, EnumSet.noneOf(StatutCommande.class),
            StatutCommande.ANNULEE, EnumSet.noneOf(StatutCommande.class));

    /**
     * Règle « paiement avant confirmation » : pour une commande en LIVRAISON, ces cibles
     * exigent un paiement au statut REUSSI. Elle s'ajoute à {@link #TRANSITIONS_AUTORISEES}
     * sans la remplacer, et elle vaut pour tous les rôles — producteur concerné comme administrateur.
     * Une LIVRAISON déjà confirmée avant cette règle reste bloquée à PRETE, tandis que
     * l'initiation du paiement lui reste ouverte.
     */
    private static final Set<StatutCommande> CIBLES_EXIGEANT_UN_PAIEMENT =
            EnumSet.of(StatutCommande.CONFIRMEE, StatutCommande.PRETE);

    private final CommandeRepository commandeRepository;
    private final AcheteurRepository acheteurRepository;
    private final ProducteurRepository producteurRepository;
    private final RecolteRepository recolteRepository;
    private final PaiementRepository paiementRepository;
    private final NotificationService notificationService;

    /** Sert uniquement à recharger la commande sous verrou, jamais à écrire. */
    @PersistenceContext
    private EntityManager entityManager;

    public List<CommandeResponse> rechercher(Long acheteurId, UtilisateurPrincipal principal) {
        List<Commande> commandes = switch (principal.getRole()) {
            case ADMIN -> (acheteurId == null)
                    ? commandeRepository.findAllByOrderByDateCreationDesc()
                    : commandeRepository.findByAcheteurIdOrderByDateCreationDesc(acheteurId);
            case ACHETEUR -> commandesDeLAcheteur(acheteurId, principal);
            case PRODUCTEUR -> commandesDuProducteur(acheteurId, principal);
        };
        // Une seule requête de paiements pour toute la liste, jamais un appel par commande.
        Map<Long, Paiement> paiements = paiementsDeLaListe(commandes);
        return commandes.stream()
                .map(commande -> versResponse(commande, paiements.get(commande.getId())))
                .toList();
    }

    public CommandeResponse findById(Long id, UtilisateurPrincipal principal) {
        Commande commande = trouver(id);
        verifierAcces(commande, principal);
        return versResponse(commande, paiementDe(commande));
    }

    @Transactional
    public CommandeResponse creer(CommandeRequest request, UtilisateurPrincipal principal) {
        Acheteur acheteur = acheteurRepository.findById(request.acheteurId())
                .orElseThrow(() -> new ResourceNotFoundException("Acheteur", request.acheteurId()));
        ControleAcces.exigerProprietaireOuAdmin(principal, acheteur.getUtilisateur().getId());

        if (request.modeReception() == ModeReception.LIVRAISON
                && (estVide(request.adresseLivraison()) || estVide(request.telephoneLivraison()))) {
            throw new BusinessException(
                    "Une livraison exige une adresse et un numéro de téléphone de livraison.");
        }

        Commande commande = new Commande();
        commande.setAcheteur(acheteur);
        commande.setModeReception(request.modeReception());
        commande.setAdresseLivraison(request.adresseLivraison());
        commande.setTelephoneLivraison(request.telephoneLivraison());
        commande.setInstructionsLivraison(request.instructionsLivraison());
        commande.setStatut(StatutCommande.EN_ATTENTE);

        // Tri par identifiant de récolte : ordre de verrouillage stable entre transactions.
        Map<Long, BigDecimal> quantites = agregerQuantites(request.lignes());
        BigDecimal total = BigDecimal.ZERO;
        Set<Producteur> producteurs = new LinkedHashSet<>();

        for (Map.Entry<Long, BigDecimal> entree : quantites.entrySet()) {
            Recolte recolte = recolteRepository.findByIdForUpdate(entree.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Recolte", entree.getKey()));
            BigDecimal quantite = entree.getValue();

            if (recolte.getStatut() != StatutRecolte.DISPONIBLE) {
                throw new BusinessException(
                        "La récolte « " + recolte.getProduit() + " » n'est pas disponible.");
            }
            if (quantite.compareTo(recolte.getQuantiteDisponible()) > 0) {
                throw new BusinessException("Stock insuffisant pour « " + recolte.getProduit()
                        + " » : disponible " + recolte.getQuantiteDisponible()
                        + ", demandé " + quantite + ".");
            }

            LigneCommande ligne = new LigneCommande();
            ligne.setCommande(commande);
            ligne.setRecolte(recolte);
            ligne.setQuantite(quantite);
            ligne.setPrixUnitaire(recolte.getPrixUnitaire());
            ligne.setSousTotal(arrondir(recolte.getPrixUnitaire().multiply(quantite)));
            commande.getLignes().add(ligne);
            total = total.add(ligne.getSousTotal());

            BigDecimal stockRestant = recolte.getQuantiteDisponible().subtract(quantite);
            recolte.setQuantiteDisponible(stockRestant);
            if (stockRestant.compareTo(BigDecimal.ZERO) == 0) {
                recolte.setStatut(StatutRecolte.EPUISEE);
            }
            producteurs.add(recolte.getProducteur());
        }

        commande.setTotal(arrondir(total));
        Commande enregistree = commandeRepository.save(commande);

        for (Producteur producteur : producteurs) {
            notificationService.notifier(
                    producteur.getUtilisateur(),
                    "Nouvelle commande",
                    "Vous avez reçu la commande n° " + enregistree.getId() + " de la part de "
                            + nomComplet(acheteur.getUtilisateur()) + ".");
        }
        return versResponse(enregistree, paiementDe(enregistree));
    }

    @Transactional
    public CommandeResponse changerStatut(Long id, StatutCommandeRequest request,
                                          UtilisateurPrincipal principal) {
        // Le contrôle d'accès porte sur une lecture sans verrou : un demandeur qui n'est pas partie
        // prenante ne doit jamais pouvoir prendre le verrou d'une commande qui n'est pas la sienne.
        Commande commande = trouver(id);
        verifierDroitDeChangerStatut(commande, request.statut(), principal);

        // Tout ce qui décide et tout ce qui écrit se joue ensuite sur la version commitée lue sous
        // verrou : deux annulations simultanées ne peuvent plus toutes deux se croire EN_ATTENTE et
        // rendre le stock chacune de leur côté.
        verrouillerEtRecharger(commande);

        StatutCommande actuel = commande.getStatut();
        StatutCommande cible = request.statut();

        if (cible == actuel) {
            throw new BusinessException("La commande est déjà au statut " + actuel + ".");
        }
        if (!TRANSITIONS_AUTORISEES.getOrDefault(actuel, Set.of()).contains(cible)) {
            throw new BusinessException(
                    "Transition de statut interdite : " + actuel + " vers " + cible + ".");
        }

        verifierPaiementAvantConfirmation(commande, cible);

        // Sous le verrou de la commande, donc une seule fois par commande.
        if (cible == StatutCommande.ANNULEE) {
            restaurerStock(commande);
            rembourserOuAnnulerPaiement(commande);
        }

        commande.setStatut(cible);
        Commande enregistree = commandeRepository.save(commande);

        notificationService.notifier(
                commande.getAcheteur().getUtilisateur(),
                "Suivi de commande",
                "Le statut de votre commande n° " + enregistree.getId()
                        + " est désormais : " + cible + ".");

        return versResponse(enregistree, paiementDe(enregistree));
    }

    /**
     * Vérifie que le demandeur est partie prenante de la commande : l'acheteur
     * propriétaire, un producteur concerné par au moins une ligne, ou l'administrateur.
     * Utilisé également par PaiementService.
     */
    public void verifierAcces(Commande commande, UtilisateurPrincipal principal) {
        if (ControleAcces.estAdmin(principal)
                || estAcheteurProprietaire(commande, principal)
                || estProducteurConcerne(commande, principal)) {
            return;
        }
        throw ControleAcces.accesRefuse();
    }

    private List<Commande> commandesDeLAcheteur(Long acheteurId, UtilisateurPrincipal principal) {
        Acheteur acheteur = acheteurDe(principal);
        if (acheteurId != null && !acheteurId.equals(acheteur.getId())) {
            throw ControleAcces.accesRefuse();
        }
        return commandeRepository.findByAcheteurIdOrderByDateCreationDesc(acheteur.getId());
    }

    private List<Commande> commandesDuProducteur(Long acheteurId, UtilisateurPrincipal principal) {
        List<Commande> commandes = commandeRepository.findByProducteurIdOrderByDateCreationDesc(
                producteurDe(principal).getId());
        if (acheteurId == null) {
            return commandes;
        }
        return commandes.stream()
                .filter(commande -> commande.getAcheteur().getId().equals(acheteurId))
                .toList();
    }

    /**
     * CONFIRMEE, PRETE et LIVREE relèvent du producteur concerné ou de l'administrateur.
     * L'annulation reste ouverte aux deux parties prenantes.
     */
    private void verifierDroitDeChangerStatut(Commande commande, StatutCommande cible,
                                              UtilisateurPrincipal principal) {
        if (ControleAcces.estAdmin(principal)) {
            return;
        }
        if (cible == StatutCommande.ANNULEE) {
            verifierAcces(commande, principal);
            return;
        }
        if (estProducteurConcerne(commande, principal)) {
            return;
        }
        throw ControleAcces.accesRefuse();
    }

    private boolean estAcheteurProprietaire(Commande commande, UtilisateurPrincipal principal) {
        return principal.getRole() == Role.ACHETEUR
                && commande.getAcheteur().getUtilisateur().getId().equals(principal.getId());
    }

    private boolean estProducteurConcerne(Commande commande, UtilisateurPrincipal principal) {
        if (principal.getRole() != Role.PRODUCTEUR) {
            return false;
        }
        return producteurRepository.findByUtilisateurId(principal.getId())
                .map(producteur -> commande.getLignes().stream()
                        .anyMatch(ligne -> ligne.getRecolte().getProducteur().getId()
                                .equals(producteur.getId())))
                .orElse(false);
    }

    private Acheteur acheteurDe(UtilisateurPrincipal principal) {
        return acheteurRepository.findByUtilisateurId(principal.getId())
                .orElseThrow(ControleAcces::accesRefuse);
    }

    private Producteur producteurDe(UtilisateurPrincipal principal) {
        return producteurRepository.findByUtilisateurId(principal.getId())
                .orElseThrow(ControleAcces::accesRefuse);
    }

    private Map<Long, BigDecimal> agregerQuantites(List<LigneCommandeRequest> lignes) {
        Map<Long, BigDecimal> quantites = new TreeMap<>();
        for (LigneCommandeRequest ligne : lignes) {
            quantites.merge(ligne.recolteId(), ligne.quantite(), BigDecimal::add);
        }
        return quantites;
    }

    private void restaurerStock(Commande commande) {
        Map<Long, BigDecimal> quantites = new TreeMap<>();
        for (LigneCommande ligne : commande.getLignes()) {
            quantites.merge(ligne.getRecolte().getId(), ligne.getQuantite(), BigDecimal::add);
        }
        for (Map.Entry<Long, BigDecimal> entree : quantites.entrySet()) {
            Recolte recolte = recolteRepository.findByIdForUpdate(entree.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Recolte", entree.getKey()));
            recolte.setQuantiteDisponible(recolte.getQuantiteDisponible().add(entree.getValue()));
            if (recolte.getStatut() == StatutRecolte.EPUISEE) {
                recolte.setStatut(StatutRecolte.DISPONIBLE);
            }
        }
    }

    /**
     * Règle « paiement avant confirmation » pour les livraisons : CONFIRMEE et PRETE sont
     * refusées tant que la commande n'a pas un paiement au statut REUSSI. Un paiement en
     * attente, échoué, remboursé ou annulé ne débloque pas le cycle, et une commande sans
     * paiement reste soumise à la même exigence.
     */
    private void verifierPaiementAvantConfirmation(Commande commande, StatutCommande cible) {
        if (commande.getModeReception() != ModeReception.LIVRAISON
                || !CIBLES_EXIGEANT_UN_PAIEMENT.contains(cible)) {
            return;
        }
        boolean payee = paiementRepository.findByCommandeId(commande.getId())
                .map(paiement -> paiement.getStatut() == StatutPaiement.REUSSI)
                .orElse(false);
        if (payee) {
            return;
        }
        throw new BusinessException(cible == StatutCommande.CONFIRMEE
                ? "Une commande en livraison doit être payée avant d'être confirmée."
                : "Une commande en livraison doit être payée avant d'être marquée prête.");
    }

    /**
     * Solde du paiement à l'annulation : un paiement réussi est remboursé (remboursement
     * simulé, comme la réussite), un paiement encore en attente est annulé. Les autres
     * statuts (ECHOUÉ, déjà remboursé ou annulé) restent inchangés.
     */
    private void rembourserOuAnnulerPaiement(Commande commande) {
        paiementRepository.findByCommandeId(commande.getId()).ifPresent(paiement -> {
            if (paiement.getStatut() == StatutPaiement.EN_ATTENTE) {
                paiement.setStatut(StatutPaiement.ANNULE);
            } else if (paiement.getStatut() == StatutPaiement.REUSSI) {
                paiement.setStatut(StatutPaiement.REMBOURSE);
            }
        });
    }

    private Commande trouver(Long id) {
        return commandeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Commande", id));
    }

    /**
     * Prend le verrou pessimiste en écriture sur la commande, puis recharge la version commitée dans
     * l'instance déjà suivie. La requête verrouillée rend en effet la même instance sans y appliquer
     * l'état relu : sans la relecture, la décision se prendrait sur un statut périmé et le verrou ne
     * protégerait que la ligne. L'instance reste suivie, contrairement à un détachement, qui casserait
     * les écritures ultérieures de la transaction.
     */
    private void verrouillerEtRecharger(Commande commande) {
        trouverAvecVerrou(commande.getId());
        entityManager.refresh(commande);
    }

    private Commande trouverAvecVerrou(Long id) {
        return commandeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Commande", id));
    }

    /**
     * Paiement d'une commande, chargé séparément : `null` quand aucun paiement n'existe,
     * ce que la réponse rend comme `null` plutôt que d'inventer un statut.
     */
    private Paiement paiementDe(Commande commande) {
        return paiementRepository.findByCommandeId(commande.getId()).orElse(null);
    }

    /**
     * Paiements de toute une liste de commandes en une seule requête. La clé est
     * l'identifiant de la commande, lu sur le proxy sans initialisation supplémentaire.
     */
    private Map<Long, Paiement> paiementsDeLaListe(List<Commande> commandes) {
        if (commandes.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = commandes.stream().map(Commande::getId).toList();
        return paiementRepository.findByCommandeIdIn(ids).stream()
                .collect(Collectors.toMap(paiement -> paiement.getCommande().getId(), paiement -> paiement));
    }

    private CommandeResponse versResponse(Commande commande, Paiement paiement) {
        List<LigneCommandeResponse> lignes = commande.getLignes().stream()
                .map(ligne -> new LigneCommandeResponse(
                        ligne.getId(),
                        ligne.getRecolte().getId(),
                        ligne.getRecolte().getProduit(),
                        ligne.getRecolte().getUnite(),
                        ligne.getQuantite(),
                        ligne.getPrixUnitaire(),
                        ligne.getSousTotal()))
                .toList();

        return new CommandeResponse(
                commande.getId(),
                commande.getAcheteur().getId(),
                nomComplet(commande.getAcheteur().getUtilisateur()),
                commande.getDateCreation(),
                commande.getStatut(),
                commande.getTotal(),
                commande.getModeReception(),
                commande.getAdresseLivraison(),
                commande.getTelephoneLivraison(),
                commande.getInstructionsLivraison(),
                lignes,
                paiement == null ? null : paiement.getStatut(),
                paiement == null ? null : paiement.getMoyenPaiement());
    }

    private static BigDecimal arrondir(BigDecimal montant) {
        return montant.setScale(2, RoundingMode.HALF_UP);
    }

    private static String nomComplet(Utilisateur utilisateur) {
        return utilisateur.getPrenom() + " " + utilisateur.getNom();
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }
}
