package com.sunurecolte.paiement.entity;

public enum StatutPaiement {
    EN_ATTENTE,
    REUSSI,
    ECHOUE,
    ANNULE,
    /** Remboursement simulé, comme la réussite : aucune transaction réelle n'a eu lieu. */
    REMBOURSE
}
