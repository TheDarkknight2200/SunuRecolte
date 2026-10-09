import {
  formaterDate,
  formaterDateHeure,
  formaterMontant,
  formaterMontantEntier,
  formaterQuantite,
} from './formatage';

/** fr-FR utilise une espace (finie insécable selon les moteurs) comme séparateur de milliers. */
function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

describe('formatage', () => {
  describe('formaterMontant', () => {
    it('affiche le montant avec la devise FCFA et le séparateur de milliers français', () => {
      const affiche = formaterMontant(12500);

      expect(affiche).toMatch(/FCFA$/);
      expect(sansEspace(affiche)).toBe('12500FCFA');
      expect(affiche).toMatch(/\d\D\d/);
    });

    // Les deux espaces comparées sont invisibles à l'œil : le test fige laquelle est rendue, et
    // c'est précisément le défaut que le séparateur écrit à la main vient corriger.
    it('espace les milliers d une insécable U+00A0, jamais d une fine U+202F', () => {
      expect(formaterMontant(151736)).toBe('151 736 FCFA');
      expect(formaterQuantite(151736, 'kg')).toBe('151 736 kg');
      expect(formaterMontant(151736)).not.toContain(' ');
    });

    it('conserve les décimales sans en imposer', () => {
      expect(sansEspace(formaterMontant(1250.5))).toBe('1250,5FCFA');
      expect(sansEspace(formaterMontant(200))).toBe('200FCFA');
    });

    it('rend un signe unique pour un montant nul', () => {
      expect(formaterMontant(null)).toBe('—');
    });
  });

  describe('formaterMontantEntier', () => {
    it('arrondit à l’entier, comme l’exige un écran de synthèse', () => {
      expect(formaterMontantEntier(375885.5)).toBe('375 886 FCFA');
      expect(formaterMontantEntier(22110.91)).toBe('22 111 FCFA');
      expect(formaterMontantEntier(200)).toBe('200 FCFA');
      expect(formaterMontantEntier(null)).toBe('—');
    });
  });

  describe('formaterQuantite', () => {
    it('assortit la quantité de son unité', () => {
      expect(sansEspace(formaterQuantite(500, 'kg'))).toBe('500kg');
      expect(sansEspace(formaterQuantite(1250.25, 'tonne'))).toBe('1250,25tonne');
    });

    it('rend un signe unique pour une quantité nulle', () => {
      expect(formaterQuantite(null, 'kg')).toBe('—');
    });
  });

  describe('formaterDate', () => {
    it('convertit une date ISO en jour/mois/année', () => {
      expect(formaterDate('2026-03-15')).toBe('15/03/2026');
    });

    it('ne décale jamais la date selon le fuseau horaire du poste', () => {
      // Un passage par Date ferait reculer le jour sur un poste à décalage négatif.
      expect(formaterDate('2026-01-01')).toBe('01/01/2026');
      expect(formaterDate('1970-01-01')).toBe('01/01/1970');
      expect(formaterDate('2026-12-31')).toBe('31/12/2026');
    });

    it('rend un signe unique pour une date nulle', () => {
      expect(formaterDate(null)).toBe('—');
    });

    it('renvoie une valeur qui ne suit pas le format attendu plutôt que de l’inventer', () => {
      expect(formaterDate('2026-03')).toBe('2026-03');
    });
  });

  describe('formaterDateHeure', () => {
    it('convertit un horodatage ISO en jour/mois/année et heures minutes', () => {
      expect(formaterDateHeure('2026-09-28T14:03:22')).toBe('28/09/2026 à 14:03');
      expect(formaterDateHeure('2026-01-05T09:07:00')).toBe('05/01/2026 à 09:07');
    });

    it('recompose les secondes fractionnaires sans les afficher', () => {
      expect(formaterDateHeure('2026-09-28T14:03:22.480')).toBe('28/09/2026 à 14:03');
    });

    it('ne décale jamais l’horodatage selon le fuseau horaire du poste', () => {
      // Un passage par Date ferait changer le jour ou l’heure de ces instantanés
      // limites selon le décalage UTC du poste ; les valeurs restent littérales.
      expect(formaterDateHeure('2026-01-01T00:30:00')).toBe('01/01/2026 à 00:30');
      expect(formaterDateHeure('2026-12-31T23:45:00')).toBe('31/12/2026 à 23:45');
      expect(formaterDateHeure('2026-03-15T12:00:00')).toBe('15/03/2026 à 12:00');
    });

    it('rend un signe unique pour un horodatage nul', () => {
      expect(formaterDateHeure(null)).toBe('—');
    });

    it('renvoie une valeur sans heure plutôt que de l’inventer', () => {
      expect(formaterDateHeure('2026-09-28')).toBe('2026-09-28');
      expect(formaterDateHeure('2026-09-28T14')).toBe('2026-09-28T14');
    });
  });
});
