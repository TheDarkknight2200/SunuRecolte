import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { StatistiquesAdminResponse } from '../../../core/modeles/domaine.modeles';
import { ToastService } from '../../../core/services/toast.service';
import { Barres } from '../../../partage/graphiques/barres';
import { StatistiquesAdmin } from './statistiques-admin';

const URL = 'http://localhost:8080/api/admin/statistiques';

const ERREUR = {
  corps: { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
  reponse: { status: 500, statusText: 'Internal Server Error' },
};

function donnees(surcharge: Partial<StatistiquesAdminResponse> = {}): StatistiquesAdminResponse {
  return {
    utilisateursTotal: 7,
    producteurs: 3,
    acheteurs: 4,
    recoltesActives: 5,
    commandesPeriode: 6,
    volumeAffaires: 18500,
    inscriptionsParSemaine: [
      { semaineDebut: '2026-09-28', producteurs: 1, acheteurs: 2 },
      { semaineDebut: '2026-10-05', producteurs: 2, acheteurs: 0 },
      { semaineDebut: '2026-10-12', producteurs: 0, acheteurs: 0 },
    ],
    repartitionParFiliere: [
      { nom: 'MARAICHAGE', nombre: 2 },
      { nom: 'ELEVAGE', nombre: 1 },
    ],
    repartitionParZone: [
      { nom: 'Thiès', nombre: 2 },
      { nom: 'Autres zones', nombre: 1 },
    ],
    topProducteurs: [
      { producteurId: 4, nom: 'Awa Diop', chiffreAffaires: 12000, nombreCommandes: 3 },
      { producteurId: 9, nom: 'Moussa Ndiaye', chiffreAffaires: 6500, nombreCommandes: 1 },
    ],
    topRecoltes: [
      { recolteId: 12, nom: 'Tomate', quantiteVendue: 233.5, unite: 'kg', revenu: 12000 },
      { recolteId: 14, nom: 'Oignon', quantiteVendue: 13, unite: 'sac', revenu: 6500 },
    ],
    repartitionParMoyenPaiement: [
      { moyen: 'WAVE', nombre: 4, montant: 12000 },
      { moyen: 'ORANGE_MONEY', nombre: 1, montant: 6500 },
    ],
    nombreRembourses: 1,
    ...surcharge,
  };
}

describe('StatistiquesAdmin (écran administration)', () => {
  let fixture: ComponentFixture<StatistiquesAdmin>;
  let http: HttpTestingController;
  let toast: ToastService;

  function racine(): HTMLElement {
    return fixture.nativeElement;
  }

  function element<T extends HTMLElement>(selecteur: string): T {
    const trouve = racine().querySelector<T>(selecteur);
    if (!trouve) {
      throw new Error(`Élément introuvable : ${selecteur}`);
    }
    return trouve;
  }

  function texte(selecteur: string): string {
    return (element(selecteur).textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Le séparateur de milliers français est une espace insécable : on le retire avant de comparer. */
  function sansEspace(valeur: string): string {
    return valeur.replace(/\s/g, '');
  }

  /** La lecture émise au montage, ni rendue ni rejetée. */
  function enCours(): ReturnType<HttpTestingController['expectOne']> {
    return http.expectOne((req) => req.url === URL && req.method === 'GET');
  }

  /** Mène la lecture en cours à son terme : l'écran passe de « Chargement… » aux chiffres. */
  function ouvrir(reponse: StatistiquesAdminResponse = donnees()): void {
    enCours().flush(reponse);
    fixture.detectChanges();
  }

  function pastilles(): HTMLButtonElement[] {
    return [...racine().querySelectorAll<HTMLButtonElement>('#periodes [data-valeur]')];
  }

  function cartes(): HTMLElement[] {
    return [...racine().querySelectorAll<HTMLElement>('.statistiques-admin__carte')];
  }

  /**
   * Ligne « libellé, puis effectif » d'une répartition. Le compilateur de templates retire les
   * blancs entre éléments : `textContent` vaudrait « Maraîchage2 », les deux spans se lisent
   * donc séparément.
   */
  function paires(bloc: Element): [string, string][] {
    return [...bloc.querySelectorAll('.statistiques-admin__ligne')].map((ligne) => [
      (ligne.querySelector('span')?.textContent ?? '').trim(),
      (ligne.querySelector('.statistiques-admin__nombre')?.textContent ?? '').trim(),
    ]);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatistiquesAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([], withDisabledInitialNavigation()),
      ],
    });
    fixture = TestBed.createComponent(StatistiquesAdmin);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
  });

  it('monte sur l’état de chargement, sans rien inventer en attendant la réponse', () => {
    expect(element('#statistiques-admin-chargement').getAttribute('aria-busy')).toBe('true');
    expect(texte('#statistiques-admin-annonce')).toBe('');
    expect(racine().querySelector('.statistiques-admin__cartes')).toBeNull();
    ouvrir();
  });

  it('relit la période par défaut du backend, et jamais un identifiant ni un filtre de compte', () => {
    const requete = enCours();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.get('periode')).toBe('30j');
    expect(requete.request.params.keys()).toEqual(['periode']);
    requete.flush(donnees());
    fixture.detectChanges();
  });

  it('rend six cartes, dont le volume d’affaires en mesure dominante', () => {
    ouvrir();

    expect(
      cartes().map((carte) =>
        (carte.querySelector('.statistiques-admin__legende')?.textContent ?? '').trim(),
      ),
    ).toEqual([
      'Volume d’affaires',
      'Commandes',
      'Comptes',
      'Producteurs',
      'Acheteurs',
      'Récoltes disponibles',
    ]);
    expect(
      cartes().map((carte) =>
        (carte.querySelector('.statistiques-admin__precision')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    ).toEqual([
      'Hors commandes annulées.',
      'Commandes annulées comprises.',
      'Producteurs et acheteurs, hors administrateurs.',
      'Répartis par filière et par zone ci-dessous.',
      'Comptes ouverts par l’inscription publique.',
      'État du catalogue à l’instant de la requête, la période ne s’y applique pas.',
    ]);
    expect(
      cartes().filter((carte) => carte.querySelector('.statistiques-admin__valeur--dominant')),
    ).toHaveLength(1);
    expect(sansEspace(texte('.statistiques-admin__valeur--dominant'))).toBe('18500FCFA');
    expect(cartes()[2]?.querySelector('.statistiques-admin__valeur')?.textContent.trim()).toBe('7');
    expect(cartes()[3]?.querySelector('.statistiques-admin__valeur')?.textContent.trim()).toBe('3');
    expect(cartes()[4]?.querySelector('.statistiques-admin__valeur')?.textContent.trim()).toBe('4');
    expect(cartes()[5]?.querySelector('.statistiques-admin__valeur')?.textContent.trim()).toBe('5');
  });

  it('la somme des deux cartes de comptes égale la carte « Comptes » : l’ADMIN n’est nulle part', () => {
    ouvrir();
    const valeurs = cartes().map((carte) =>
      Number((carte.querySelector('.statistiques-admin__valeur')?.textContent ?? '').trim()),
    );

    expect(valeurs[2]).toBe(valeurs[3] + valeurs[4]);
  });

  it('rend les trois graphiques demandés : colonnes par semaine, barres horizontales par producteur et par récolte', () => {
    ouvrir();
    const graphiques = fixture.debugElement
      .queryAll(By.directive(Barres))
      .map((noeud) => noeud.componentInstance);

    expect(graphiques).toHaveLength(3);
    expect(graphiques.map((graphique) => graphique.orientation())).toEqual([
      'verticale',
      'horizontale',
      'horizontale',
    ]);
    // Seules les colonnes portent un repère : les barres horizontales affichent leur montant en ligne.
    expect(graphiques[0]?.etiquetteMaximum()).toBe('Maximum de comptes sur une semaine');
    expect(graphiques[1]?.etiquetteMaximum()).toBeNull();
    expect(graphiques[2]?.etiquetteMaximum()).toBeNull();
    expect(
      [...racine().querySelectorAll('.graphique-barres__alternative thead th')].map((entete) =>
        (entete.textContent ?? '').trim(),
      ),
    ).toEqual([
      'Semaine du lundi',
      'Comptes inscrits',
      'Producteur',
      'Volume apporté, puis nombre de commandes',
      'Récolte',
      'Quantité vendue, puis revenu',
    ]);
  });

  it('conserve chaque semaine de la période, y compris sans inscription, et détaille la valeur formée', () => {
    ouvrir();
    const tableaux = racine().querySelectorAll('.graphique-barres__alternative tbody');
    const semaines = [...tableaux[0].querySelectorAll('th')].map((cellule) =>
      (cellule.textContent ?? '').trim(),
    );
    const valeurs = [...tableaux[0].querySelectorAll('td')].map((cellule) =>
      (cellule.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

    expect(semaines).toEqual(['28/09', '05/10', '12/10']);
    expect(valeurs).toEqual([
      '3 comptes — 1 producteur, 2 acheteurs',
      '2 comptes — 2 producteurs, 0 acheteur',
      '0 compte — 0 producteur, 0 acheteur',
    ]);
  });

  it('les classements n’affichent que des noms et des montants, jamais un identifiant de compte', () => {
    ouvrir();
    const tableaux = racine().querySelectorAll('.graphique-barres__alternative tbody');

    expect(
      [...tableaux[1].querySelectorAll('th')].map((cellule) => (cellule.textContent ?? '').trim()),
    ).toEqual(['Awa Diop', 'Moussa Ndiaye']);
    expect(
      [...tableaux[1].querySelectorAll('td')].map((cellule) =>
        sansEspace(cellule.textContent ?? ''),
      ),
    ).toEqual(['12000FCFA—3commandes', '6500FCFA—1commande']);
    expect(
      [...tableaux[2].querySelectorAll('td')].map((cellule) =>
        sansEspace(cellule.textContent ?? ''),
      ),
    ).toEqual(['233,5kg—12000FCFA', '13sac—6500FCFA']);
    expect(racine().textContent ?? '').not.toContain('producteurId');
  });

  it('arrondit les montants de la synthèse à l’entier, la quantité vendue gardant sa décimale', () => {
    ouvrir(
      donnees({
        volumeAffaires: 375885.5,
        topProducteurs: [
          { producteurId: 4, nom: 'Awa Diop', chiffreAffaires: 22110.91, nombreCommandes: 1 },
        ],
      }),
    );

    expect(sansEspace(texte('.statistiques-admin__valeur--dominant'))).toBe('375886FCFA');
    expect(texte('.statistiques-admin__valeur--dominant')).not.toContain(',');
    const tableaux = racine().querySelectorAll('.graphique-barres__alternative tbody');
    expect(sansEspace(tableaux[1].querySelector('td')?.textContent ?? '')).toBe(
      '22111FCFA—1commande',
    );
    expect(texte('#statistiques-admin-annonce')).toContain('375 886 FCFA pour 6 commandes');
  });

  it('désigne l’unique pastille de période active et ne redemande rien au second clic', () => {
    ouvrir();
    expect(pastilles().map((pastille) => pastille.getAttribute('data-valeur'))).toEqual([
      '7j',
      '30j',
      'mois',
    ]);
    expect(pastilles().map((pastille) => pastille.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);

    pastilles()[1]?.click();
    fixture.detectChanges();
    http.expectNone((req) => req.url === URL);
  });

  it('un clic sur une autre période relit le même endpoint et est annoncé', () => {
    ouvrir();
    pastilles()[0]?.click();
    fixture.detectChanges();

    const requete = http.expectOne(`${URL}?periode=7j`);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.keys()).toEqual(['periode']);
    requete.flush(donnees({ volumeAffaires: 6500, commandesPeriode: 1 }));
    fixture.detectChanges();

    expect(pastilles().map((pastille) => pastille.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(texte('#statistiques-admin-annonce')).toContain('Période : 7 derniers jours');
    expect(texte('#statistiques-admin-annonce')).toContain('6 500 FCFA pour 1 commande');
  });

  it('signale une lecture ratée par la notice du bas, sans bannière au-dessus du contenu', () => {
    enCours().flush(ERREUR.corps, ERREUR.reponse);
    fixture.detectChanges();

    expect(toast.notice()?.type).toBe('erreur');
    expect(toast.notice()?.message).toBe('Une erreur interne est survenue. Veuillez réessayer.');
    expect(racine().querySelector('.message--erreur')).toBeNull();
    expect(texte('#statistiques-admin-erreur .etat__titre')).toBe('Statistiques non chargées');
    expect(texte('#statistiques-admin-erreur .etat__texte')).toBe(
      'Une erreur interne est survenue. Veuillez réessayer.',
    );
  });

  it('« Réessayer » après une erreur écarte la notice et relance exactement une lecture', () => {
    enCours().flush(ERREUR.corps, ERREUR.reponse);
    fixture.detectChanges();

    element<HTMLButtonElement>('#statistiques-admin-reessayer').click();
    fixture.detectChanges();
    // `masquer()` descend la notice avant de la retirer : `enSortie` est l'état observable ici.
    expect(toast.enSortie()).toBe(true);

    const requete = enCours();
    expect(requete.request.params.get('periode')).toBe('30j');
    requete.flush(donnees());
    fixture.detectChanges();

    expect(cartes()).toHaveLength(6);
    expect(racine().querySelector('#statistiques-admin-erreur')).toBeNull();
  });

  it('« Actualiser » relit la période affichée, sans la changer', () => {
    ouvrir();
    element<HTMLButtonElement>('#statistiques-admin-actualiser').click();
    fixture.detectChanges();

    const requete = http.expectOne(`${URL}?periode=30j`);
    requete.flush(donnees({ volumeAffaires: 21000 }));
    fixture.detectChanges();

    expect(texte('#statistiques-admin-annonce')).toContain('21 000 FCFA');
  });

  it('une plateforme sans compte, sans récolte ni commande est dite vide plutôt que comptée à zéro', () => {
    ouvrir(
      donnees({
        utilisateursTotal: 0,
        producteurs: 0,
        acheteurs: 0,
        recoltesActives: 0,
        commandesPeriode: 0,
        volumeAffaires: 0,
        inscriptionsParSemaine: [],
        repartitionParFiliere: [],
        repartitionParZone: [],
        topProducteurs: [],
        topRecoltes: [],
        repartitionParMoyenPaiement: [],
        nombreRembourses: 0,
      }),
    );

    expect(texte('#statistiques-admin-vide .etat__titre')).toBe('Rien à compter pour l’instant');
    expect(racine().querySelector('.statistiques-admin__cartes')).toBeNull();
    expect(
      element<HTMLAnchorElement>('#statistiques-admin-vide a[href="/admin/utilisateurs"]'),
    ).not.toBeNull();
  });

  it('rend les trois répartitions avec leurs libellés français et le plafond des zones', () => {
    ouvrir();
    const blocs = [
      ...racine().querySelectorAll('.statistiques-admin__repartitions .statistiques-admin__bloc'),
    ];

    expect(paires(blocs[0])).toEqual([
      ['Maraîchage', '2'],
      ['Élevage', '1'],
    ]);
    expect(paires(blocs[1])).toEqual([
      ['Thiès', '2'],
      ['Autres zones', '1'],
    ]);
    expect(blocs[1].querySelector('.statistiques-admin__precision')?.textContent ?? '').toContain(
      'Huit zones au plus, le reste sous « Autres zones »',
    );
    expect(
      [...blocs[2].querySelectorAll('.statistiques-admin__ligne')].map((ligne) => [
        (ligne.querySelector('span')?.textContent ?? '').trim(),
        sansEspace(ligne.querySelector('.statistiques-admin__valeur-ligne')?.textContent ?? ''),
        (ligne.querySelector('.statistiques-admin__nombre')?.textContent ?? '').trim(),
      ]),
    ).toEqual([
      ['Wave', '12000FCFA', '4 paiements'],
      ['Orange Money', '6500FCFA', '1 paiement'],
    ]);
  });

  it.each([
    [1, '1 remboursement compté sur cette période.'],
    [2, '2 remboursements comptés sur cette période.'],
  ])('compte les remboursements simulés (%i) avec le mot au bon nombre', (nombre, attendu) => {
    ouvrir(donnees({ nombreRembourses: nombre }));

    expect(
      texte('.statistiques-admin__repartitions > :last-child .statistiques-admin__precision'),
    ).toContain(attendu);
  });

  it('une filière hors référentiel est rendue telle quelle, sans être masquée', () => {
    ouvrir(donnees({ repartitionParFiliere: [{ nom: 'AQUACULTURE', nombre: 1 }] }));

    expect(texte('.statistiques-admin__ligne')).toContain('AQUACULTURE');
  });

  it('n’affiche aucun classement quand la période n’a rapporté que des zéros', () => {
    ouvrir(
      donnees({
        volumeAffaires: 0,
        topProducteurs: [],
        topRecoltes: [],
      }),
    );

    expect(racine().querySelectorAll('app-barres')).toHaveLength(1);
    expect(
      [...racine().querySelectorAll('.statistiques-admin__bloc')]
        .map((bloc) => (bloc.textContent ?? '').replace(/\s+/g, ' ').trim())
        .some((bloc) => bloc.includes('Aucune commande retenue sur la période')),
    ).toBe(true);
  });
});
