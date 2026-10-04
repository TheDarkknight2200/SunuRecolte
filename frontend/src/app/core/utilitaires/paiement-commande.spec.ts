import {
  ModeReception,
  MOYENS_PAIEMENT,
  MoyenPaiement,
  STATUTS_PAIEMENT,
  StatutPaiement,
} from '../modeles/referentiels';
import {
  libellePaiement,
  messageDePaiementRequis,
  paiementRequisPour,
} from './paiement-commande';

/**
 * Les deux phrases reprises octet pour octet à
 * `CommandeService.verifierPaiementAvantConfirmation`
 * (`sunurecolte-backend/.../commande/service/CommandeService.java:349-350`), apostrophe droite
 * comme dans la source Java : l'interface doit dire la même chose que le serveur.
 */
const MESSAGE_CONFIRMEE = "Une commande en livraison doit être payée avant d'être confirmée.";
const MESSAGE_PRETE = "Une commande en livraison doit être payée avant d'être marquée prête.";

/** L'utilitaire ne lit que ces deux propriétés : rien d'autre n'entre dans la règle. */
function commande(
  modeReception: ModeReception,
  statutPaiement: StatutPaiement | null,
): { modeReception: ModeReception; statutPaiement: StatutPaiement | null } {
  return { modeReception, statutPaiement };
}

describe('paiementRequisPour — règle « livraison = paiement avant confirmation »', () => {
  it.each(['CONFIRMEE', 'PRETE'] as const)(
    'en livraison sans aucun paiement, %s est bloquée',
    (cible) => {
      expect(paiementRequisPour(commande('LIVRAISON', null), cible)).toBe(true);
    },
  );

  it.each(['EN_ATTENTE', 'ECHOUE', 'ANNULE', 'REMBOURSE'] as const)(
    'un paiement %s ne débloque ni CONFIRMEE ni PRETE en livraison',
    (statut) => {
      expect(paiementRequisPour(commande('LIVRAISON', statut), 'CONFIRMEE')).toBe(true);
      expect(paiementRequisPour(commande('LIVRAISON', statut), 'PRETE')).toBe(true);
    },
  );

  it('un paiement REUSSI débloque les deux cibles', () => {
    expect(paiementRequisPour(commande('LIVRAISON', 'REUSSI'), 'CONFIRMEE')).toBe(false);
    expect(paiementRequisPour(commande('LIVRAISON', 'REUSSI'), 'PRETE')).toBe(false);
  });

  it.each(['CONFIRMEE', 'PRETE'] as const)(
    'en retrait, %s n’est jamais bloquée, même sans paiement',
    (cible) => {
      expect(paiementRequisPour(commande('RETRAIT', null), cible)).toBe(false);
      expect(paiementRequisPour(commande('RETRAIT', 'EN_ATTENTE'), cible)).toBe(false);
    },
  );

  it.each(['EN_ATTENTE', 'LIVREE', 'ANNULEE'] as const)(
    '%s n’est pas une cible exigeant un paiement : la règle ne s’y applique pas',
    (cible) => {
      expect(paiementRequisPour(commande('LIVRAISON', null), cible)).toBe(false);
    },
  );

  it('ne dépend d’aucun statut de commande : seule la cible, la réception et le paiement comptent', () => {
    // Le statut courant de la commande n'entre pas dans la règle ; c'est le backend qui
    // décide des transitions autorisées depuis ce statut (CommandeService.TRANSITIONS_AUTORISEES).
    expect(paiementRequisPour(commande('LIVRAISON', null), 'PRETE')).toBe(true);
    expect(paiementRequisPour(commande('LIVRAISON', 'REUSSI'), 'PRETE')).toBe(false);
  });
});

describe('messageDePaiementRequis — les phrases du serveur', () => {
  it('CONFIRMEE rend le message du backend pour la confirmation', () => {
    expect(messageDePaiementRequis('CONFIRMEE')).toBe(MESSAGE_CONFIRMEE);
  });

  it('PRETE rend le message du backend pour la mise à prête', () => {
    expect(messageDePaiementRequis('PRETE')).toBe(MESSAGE_PRETE);
  });

  it.each(['EN_ATTENTE', 'LIVREE', 'ANNULEE'] as const)(
    '%s ne fait pas partie de la règle : aucun message de paiement',
    (cible) => {
      expect(messageDePaiementRequis(cible)).toBeNull();
    },
  );

  it('les deux phrases sont distinctes : chacune nomme l’étape refusée', () => {
    expect(messageDePaiementRequis('CONFIRMEE')).not.toBe(messageDePaiementRequis('PRETE'));
  });

  it('une phrase attendue nomme la livraison, le paiement et l’étape', () => {
    const message = messageDePaiementRequis('CONFIRMEE') ?? '';
    expect(message).toContain('livraison');
    expect(message).toContain('payée');
    expect(message).toContain('confirmée');
  });
});

/** Le libellé ne lit que ces deux propriétés, comme la règle lit les siennes. */
function paiement(
  statutPaiement: StatutPaiement | null,
  moyenPaiement: MoyenPaiement | null = null,
): { statutPaiement: StatutPaiement | null; moyenPaiement: MoyenPaiement | null } {
  return { statutPaiement, moyenPaiement };
}

describe('libellePaiement — une seule source pour le mot affiché', () => {
  it('rend le constat du serveur quand aucun paiement n’a été enregistré', () => {
    expect(libellePaiement(paiement(null))).toBe('Aucun paiement');
  });

  it('nomme le moyen puis le statut, dans cet ordre', () => {
    expect(libellePaiement(paiement('REUSSI', 'ORANGE_MONEY'))).toBe('Orange Money — Réussi');
  });

  it('rend « Wave — Remboursé (simulé) » sur un remboursement, qualification comprise', () => {
    expect(libellePaiement(paiement('REMBOURSE', 'WAVE'))).toBe('Wave — Remboursé (simulé)');
  });

  it('rend le statut seul quand le moyen est absent, sans séparateur orphelin', () => {
    expect(libellePaiement(paiement('ANNULE'))).toBe('Annulé');
  });

  it.each(STATUTS_PAIEMENT)('%s : aucun couple existant ne rend undefined ni vide', (statut) => {
    for (const moyen of [...MOYENS_PAIEMENT, null]) {
      const rendu = libellePaiement(paiement(statut, moyen));
      expect(rendu).not.toContain('undefined');
      expect(rendu).not.toContain('null');
      expect(rendu).not.toBe('');
    }
  });
});
