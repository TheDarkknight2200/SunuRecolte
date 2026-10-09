// Affichage des montants, quantités et dates renvoyés par l'API.
// Règles : devise « FCFA » accolée au montant, séparateur de milliers français,
// dates et horodatages recomposés depuis les chaînes du backend sans jamais passer
// par Date (aucun décalage de fuseau), et un signe unique pour une valeur absente.

const DEVISE = 'FCFA';
const VALEUR_ABSENTE = '—';
/** Littérale, donc invisible à l'œil : une espace insécable U+00A0, vérifiée par la spec. */
const ESPACE_INSÉCABLE = ' ';
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const NOMBRE_ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/**
 * L'espace des milliers est écrite à la main. `Intl` la rend en fine insécable (U+202F), une glyphe
 * que la police du projet ne possède pas : sur certains écrans le séparateur ne prend aucun espace
 * et « 151 736 » se lit « 151736 ». L'insécable usuelle (U+00A0) est dans toutes les polices, donc
 * le milliers s'espace de la même façon sur tous les écrans.
 */
function espacer(formateur: Intl.NumberFormat, valeur: number): string {
  return formateur
    .formatToParts(valeur)
    .map((partie) => (partie.type === 'group' ? ESPACE_INSÉCABLE : partie.value))
    .join('');
}

export function formaterMontant(valeur: number | null): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  return `${espacer(NOMBRE, valeur)} ${DEVISE}`;
}

/**
 * Montant en entiers, pour un écran de synthèse. L'arrondi est celui de l'affichage seulement : la
 * valeur du serveur reste exacte et n'est jamais modifiée. Ailleurs, un total peut légitimement
 * porter deux décimales (une quantité fractionnaire multipliée par un prix), donc ce formatte
 * n'est utilisé que là où le decimal n'a plus de sens à lire.
 */
export function formaterMontantEntier(valeur: number | null): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  return `${espacer(NOMBRE_ENTIER, valeur)} ${DEVISE}`;
}

export function formaterQuantite(valeur: number | null, unite: string): string {
  if (valeur === null) {
    return VALEUR_ABSENTE;
  }
  return `${espacer(NOMBRE, valeur)} ${unite}`;
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
