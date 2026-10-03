-- ----------------------------------------------------------------------------
-- V2 : le paiement peut être remboursé (LOT P1 — règle « paiement avant confirmation »)
--
-- Une annulation solde désormais un paiement REUSSI en REMBOURSE (remboursement
-- simulé, comme la réussite). La contrainte de V1 est donc remplacée, jamais modifiée.
-- ----------------------------------------------------------------------------

ALTER TABLE paiements DROP CONSTRAINT ck_paiements_statut;

ALTER TABLE paiements
    ADD CONSTRAINT ck_paiements_statut
        CHECK (statut IN ('EN_ATTENTE', 'REUSSI', 'ECHOUE', 'ANNULE', 'REMBOURSE'));
