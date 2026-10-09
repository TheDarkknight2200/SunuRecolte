import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { StatistiquesProducteurResponse } from '../../../core/modeles/domaine.modeles';
import { ToastService } from '../../../core/services/toast.service';
import { Barres } from '../../../partage/graphiques/barres';
import { Statistiques } from './statistiques';

const URL = 'http://localhost:8080/api/producteurs/moi/statistiques';

const ERREUR = {
  corps: { message: 'Une erreur interne est survenue. Veuillez réessayer.', timestamp: 'x' },
  reponse: { status: 500, statusText: 'Internal Server Error' },
};

function donnees(
  surcharge: Partial<StatistiquesProducteurResponse> = {},
): StatistiquesProducteurResponse {
  return {
    chiffreAffaires: 1350,
    nombreCommandes: 3,
    panierMoyen: 675,
    tauxAnnulation: 33.33,
    repartitionStatuts: [
      { statut: 'EN_ATTENTE', nombre: 1 },
      { statut: 'LIVREE', nombre: 1 },
      { statut: 'ANNULEE', nombre: 1 },
    ],
    ventesParJour: [
      { date: '2026-10-07', montant: 900 },
      { date: '2026-10-08', montant: 450 },
      { date: '2026-10-09', montant: 0 },
    ],
    topRecoltes: [
      { recolteId: 12, nom: 'Tomate', quantiteVendue: 60, unite: 'kg', revenu: 900 },
      { recolteId: 14, nom: 'Oignon', quantiteVendue: 3, unite: 'sac', revenu: 450 },
    ],
    stockFaible: [
      { recolteId: 14, nom: 'Oignon', quantiteDisponible: 3, unite: 'sac', statut: 'DISPONIBLE' },
      { recolteId: 15, nom: 'Mangue', quantiteDisponible: 0, unite: 'kg', statut: 'EPUISEE' },
    ],
    commandesATraiter: 2,
    ...surcharge,
  };
}

describe('Statistiques (écran producteur)', () => {
  let fixture: ComponentFixture<Statistiques>;
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
  function ouvrir(reponse: StatistiquesProducteurResponse = donnees()): void {
    enCours().flush(reponse);
    fixture.detectChanges();
  }

  function pastilles(): HTMLButtonElement[] {
    return [...racine().querySelectorAll<HTMLButtonElement>('#periodes [data-valeur]')];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Statistiques],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([], withDisabledInitialNavigation()),
      ],
    });
    fixture = TestBed.createComponent(Statistiques);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
  });

  it('monte sur l’état de chargement, sans rien inventer en attendant la réponse', () => {
    expect(element('#statistiques-chargement').getAttribute('aria-busy')).toBe('true');
    expect(texte('#statistiques-annonce')).toBe('');
    expect(racine().querySelector('.statistiques__cartes')).toBeNull();
    ouvrir();
  });

  it('relit la période par défaut du backend, et jamais un identifiant de producteur', () => {
    const requete = enCours();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.get('periode')).toBe('30j');
    expect(requete.request.params.keys()).toEqual(['periode']);
    requete.flush(donnees());
    fixture.detectChanges();
  });

  it('rend quatre cartes, dont le chiffre d’affaires et le panier moyen libellés hors annulées', () => {
    ouvrir();
    const cartes = [...racine().querySelectorAll('.statistiques__carte')];

    expect(cartes).toHaveLength(4);
    expect(cartes.map((carte) => (carte.querySelector('.statistiques__legende')?.textContent ?? '').trim())).toEqual([
      'Chiffre d’affaires',
      'Panier moyen',
      'Commandes',
      'Taux d’annulation',
    ]);
    expect(
      cartes
        .slice(0, 2)
        .map((carte) => carte.querySelector('.statistiques__precision')?.textContent?.trim()),
    ).toEqual(['Hors commandes annulées.', 'Hors commandes annulées.']);
    expect(sansEspace(cartes[0].querySelector('.statistiques__valeur')?.textContent ?? '')).toBe(
      '1350FCFA',
    );
    expect(sansEspace(cartes[1].querySelector('.statistiques__valeur')?.textContent ?? '')).toBe(
      '675FCFA',
    );
    expect(cartes[2]?.querySelector('.statistiques__valeur')?.textContent.trim()).toBe('3');
    expect(sansEspace(cartes[3].querySelector('.statistiques__valeur')?.textContent ?? '')).toBe(
      '33,33%',
    );
  });

  it('rend les deux graphiques demandés : colonnes par jour, barres horizontales par récolte', () => {
    ouvrir();
    const graphiques = fixture.debugElement
      .queryAll(By.directive(Barres))
      .map((noeud) => noeud.componentInstance);

    expect(graphiques).toHaveLength(2);
    expect(graphiques[0]?.orientation()).toBe('verticale');
    expect(graphiques[1]?.orientation()).toBe('horizontale');
    // Seules les colonnes portent un repère de valeur : les barres horizontales affichent déjà
    // leur montant sur la ligne du libellé.
    expect(graphiques[0]?.etiquetteMaximum()).toBe('Maximum encaissé sur une journée');
    expect(graphiques[1]?.etiquetteMaximum()).toBeNull();
    expect(
      [...racine().querySelectorAll('.graphique-barres__alternative thead th')].map((entete) =>
        (entete.textContent ?? '').trim(),
      ),
    ).toEqual(['Jour', 'Montant', 'Récolte', 'Quantité vendue, puis revenu']);
  });

  it('conserve chaque journée de la période, y compris sans vente, et rend la quantité avec son unité', () => {
    ouvrir();
    const tableaux = racine().querySelectorAll('.graphique-barres__alternative tbody');
    const jours = [...tableaux[0].querySelectorAll('td')].map((cellule) =>
      sansEspace(cellule.textContent ?? ''),
    );
    const recoltes = [...tableaux[1].querySelectorAll('td')].map((cellule) =>
      sansEspace(cellule.textContent ?? ''),
    );

    expect(jours).toEqual(['900FCFA', '450FCFA', '0FCFA']);
    expect(recoltes).toEqual(['60kg—900FCFA', '3sac—450FCFA']);
    expect(texte('.statistiques__stock-ligne .statistiques__nombre')).toBe('3 sac');
  });

  it('arrondit les montants de la synthèse à l’entier, la quantité vendue gardant sa décimale', () => {
    ouvrir(
      donnees({
        chiffreAffaires: 375885.5,
        panierMoyen: 22110.91,
        ventesParJour: [
          { date: '2026-10-07', montant: 375885.5 },
          { date: '2026-10-08', montant: 22110.91 },
        ],
        topRecoltes: [
          { recolteId: 12, nom: 'Tomate', quantiteVendue: 233.5, unite: 'kg', revenu: 350160.25 },
        ],
      }),
    );

    const valeurs = [...racine().querySelectorAll('.statistiques__carte .statistiques__valeur')];
    expect(sansEspace(valeurs[0].textContent ?? '')).toBe('375886FCFA');
    expect(sansEspace(valeurs[1].textContent ?? '')).toBe('22111FCFA');
    expect(sansEspace(valeurs[0].textContent ?? '')).not.toContain(',');

    const tableaux = racine().querySelectorAll('.graphique-barres__alternative tbody');
    expect([...tableaux[0].querySelectorAll('td')].map((cellule) =>
      sansEspace(cellule.textContent ?? ''),
    )).toEqual(['375886FCFA', '22111FCFA']);
    expect(sansEspace(tableaux[1].querySelector('td')?.textContent ?? '')).toBe('233,5kg—350160FCFA');
    expect(texte('#statistiques-annonce')).toContain('375 886 FCFA pour 3 commandes');
  });

  it('n’affiche aucune barre quand la période n’a rapporté que des zéros', () => {
    ouvrir(
      donnees({
        chiffreAffaires: 0,
        panierMoyen: 0,
        repartitionStatuts: [],
        ventesParJour: [{ date: '2026-10-09', montant: 0 }],
        topRecoltes: [],
      }),
    );

    expect(racine().querySelectorAll('app-barres')).toHaveLength(0);
    expect(texte('.statistiques__bloc')).toContain(
      'Aucune vente enregistrée sur la période',
    );
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
    requete.flush(donnees({ chiffreAffaires: 450, nombreCommandes: 1 }));
    fixture.detectChanges();

    expect(pastilles().map((pastille) => pastille.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(texte('#statistiques-annonce')).toContain('Période : 7 derniers jours');
    expect(texte('#statistiques-annonce')).toContain('450 FCFA pour 1 commande');
  });

  it('signale une lecture ratée par la notice du bas, sans bannière au-dessus du contenu', () => {
    enCours().flush(ERREUR.corps, ERREUR.reponse);
    fixture.detectChanges();

    expect(toast.notice()?.type).toBe('erreur');
    expect(toast.notice()?.message).toBe('Une erreur interne est survenue. Veuillez réessayer.');
    expect(racine().querySelector('.message--erreur')).toBeNull();
    expect(texte('#statistiques-erreur .etat__titre')).toBe('Statistiques non chargées');
    expect(texte('#statistiques-erreur .etat__texte')).toBe(
      'Une erreur interne est survenue. Veuillez réessayer.',
    );
  });

  it('« Réessayer » après une erreur écarte la notice et relance exactement une lecture', () => {
    enCours().flush(ERREUR.corps, ERREUR.reponse);
    fixture.detectChanges();

    element<HTMLButtonElement>('#statistiques-reessayer').click();
    fixture.detectChanges();
    // `masquer()` descend la notice avant de la retirer : `enSortie` est l'état observable ici.
    expect(toast.enSortie()).toBe(true);

    const requete = enCours();
    expect(requete.request.params.get('periode')).toBe('30j');
    requete.flush(donnees());
    fixture.detectChanges();

    expect(racine().querySelectorAll('.statistiques__carte')).toHaveLength(4);
    expect(racine().querySelector('#statistiques-erreur')).toBeNull();
  });

  it('« Actualiser » relit la période affichée, sans la changer', () => {
    ouvrir();
    element<HTMLButtonElement>('#statistiques-actualiser').click();
    fixture.detectChanges();

    const requete = http.expectOne(`${URL}?periode=30j`);
    requete.flush(donnees({ nombreCommandes: 5 }));
    fixture.detectChanges();

    expect(texte('#statistiques-annonce')).toContain('pour 5 commandes');
  });

  it('un producteur sans commande ni stock à surveiller est invité à publier une récolte', () => {
    ouvrir(
      donnees({
        chiffreAffaires: 0,
        nombreCommandes: 0,
        panierMoyen: 0,
        tauxAnnulation: 0,
        repartitionStatuts: [],
        ventesParJour: [],
        topRecoltes: [],
        stockFaible: [],
        commandesATraiter: 0,
      }),
    );

    expect(texte('#statistiques-vide .etat__titre')).toBe('Pas encore de statistiques');
    expect(racine().querySelector('.statistiques__cartes')).toBeNull();
    const lien = element<HTMLAnchorElement>('#statistiques-vide a[href="/producteur/recoltes/nouvelle"]');
    expect((lien.textContent ?? '').trim()).toBe('Ajouter une récolte');
  });

  it('rend la répartition des statuts avec son libellé, jamais la couleur seule', () => {
    ouvrir();
    const lignes = [...racine().querySelectorAll('.statistiques__repartition-ligne')];

    expect(lignes).toHaveLength(3);
    expect(lignes[0]?.querySelector('.badge')?.className).toContain('badge--avertissement');
    expect((lignes[2]?.querySelector('.badge')?.textContent ?? '').trim()).toBe('Annulée');
    expect(lignes.map((ligne) => ligne.querySelector('.statistiques__nombre')?.textContent.trim())).toEqual([
      '1',
      '1',
      '1',
    ]);
  });

  it('liste le stock faible avec son statut et le lien de modification de la récolte', () => {
    ouvrir();
    const precisions = [...racine().querySelectorAll('.statistiques__precision')].map((bloc) =>
      (bloc.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

    expect(precisions.some((ligne) => ligne.includes('sous 5 unités'))).toBe(true);
    expect(
      element<HTMLAnchorElement>('a[href="/producteur/recoltes/14/modifier"]').textContent.trim(),
    ).toBe('Oignon');
    expect(racine().querySelector('a[href="/producteur/recoltes/15/modifier"]')).not.toBeNull();
    expect(
      [...racine().querySelectorAll('.statistiques__stock-ligne .badge')].map((badge) =>
        (badge.textContent ?? '').trim(),
      ),
    ).toEqual(['Disponible', 'Épuisée']);
  });

  it.each([
    [0, false],
    [1, true],
    [4, true],
  ])('rappelle les commandes à traiter seulement quand il y en a (commandesATraiter = %i)', (nombre, attendu) => {
    ouvrir(donnees({ commandesATraiter: nombre }));

    const rappel = racine().querySelector('#rappel-commandes-a-traiter');
    expect(rappel !== null).toBe(attendu);
    if (attendu) {
      expect((rappel?.textContent ?? '').replace(/\s+/g, ' ')).toContain(
        `${nombre} commande${nombre > 1 ? 's' : ''} en attente`,
      );
      expect(rappel?.querySelector('a[href="/producteur/commandes"]')).not.toBeNull();
    }
  });
});
