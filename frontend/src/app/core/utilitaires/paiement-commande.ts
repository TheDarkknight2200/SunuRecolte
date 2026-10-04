import { CommandeResponse } from '../modeles/domaine.modeles';
import {
  LIBELLES_MOYEN_PAIEMENT,
  LIBELLES_STATUT_PAIEMENT,
  StatutCommande,
} from '../modeles/referentiels';

/**
 * Reflet de `CommandeService.CIBLES_EXIGEANT_UN_PAIEMENT`
 * (`sunurecolte-backend/.../commande/service/CommandeService.java:93`) : ce sont les seules
 * cibles que la règle « paiement avant confirmation » regarde.
 */
const CIBLES_EXIGEANT_UN_PAIEMENT: readonly StatutCommande[] = ['CONFIRMEE', 'PRETE'];

/**
 * Les deux phrases de `CommandeService.verifierPaiementAvantConfirmation`
 * (`CommandeService.java:349-350`), reprises octet pour octet — l'apostrophe y est droite
 * (`'`) dans la source Java, non typographique : un motif affiché avant l'appel et le message
 * 400 reçu après coup doivent se ressembler exactement, sans quoi l'écran aurait deux
 * vocabulaires pour un même refus.
 */
const MESSAGE_AVANT_CONFIRMATION = "Une commande en livraison doit être payée avant d'être confirmée.";
const MESSAGE_AVANT_MISE_PRETE = "Une commande en livraison doit être payée avant d'être marquée prête.";

/** La règle ne lit que ces deux propriétés ; un appelant passe une `CommandeResponse` complète. */
type ReceptionEtPaiement = Pick<CommandeResponse, 'modeReception' | 'statutPaiement'>;

/** Les deux champs que le serveur rend sur le paiement d'une commande. */
type PaiementRendu = Pick<CommandeResponse, 'statutPaiement' | 'moyenPaiement'>;

/**
 * Source unique, côté frontend, de la règle « une livraison doit être payée avant
 * confirmation ». Elle **anticipe** le refus du serveur sans jamais le remplacer : le
 * `PATCH` reste autorisé ou refusé par `CommandeService`, seul autorité (§19, §35).
 *
 * Comme le backend, seuls deux éléments comptent : le mode de réception et le statut du
 * paiement. Aucun statut de commande n'entre ici — la table des transitions autorisées
 * depuis le statut courant est une règle distincte, déjà reflétée écran par écran.
 */
export function paiementRequisPour(commande: ReceptionEtPaiement, cible: StatutCommande): boolean {
  return (
    CIBLES_EXIGEANT_UN_PAIEMENT.includes(cible) &&
    commande.modeReception === 'LIVRAISON' &&
    commande.statutPaiement !== 'REUSSI'
  );
}

/**
 * Le motif du blocage pour la cible visée : les deux phrases du backend, `null` pour toute
 * autre cible (la règle ne s'applique pas, donc il n'y a rien à expliquer).
 */
export function messageDePaiementRequis(cible: StatutCommande): string | null {
  if (cible === 'CONFIRMEE') {
    return MESSAGE_AVANT_CONFIRMATION;
  }
  if (cible === 'PRETE') {
    return MESSAGE_AVANT_MISE_PRETE;
  }
  return null;
}

/**
 * Source unique du mot affiché sur le paiement d'une commande, pour les deux espaces :
 * la liste et le détail de l'acheteur, les commandes reçues du producteur. Rien n'est
 * déduit ici — seul `null` (aucun paiement enregistré) devient le constat « Aucun paiement » ;
 * tout autre statut reprend le libellé du serveur, précédé du moyen quand il est rendu.
 *
 * La nullabilité de `moyenPaiement` est traitée, pas assumée : un statut sans moyen s'affiche
 * seul, sans séparateur orphelin ni « undefined » dans la phrase.
 */
export function libellePaiement(commande: PaiementRendu): string {
  if (commande.statutPaiement === null) {
    return 'Aucun paiement';
  }
  const statut = LIBELLES_STATUT_PAIEMENT[commande.statutPaiement];
  return commande.moyenPaiement === null
    ? statut
    : `${LIBELLES_MOYEN_PAIEMENT[commande.moyenPaiement]} — ${statut}`;
}
