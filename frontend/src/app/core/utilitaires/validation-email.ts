import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Le `@Email` de Jakarta, comme `Validators.email` d'Angular, accepte un domaine sans point :
 * `awa@exemple` a été enregistré jusqu'en base. Une adresse sans extension de domaine n'est
 * pourtant joignable par personne, donc le contrôle client l'exige avant l'envoi.
 *
 * Le backend reste l'autorité : son contrat et ses validations ne changent pas, ce contrôle est
 * seulement plus strict que lui, jamais plus permissif. Les cas déjà portés par
 * `Validators.email` (aucun `@`, partie locale vide, point final) ne reçoivent ici aucun motif
 * supplémentaire, pour que le message affiché reste le plus proche du problème.
 */
export function domaineEmailComplet(
  controle: AbstractControl,
): ValidationErrors | null {
  const valeur = controle.value;
  if (typeof valeur !== 'string') {
    return null;
  }
  const texte = valeur.trim();
  const arobase = texte.lastIndexOf('@');
  if (arobase === -1) {
    return null;
  }
  return texte.slice(arobase + 1).includes('.') ? null : { domaineIncomplete: true };
}

/** Message porté par les trois formulaires qui saisissent une adresse email. */
export const MESSAGE_DOMAINE_INCOMPLET =
  'Il manque l’extension du domaine, par exemple prenom@exemple.sn.';
