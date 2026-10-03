import { CommandeResponse } from '../modeles/domaine.modeles';
import { StatutCommande } from '../modeles/referentiels';

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
