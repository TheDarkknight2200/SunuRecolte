package com.sunurecolte.statistiques.service;

import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.recolte.repository.RecolteRepository;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.statistiques.dto.StatutNombreResponse;
import com.sunurecolte.statistiques.dto.StatistiquesProducteurResponse;
import com.sunurecolte.statistiques.dto.StockFaibleResponse;
import com.sunurecolte.statistiques.dto.TopRecolteResponse;
import com.sunurecolte.statistiques.dto.VenteJourResponse;
import com.sunurecolte.statistiques.projection.CommandeMontantProjection;
import com.sunurecolte.statistiques.projection.StockFaibleProjection;
import com.sunurecolte.statistiques.projection.StatutNombreProjection;
import com.sunurecolte.statistiques.projection.TopRecolteProjection;
import com.sunurecolte.statistiques.projection.TotauxVenteProjection;
import com.sunurecolte.statistiques.repository.StatistiquesLigneCommandeRepository;
import com.sunurecolte.user.entity.Producteur;
import com.sunurecolte.user.entity.Role;
import com.sunurecolte.user.repository.ProducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Statistiques de vente du producteur connecté (lot STAT-1).
 *
 * <p>Règles de calcul, dans l'ordre où elles s'appliquent :
 * <ol>
 *   <li><b>Grain</b> — toute valeur est lue sur {@code lignes_commande} jointées à
 *       {@code recolte.producteur.id = producteurDuJeton}. Une commande peut mélanger les récoltes
 *       de plusieurs producteurs (vérifié dans {@code CommandeService.creer}) : son {@code total}
 *       n'est jamais utilisé, seul {@code sous_total} des lignes du producteur compte. Une commande
 *       mixte est donc comptée <b>une fois</b> dans {@code nombreCommandes} de chaque producteur
 *       concerné, avec le seul montant de ses lignes à lui ;
 *   <li><b>Période</b> — filtre sur {@code commande.dateCreation} (aucune date portée par une ligne),
 *       bornes en jours civils, valeur inconnue en 400 : les trois libellés et leurs bornes sont
 *       définis dans {@link ReglesStatistiques#bornes(String)}, communs au lot STAT-2 ;
 *   <li><b>Chiffre d'affaires</b> — somme des {@code sous_total} des lignes du producteur dont la
 *       commande est dans {@link ReglesStatistiques#STATUTS_RETENUS} (EN_ATTENTE, CONFIRMEE, PRETE,
 *       LIVREE). <b>Les commandes annulées sont exclues</b> : dans le modèle approuvé aucun statut
 *       « refusée » n'existe, et {@code REMBOURSE} est un statut de <i>paiement</i> que seule
 *       l'annulation écrit — exclure ANNULEE exclut donc de fait les commandes remboursées ;
 *   <li><b>nombreCommandes</b> — commandes distinctes contenant au moins une ligne du producteur sur la
 *       période, <b>tous statuts confondus</b> (annulées comprises) : c'est le dénominateur du taux
 *       d'annulation et ce que reflète {@code repartitionStatuts}, rendue dans l'ordre du parcours
 *       (EN_ATTENTE, CONFIRMEE, PRETE, LIVREE, ANNULEE) ;
 *   <li><b>tauxAnnulation</b> — commandes ANNULEE ÷ {@code nombreCommandes} × 100, arrondi à deux
 *       décimales (HALF_UP), 0 si le producteur n'a aucune commande sur la période ;
 *   <li><b>panierMoyen</b> — chiffre d'affaires ÷ nombre de commandes <i>retenues</i> (hors annulées),
 *       arrondi à deux décimales, 0 si aucune commande retenue : le numérateur et le dénominateur sont
 *       ainsi cohérents, un panier moyen ne rapporte jamais une annulation ;
 *   <li><b>ventesParJour</b> — une entrée par jour civil de la période, sans trou : les jours sans vente
 *       sont rendus à 0. Un seul aller-retour agrège par commande, puis les journées sont cumulées ici ;
 *   <li><b>topRecoltes</b> — 5 maximum, regroupées par récolte, commandes annulées exclues, revenu
 *       décroissant puis identifiant croissant ;
 *   <li><b>stockFaible</b> — récoltes <i>actuelles</i> du producteur (la période ne s'y applique pas :
 *       c'est un état du stock, pas un historique) dont {@code quantite_disponible} est sous
 *       {@link #SEUIL_STOCK_FAIBLE} ou dont le statut est EPUISEE, quantité croissante ;
 *   <li><b>commandesATraiter</b> — commandes distinctes de la période aux statuts EN_ATTENTE, CONFIRMEE
 *       ou PRETE : les trois seuls statuts où une action du producteur est attendue
 *       ({@code CommandeService.TRANSITIONS_AUTORISEES} — LIVREE et ANNULEE sont terminaux) ;
 *   <li><b>Accès</b> — le rôle est recontrôlé dans ce service en plus de {@code SecurityConfig}, et le
 *       producteur est <b>toujours</b> déduit de l'utilisateur authentifié : aucun identifiant de
 *       producteur n'est accepté du client.
 * </ol>
 *
 * <p>Deux limites connues, assumées et non masquées :
 * <ul>
 *   <li>les commandes EN_ATTENTE sont <b>incluses</b> dans le chiffre d'affaires et dans le panier moyen :
 *       une commande enregistrée mais pas encore honorée y figure, ce qui surestime les encaissements si
 *       l'acheteur renonce ensuite sans annuler ;
 *   <li>{@link #SEUIL_STOCK_FAIBLE} est un nombre unique, comparé à {@code quantite_disponible} quelle
 *       que soit l'unité de la récolte : 5 kg, 5 bottes ou 5 tonnes déclenchent la même alerte.
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatistiquesProducteurService {

    /** Seuil d'alerte du stock, en unité de la récolte — identique quelle que soit cette unité. */
    static final int SEUIL_STOCK_FAIBLE = 5;

    /** Statuts où le producteur a une action à produire. */
    private static final Set<StatutCommande> STATUTS_A_TRAITER =
            EnumSet.of(StatutCommande.EN_ATTENTE, StatutCommande.CONFIRMEE, StatutCommande.PRETE);

    private final StatistiquesLigneCommandeRepository statistiques;
    private final RecolteRepository recolteRepository;
    private final ProducteurRepository producteurRepository;

    /**
     * Statistiques de la période demandée pour le producteur porté par le jeton.
     *
     * @param periode   {@code 7j}, {@code 30j} ou {@code mois} ; null ou absent → {@code 30j}
     * @param principal identité authentifiée — doit porter le rôle PRODUCTEUR (403 sinon)
     */
    public StatistiquesProducteurResponse statistiques(String periode, UtilisateurPrincipal principal) {
        Producteur producteur = producteurDuJeton(principal);
        ReglesStatistiques.Bornes bornes = ReglesStatistiques.bornes(periode);
        LocalDateTime debut = bornes.debutInstant();
        LocalDateTime fin = bornes.finInstant();
        Long producteurId = producteur.getId();
        Set<StatutCommande> statutsRetenus = ReglesStatistiques.STATUTS_RETENUS;

        TotauxVenteProjection totaux =
                statistiques.totauxVente(producteurId, statutsRetenus, debut, fin);
        BigDecimal chiffreAffaires = ReglesStatistiques.arrondir(totaux.getChiffreAffaires());
        long commandesRetenues = totaux.getNombreCommandes();

        List<StatutNombreProjection> repartition =
                statistiques.repartitionStatuts(producteurId, debut, fin);
        long nombreCommandes = repartition.stream().mapToLong(StatutNombreProjection::getNombre).sum();
        long annulees = repartition.stream()
                .filter(ligne -> ligne.getStatut() == StatutCommande.ANNULEE)
                .mapToLong(StatutNombreProjection::getNombre)
                .sum();

        BigDecimal tauxAnnulation = nombreCommandes == 0
                ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(annulees)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(nombreCommandes), 2, RoundingMode.HALF_UP);
        BigDecimal panierMoyen = commandesRetenues == 0
                ? BigDecimal.ZERO.setScale(2)
                : chiffreAffaires.divide(BigDecimal.valueOf(commandesRetenues), 2, RoundingMode.HALF_UP);

        return new StatistiquesProducteurResponse(
                chiffreAffaires,
                nombreCommandes,
                panierMoyen,
                tauxAnnulation,
                versRepartition(repartition),
                versVentesParJour(statistiques.montantsParCommande(producteurId, statutsRetenus, debut, fin),
                        bornes),
                versTopRecoltes(statistiques.topRecoltes(producteurId, statutsRetenus, debut, fin)),
                versStockFaible(recolteRepository.trouverStockFaible(
                        producteurId, BigDecimal.valueOf(SEUIL_STOCK_FAIBLE), StatutRecolte.EPUISEE)),
                statistiques.nombreCommandesATraiter(producteurId, STATUTS_A_TRAITER, debut, fin));
    }

    /** Rôle relu sur l'identité authentifiée (jamais sur un paramètre client), puis profil producteur. */
    private Producteur producteurDuJeton(UtilisateurPrincipal principal) {
        if (principal.getRole() != Role.PRODUCTEUR) {
            throw ControleAcces.accesRefuse();
        }
        return producteurRepository.findByUtilisateurId(principal.getId())
                .orElseThrow(ControleAcces::accesRefuse);
    }

    /** Ordre du parcours de commande (EN_ATTENTE → ANNULEE) : un rendu stable, trié côté service. */
    private List<StatutNombreResponse> versRepartition(List<StatutNombreProjection> repartition) {
        return repartition.stream()
                .sorted(Comparator.comparing(StatutNombreProjection::getStatut))
                .map(ligne -> new StatutNombreResponse(ligne.getStatut(), ligne.getNombre()))
                .toList();
    }

    /** Une entrée par jour civil de la période, les jours sans vente à zéro, en ordre chronologique. */
    private List<VenteJourResponse> versVentesParJour(List<CommandeMontantProjection> montants,
                                                      ReglesStatistiques.Bornes bornes) {
        Map<LocalDate, BigDecimal> parJour = new TreeMap<>();
        for (LocalDate jour = bornes.debut(); !jour.isAfter(bornes.fin()); jour = jour.plusDays(1)) {
            parJour.put(jour, BigDecimal.ZERO);
        }
        for (CommandeMontantProjection montant : montants) {
            LocalDate jour = montant.getDateCreation().toLocalDate();
            parJour.merge(jour, montant.getMontant(), BigDecimal::add);
        }
        List<VenteJourResponse> ventes = new ArrayList<>(parJour.size());
        parJour.forEach((jour, cumul) -> ventes.add(new VenteJourResponse(jour,
                ReglesStatistiques.arrondir(cumul))));
        return List.copyOf(ventes);
    }

    private List<TopRecolteResponse> versTopRecoltes(List<TopRecolteProjection> projections) {
        return projections.stream()
                .limit(ReglesStatistiques.NOMBRE_TOP)
                .map(ligne -> new TopRecolteResponse(ligne.getRecolteId(), ligne.getNom(),
                        ReglesStatistiques.arrondir(ligne.getQuantiteVendue()), ligne.getUnite(),
                        ReglesStatistiques.arrondir(ligne.getRevenu())))
                .toList();
    }

    private List<StockFaibleResponse> versStockFaible(List<StockFaibleProjection> projections) {
        return projections.stream()
                .map(ligne -> new StockFaibleResponse(ligne.getRecolteId(), ligne.getNom(),
                        ReglesStatistiques.arrondir(ligne.getQuantiteDisponible()), ligne.getUnite(),
                        ligne.getStatut()))
                .toList();
    }
}
