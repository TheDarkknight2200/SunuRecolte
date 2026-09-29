// Affichage des montants, quantités et dates renvoyés par l'API.
// Règles : devise « FCFA » accolée au montant, séparateur de milliers français,
// dates et horodatages recomposés depuis les chaînes du backend sans jamais passer
// par Date (aucun décalage de fuseau), et un signe unique pour une valeur absente.

const DEVISE = 'FCFA';
const VALEUR_ABSENTE = '—';
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function formaterMontant(valeur: number | null): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  return `${NOMBRE.format(valeur)} ${DEVISE}`;
}

export function formaterQuantite(valeur: number | null, unite: string): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  return `${NOMBRE.format(valeur)} ${unite}`;
}

/** Date « AAAA-MM-JJ » → « JJ/MM/AAAA » ; une valeur inattendue est renvoyée telle quelle. */
export function formaterDate(valeur: string | null): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  const [annee, mois, jour] = valeur.split('-');
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : valeur;
}

/**
 * Horodatage ISO « AAAA-MM-JJTHH:MM[:SS[.SSS]] » → « JJ/MM/AAAA à HH:MM ».
 * Les secondes sont retirées, aucun calcul de fuseau n'est effectué : la valeur
 * affichée reste exactement celle envoyée par le backend.
 */
export function formaterDateHeure(valeur: string | null): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  const [date, heure] = valeur.split('T');
  if (!date || !heure) {
    return valeur;
  }
  const [annee, mois, jour] = date.split('-');
  const [heures, minutes] = heure.split(':');
  if (!annee || !mois || !jour || !heures || !minutes) {
    return valeur;
  }
  return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
}
