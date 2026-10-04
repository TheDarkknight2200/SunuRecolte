package com.sunurecolte.security;

import com.sunurecolte.exception.TropDeTentativesException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Compteur de tentatives de connexion, en mémoire.
 *
 * <p>Règle : cinq tentatives sans succès pour un même couple (email normalisé, adresse du client)
 * dans une fenêtre de quinze minutes ouvrent un blocage de quinze minutes sur ce couple, et la
 * tentative suivante est refusée par un 429 — même avec le bon mot de passe. Le comptage est la
 * partie sensible : il porte sur la <em>tentative</em> et il est atomique, donc une rafale de dix
 * requêtes simultanées ne peut pas laisser passer six essais (vérifier l'état, puis le mettre à
 * jour après coup compterait dix échecs pour cinq places).
 *
 * <p>Le contrôle passe <strong>avant</strong> toute comparaison de mot de passe, et un email inconnu
 * est compté exactement comme un email connu avec un mauvais mot de passe : si le blocage ne
 * frappait que les comptes existants, il deviendrait lui-même un moyen de savoir quels emails sont
 * inscrits.
 *
 * <p>Une connexion réussie efface l'historique du couple. Inversement, une tentative qui n'aboutit
 * pas à un jeton reste comptée, y compris si le serveur tombe en panne en cours de route : ce choix
 * évite qu'un droit réservé ne se libère jamais, ce qui bloquerait durablement un compte légitime.
 *
 * <p>Choix assumés et leurs conséquences :
 * <ul>
 *   <li>le compteur vit dans cette instance du serveur : plusieurs instances derrière un même
 *       équilibreur comptent chacune de leur côté, et un redémarrage remet tout à zéro ;</li>
 *   <li>l'adresse du client est celle vue par le serveur. Derrière un proxy inverse, sans résolution
 *       d'en-têtes de confiance (par exemple {@code server.forward-headers-strategy=FRAMEWORK} avec un
 *       proxy déclaré), toutes les requêtes arrivent avec l'adresse du proxy, et le blocage frapperait
 *       tout le monde à la fois. Aucune confiance n'est accordée à {@code X-Forwarded-For}, qu'un
 *       client peut forger pour échapper à sa propre limite ;</li>
 *   <li>un blocage en cours n'est jamais prolongé par les tentatives qui continuent d'arriver ;</li>
 *   <li>aucune tâche planifiée : les entrées périmées sont purgées à chaque demande, ce qui borne la
 *       taille du magasin au trafic réellement reçu sur une fenêtre.</li>
 * </ul>
 *
 * <p>L'horloge est injectée pour que la durée des fenêtres soit vérifiable par des tests sans dormir.
 */
@Component
public class LimiteTentativesConnexion {

    /** Nombre de tentatives sans succès tolérées dans la fenêtre. */
    static final int SEUIL_TENTATIVES = 5;

    /** Fenêtre de comptage. */
    static final Duration FENETRE_DE_COMPTAGE = Duration.ofMinutes(15);

    /** Durée du blocage déclenché par le dépassement du seuil. */
    static final Duration DUREE_BLOCAGE = Duration.ofMinutes(15);

    private final ConcurrentMap<String, Etat> etats = new ConcurrentHashMap<>();
    private final Clock horloge;

    public LimiteTentativesConnexion(Clock horloge) {
        this.horloge = horloge;
    }

    /**
     * Compte une tentative pour ce couple et l'autorise tant que le seuil n'est pas dépassé.
     * À appeler avant toute vérification du mot de passe.
     *
     * <p>Le refus se décide sur l'état précédent, à l'intérieur de la même mise à jour atomique :
     * la tentative qui atteint le seuil est encore acceptée (elle répondra 401) mais arme le blocage,
     * et c'est la suivante qui est refusée. Lire la décision sur l'état mis à jour refusrait donc la
     * cinquième tentative au lieu de la sixième.
     *
     * @param emailNormalise email trimé et mis en minuscules, tel que la connexion le pratique
     * @param adresseClient  adresse vue par le serveur pour cette requête
     * @throws TropDeTentativesException si le couple est bloqué
     */
    public void autoriserTentative(String emailNormalise, String adresseClient) {
        Instant maintenant = horloge.instant();
        purger(maintenant);

        AtomicReference<Instant> finDuBlocageSubi = new AtomicReference<>();
        etats.compute(cle(emailNormalise, adresseClient), (ignore, existant) -> {
            Etat precedent = existant == null ? Etat.vierge(maintenant) : existant;
            if (precedent.estBloquee(maintenant)) {
                finDuBlocageSubi.set(precedent.bloqueJusqua());
                return precedent;
            }
            return precedent.avecTentative(maintenant);
        });

        Instant subie = finDuBlocageSubi.get();
        if (subie != null) {
            long restantes = Duration.between(maintenant, subie).getSeconds();
            throw new TropDeTentativesException(Math.max(1, restantes));
        }
    }

    /** Une connexion réussie efface l'historique du couple. */
    public void reinitialiserApresSucces(String emailNormalise, String adresseClient) {
        etats.remove(cle(emailNormalise, adresseClient));
    }

    private void purger(Instant maintenant) {
        etats.entrySet().removeIf(entree -> entree.getValue().estPerime(maintenant));
    }

    private static String cle(String emailNormalise, String adresseClient) {
        return emailNormalise + '|' + adresseClient;
    }

    /**
     * État immuable d'un couple : tentatives comptées dans la fenêtre courante, instant d'ouverture
     * de cette fenêtre, et fin du blocage éventuel.
     */
    private record Etat(int tentatives, Instant debutFenetre, Instant bloqueJusqua) {

        static Etat vierge(Instant maintenant) {
            return new Etat(0, maintenant, null);
        }

        Etat avecTentative(Instant maintenant) {
            if (!maintenant.isBefore(debutFenetre.plus(FENETRE_DE_COMPTAGE))) {
                // Fenêtre écoulée : rien n'a été retenu, on repart de zéro ailleurs et maintenant.
                return new Etat(1, maintenant, null);
            }
            int nouvellesTentatives = tentatives + 1;
            // Le seuil atteint, le blocage court dès cet instant : la tentative en cours répond
            // encore 401, les suivantes sont refusées jusqu'à la fin du blocage.
            Instant finBlocage = nouvellesTentatives >= SEUIL_TENTATIVES
                    ? maintenant.plus(DUREE_BLOCAGE)
                    : null;
            return new Etat(nouvellesTentatives, debutFenetre, finBlocage);
        }

        boolean estBloquee(Instant maintenant) {
            return bloqueJusqua != null && maintenant.isBefore(bloqueJusqua);
        }

        /** Ni blocage en cours, ni tentative dans la fenêtre courante : l'entrée ne sert plus à rien. */
        boolean estPerime(Instant maintenant) {
            return !estBloquee(maintenant) && !maintenant.isBefore(debutFenetre.plus(FENETRE_DE_COMPTAGE));
        }
    }
}
