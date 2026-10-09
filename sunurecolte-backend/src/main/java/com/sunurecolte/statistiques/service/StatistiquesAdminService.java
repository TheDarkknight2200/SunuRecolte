package com.sunurecolte.statistiques.service;

import com.sunurecolte.commande.entity.StatutCommande;
import com.sunurecolte.paiement.entity.StatutPaiement;
import com.sunurecolte.recolte.entity.StatutRecolte;
import com.sunurecolte.security.ControleAcces;
import com.sunurecolte.security.UtilisateurPrincipal;
import com.sunurecolte.statistiques.dto.InscriptionSemaineResponse;
import com.sunurecolte.statistiques.dto.MoyenPaiementNombreResponse;
import com.sunurecolte.statistiques.dto.NomNombreResponse;
import com.sunurecolte.statistiques.dto.StatistiquesAdminResponse;
import com.sunurecolte.statistiques.dto.TopProducteurResponse;
import com.sunurecolte.statistiques.dto.TopRecolteResponse;
import com.sunurecolte.statistiques.projection.EffectifRoleProjection;
import com.sunurecolte.statistiques.projection.FiliereNombreProjection;
import com.sunurecolte.statistiques.projection.InscriptionProjection;
import com.sunurecolte.statistiques.projection.MoyenPaiementNombreProjection;
import com.sunurecolte.statistiques.projection.TopProducteurProjection;
import com.sunurecolte.statistiques.projection.TopRecolteProjection;
import com.sunurecolte.statistiques.projection.ZoneNombreProjection;
import com.sunurecolte.statistiques.repository.StatistiquesAdminLectureRepository;
import com.sunurecolte.user.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Tableau de bord statistiques de la plateforme, réservé à l'administration (lot STAT-2).
 *
 * <p>Règles de calcul, dans l'ordre où elles s'appliquent :
 * <ol>
 *   <li><b>Période et sommes</b> — {@link ReglesStatistiques}, littéralement la règle de STAT-1 :
 *       mêmes bornes civiles, mêmes statuts retenus, même arrondi. Le volume d'affaires est la somme
 *       des {@code sous_total} des lignes de commande, <b>jamais</b> {@code commandes.total} ;
 *   <li><b>Comptes</b> — une seule agrégation par rôle : {@code utilisateursTotal} est déclaré comme
 *       {@code producteurs + acheteurs}, le rôle ADMIN en est <b>exclu</b> pour que la somme affichée
 *       corresponde au total affiché. Un administrateur vient de l'amorçage local, jamais d'une
 *       inscription publique ;
 *   <li><b>Commandes de la période</b> — commandes distinctes créées entre les bornes, tous statuts
 *       confondus (annulées comprises) : ce que l'administration voit passer, et le pendant de la
 *       colonne « volume » qui, elle, exclut les annulées ;
 *   <li><b>Récoltes actives</b> — récoltes au statut DISPONIBLE à l'instant de la requête. La période
 *       ne s'y applique pas : c'est un état du catalogue, pas un historique ;
 *   <li><b>Inscriptions par semaine</b> — une entrée par semaine civile (lundi → dimanche) touchant la
 *       période, sans trou, zéros compris ; la dernière semaine peut être partielle. Une seule requête
 *       rend les comptes de la période, la mise en semaines se fait ici ;
 *   <li><b>Filières</b> — les {@code Filiere} réellement portées par un producteur, dans l'ordre des
 *       effectifs décroissants. L'enum en compte quatre ({@code MARAICHAGE, ELEVAGE, CEREALES, AUTRE}) :
 *       aucune n'est imposée ni écartée, et une filière absente de la base n'apparaît pas ;
 *   <li><b>Zones</b> — {@code producteurs.localisation_exploitation} est un <b>texte libre</b>, pas un
 *       référentiel de localités : deux grafies d'une même ville sont deux saisies distinctes en base.
 *       Elles sont rapprochées ici par {@link ReglesStatistiques#normaliser(String)} (trim, espaces
 *       réduits, insensible à la casse et aux accents), la forme affichée étant la saisie la plus
 *       fréquente derrière la normalisation. Les valeurs nulles ou vides sont omises, le classement est
 *       plafonné à {@link #NOMBRE_ZONES_MAX} zones et le reste est regroupé sous
 *       {@link #LIBELLE_AUTRES_ZONES} ;
 *   <li><b>Tops</b> — 5 maximum chacun, revenu ou volume décroissant puis identifiant croissant.
 *       Le top producteurs n'expose que l'identifiant, le prénom et le nom : ni adresse électronique,
 *       ni téléphone, ni mot de passe ;
 *   <li><b>Moyens de paiement</b> — paiements rattachés à une commande de la période, tous statuts de
 *       paiement, groupés par {@code MoyenPaiement}. L'enum ne compte que {@code WAVE} et
 *       {@code ORANGE_MONEY} : il n'existe <b>aucun</b> « autre » moyen en base, et la liste ne l'invente
 *       pas. {@code nombreRembourses} compte les paiements {@code REMBOURSE} du même périmètre — des
 *       remboursements simulés, comme les paiements ;
 *   <li><b>Accès</b> — le rôle ADMIN est relu sur l'identité authentifiée par
 *       {@link ControleAcces#exigerAdmin(UtilisateurPrincipal)} en plus de {@code SecurityConfig} ;
 *       rien n'est accepté du client sauf le libellé de période.
 * </ol>
 *
 * <p>Une commande mélangeant les récoltes de deux producteurs contribue une seule fois au volume
 * global, pour la somme des lignes retenues : le {@code total} de cette commande n'est jamais lu.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatistiquesAdminService {

    /** Zones distinctes exposées avant regroupement, la période n'y change rien. */
    static final int NOMBRE_ZONES_MAX = 8;

    /** Libellé du regroupement de ce qui dépasse {@link #NOMBRE_ZONES_MAX}. */
    static final String LIBELLE_AUTRES_ZONES = "Autres zones";

    /** Rôles ouverts à l'inscription publique, donc seuls comptés comme inscriptions. */
    private static final Set<Role> ROLES_INSCRITS = EnumSet.of(Role.PRODUCTEUR, Role.ACHETEUR);

    private final StatistiquesAdminLectureRepository lectures;

    /**
     * Statistiques de la plateforme sur la période demandée.
     *
     * @param periode   {@code 7j}, {@code 30j} ou {@code mois} ; null ou absent → {@code 30j}
     * @param principal identité authentifiée — doit porter le rôle ADMIN (403 sinon)
     */
    public StatistiquesAdminResponse statistiques(String periode, UtilisateurPrincipal principal) {
        ControleAcces.exigerAdmin(principal);
        ReglesStatistiques.Bornes bornes = ReglesStatistiques.bornes(periode);
        LocalDateTime debut = bornes.debutInstant();
        LocalDateTime fin = bornes.finInstant();
        Set<StatutCommande> statutsRetenus = ReglesStatistiques.STATUTS_RETENUS;

        Map<Role, Long> effectifs = new EnumMap<>(Role.class);
        for (EffectifRoleProjection ligne : lectures.effectifsParRole()) {
            effectifs.put(ligne.getRole(), ligne.getNombre());
        }
        long producteurs = effectifs.getOrDefault(Role.PRODUCTEUR, 0L);
        long acheteurs = effectifs.getOrDefault(Role.ACHETEUR, 0L);

        return new StatistiquesAdminResponse(
                producteurs + acheteurs,
                producteurs,
                acheteurs,
                lectures.nombreRecoltesActives(StatutRecolte.DISPONIBLE),
                lectures.nombreCommandesPeriode(debut, fin),
                ReglesStatistiques.arrondir(lectures.volumeAffaires(statutsRetenus, debut, fin)),
                versInscriptionsParSemaine(lectures.inscriptions(ROLES_INSCRITS, debut, fin), bornes),
                versFiliere(lectures.repartitionParFiliere()),
                versZone(lectures.repartitionParZoneSaisie()),
                versTopProducteurs(lectures.topProducteurs(statutsRetenus, debut, fin)),
                versTopRecoltes(lectures.topRecoltes(statutsRetenus, debut, fin)),
                versMoyensPaiement(lectures.repartitionParMoyenPaiement(debut, fin)),
                lectures.nombrePaiementsRembourses(StatutPaiement.REMBOURSE, debut, fin));
    }

    /**
     * Une entrée par semaine civile de la période, lundi en tête. Les deux compteurs ne somment pas
     * le rôle ADMIN : un administrateur n'est pas une inscription.
     */
    private List<InscriptionSemaineResponse> versInscriptionsParSemaine(List<InscriptionProjection> comptes,
                                                                       ReglesStatistiques.Bornes bornes) {
        LocalDate premierLundi = ReglesStatistiques.lundiDeLaSemaine(bornes.debut());
        LocalDate dernierLundi = ReglesStatistiques.lundiDeLaSemaine(bornes.fin());
        Map<LocalDate, long[]> parSemaine = new TreeMap<>();
        for (LocalDate lundi = premierLundi; !lundi.isAfter(dernierLundi); lundi = lundi.plusDays(7)) {
            parSemaine.put(lundi, new long[2]);
        }
        for (InscriptionProjection compte : comptes) {
            LocalDate lundi = ReglesStatistiques.lundiDeLaSemaine(compte.getDateCreation().toLocalDate());
            long[] compteurs = parSemaine.get(lundi);
            if (compteurs != null) {
                // [0] producteurs, [1] acheteurs — les deux seuls rôles demandés à la requête.
                compteurs[compte.getRole() == Role.PRODUCTEUR ? 0 : 1]++;
            }
        }
        List<InscriptionSemaineResponse> semaines = new ArrayList<>(parSemaine.size());
        parSemaine.forEach((lundi, compteurs) ->
                semaines.add(new InscriptionSemaineResponse(lundi, compteurs[0], compteurs[1])));
        return List.copyOf(semaines);
    }

    private List<NomNombreResponse> versFiliere(List<FiliereNombreProjection> projections) {
        return projections.stream()
                .map(ligne -> new NomNombreResponse(ligne.getFiliere().name(), ligne.getNombre()))
                .toList();
    }

    /**
     * Regroupement des localisations saisies. La requête est déjà triée par effectif décroissant puis
     * saisie croissante : la première saisie rencontrée pour une clé normalisée en est donc la forme la
     * plus fréquente, et c'est elle qui s'affiche.
     */
    private List<NomNombreResponse> versZone(List<ZoneNombreProjection> saisies) {
        Map<String, String> formes = new LinkedHashMap<>();
        Map<String, Long> effectifs = new LinkedHashMap<>();
        for (ZoneNombreProjection saisie : saisies) {
            String brute = saisie.getZone();
            if (brute == null || brute.isBlank()) {
                continue;
            }
            String cle = ReglesStatistiques.normaliser(brute);
            if (cle.isEmpty()) {
                continue;
            }
            formes.putIfAbsent(cle, brute.trim());
            effectifs.merge(cle, saisie.getNombre(), Long::sum);
        }

        List<Map.Entry<String, Long>> classees = new ArrayList<>(effectifs.entrySet());
        classees.sort(Map.Entry.<String, Long>comparingByValue().reversed()
                .thenComparing(Map.Entry.comparingByKey()));

        List<NomNombreResponse> zones = new ArrayList<>(Math.min(classees.size(), NOMBRE_ZONES_MAX + 1));
        long horsClassement = 0L;
        for (int rang = 0; rang < classees.size(); rang++) {
            if (rang < NOMBRE_ZONES_MAX) {
                zones.add(new NomNombreResponse(formes.get(classees.get(rang).getKey()),
                        classees.get(rang).getValue()));
            } else {
                horsClassement += classees.get(rang).getValue();
            }
        }
        if (horsClassement > 0) {
            zones.add(new NomNombreResponse(LIBELLE_AUTRES_ZONES, horsClassement));
        }
        return List.copyOf(zones);
    }

    private List<TopProducteurResponse> versTopProducteurs(List<TopProducteurProjection> projections) {
        return projections.stream()
                .limit(ReglesStatistiques.NOMBRE_TOP)
                .map(ligne -> new TopProducteurResponse(ligne.getProducteurId(),
                        ligne.getPrenom() + " " + ligne.getNom(),
                        ReglesStatistiques.arrondir(ligne.getChiffreAffaires()),
                        ligne.getNombreCommandes()))
                .toList();
    }

    private List<TopRecolteResponse> versTopRecoltes(List<TopRecolteProjection> projections) {
        return projections.stream()
                .limit(ReglesStatistiques.NOMBRE_TOP)
                .map(ligne -> new TopRecolteResponse(ligne.getRecolteId(), ligne.getNom(),
                        ReglesStatistiques.arrondir(ligne.getQuantiteVendue()), ligne.getUnite(),
                        ReglesStatistiques.arrondir(ligne.getRevenu())))
                .toList();
    }

    private List<MoyenPaiementNombreResponse> versMoyensPaiement(List<MoyenPaiementNombreProjection> projections) {
        return projections.stream()
                .map(ligne -> new MoyenPaiementNombreResponse(ligne.getMoyen(), ligne.getNombre(),
                        ReglesStatistiques.arrondir(ligne.getMontant())))
                .toList();
    }
}
