import { FormControl, Validators } from '@angular/forms';
import { MESSAGE_DOMAINE_INCOMPLET, domaineEmailComplet } from './validation-email';

describe('domaineEmailComplet', () => {
  function controle(valeur: string): FormControl {
    return new FormControl(valeur);
  }

  it('refuse un domaine sans extension, que le backend @Email accepte', () => {
    // Constat réel de la QA 5.8-bis : `mariama@exemple` était passé jusqu'en base (HTTP 200).
    expect(domaineEmailComplet(controle('awa@exemple'))).toEqual({ domaineIncomplete: true });
    expect(domaineEmailComplet(controle('awa.diallo@localhost'))).toEqual({
      domaineIncomplete: true,
    });
  });

  it('accepte une adresse complète, avec ou sans sous-domaine', () => {
    expect(domaineEmailComplet(controle('awa.diop@exemple.sn'))).toBeNull();
    expect(domaineEmailComplet(controle('awa.diop@marche.dakar.sn'))).toBeNull();
  });

  it('ignore une saisie vide : la règle « obligatoire » porte ce cas', () => {
    expect(domaineEmailComplet(controle(''))).toBeNull();
    expect(domaineEmailComplet(controle('   '))).toBeNull();
  });

  it('laisse à Validators.email les formes sans arobase, pour un seul message à la fois', () => {
    const sansArobase = controle('awa.diop.example.sn');
    expect(domaineEmailComplet(sansArobase)).toBeNull();
    expect(Validators.email(sansArobase)).not.toBeNull();
  });

  it.each([
    'awa@exemple',
    'awa@exemple.',
    '@exemple.sn',
    'awa..diop@exemple.sn',
    'awa diop@exemple.sn',
    'awa@ex ample.sn',
    'awa@',
    'pas-une-adresse',
  ])('refuse %s : le client n’est jamais plus permissif que le backend', (valeur) => {
    const cible = controle(valeur);
    const refuseParLeClient =
      Validators.email(cible) !== null || domaineEmailComplet(cible) !== null;
    expect(refuseParLeClient).toBe(true);
  });

  it('nomme le manque d’extension en français, avec un exemple à recopier', () => {
    expect(MESSAGE_DOMAINE_INCOMPLET).toBe(
      'Il manque l’extension du domaine, par exemple prenom@exemple.sn.',
    );
  });
});
