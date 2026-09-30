import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { SessionUtilisateur } from '../../core/modeles/auth.modeles';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { FILIERES, Role, STATUTS_RECOLTE } from '../../core/modeles/referentiels';
import { CLE_UTILISATEUR } from '../../core/services/auth.service';
import { PanierService } from '../../core/services/panier.service';
import { Catalogue } from './catalogue';

const API = 'http://localhost:8080/api';
const URL_CATALOGUE = `${API}/recoltes`;

function recolte(id: number, surcharge: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id,
    producteurId: 3,
    nomProducteur: 'Diop',
    localisationProducteur: 'Thiès',
    produit: 'Mangue',
    description: null,
    quantiteDisponible: 500,
    quantiteMin: null,
    quantiteMax: null,
    unite: 'kg',
    prixUnitaire: 12500,
    imageUrl: null,
    localisation: null,
    dateDisponibilite: null,
    statut: 'DISPONIBLE',
    dateCreation: '2026-03-01T09:00:00',
    ...surcharge,
  };
}

function session(role: Role): SessionUtilisateur {
  return {
    utilisateurId: 9,
    nom: 'Fall',
    prenom: 'Moussa',
    email: 'moussa.fall@example.sn',
    role,
  };
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function elements<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T[] {
  return Array.from(racine.querySelectorAll<T>(selecteur));
}

/** Espace insécable et espace fine comprises : comparaison sans aucun blanc. */
function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function saisir(racine: HTMLElement, selecteur: string, valeur: string): void {
  const champ = element<HTMLInputElement>(racine, selecteur);
  champ.value = valeur;
  champ.dispatchEvent(new Event('input'));
}

function choisir(racine: HTMLElement, selecteur: string, valeur: string): void {
  const champ = element<HTMLSelectElement>(racine, selecteur);
  champ.value = valeur;
  champ.dispatchEvent(new Event('change'));
}

describe('Catalogue', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Catalogue>;
  let racine: HTMLElement;

  /**
   * Ouvre la page : le constructeur déclenche immédiatement la première requête.
   * `role` ouvre une session locale correspondante ; sans lui, la visite est anonyme.
   */
  function ouvrir(role?: Role): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session(role)));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Catalogue);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  /** Le panier du composant, tel qu'il existe après les clics. */
  function panier(): PanierService {
    return TestBed.inject(PanierService);
  }

  function rechercher(): void {
    element<HTMLFormElement>(racine, 'form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /**
   * Requête en attente sur le catalogue, filtres compris : `expectOne` compare
   * l'URL complet, d'où le sélecteur fonctionnel sur `request.url`.
   */
  function enAttente(): TestRequest {
    return http.expectOne((requete) => requete.url === URL_CATALOGUE);
  }

  /** Répond à la requête en attente puis rend l'état obtenu. */
  function repondre(corps: RecolteResponse[], requete = enAttente()): void {
    requete.flush(corps);
    fixture.detectChanges();
  }

  function repondreErreur(status: number, message: string, requete = enAttente()): void {
    requete.flush(
      { statut: status, message, timestamp: '2026-03-01T09:00:00' },
      { status, statusText: 'Erreur' },
    );
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('affiche l’état de chargement et jamais l’état vide pendant la requête', () => {
    ouvrir();

    expect(texteDe(element(racine, '.catalogue__etat'))).toContain('Chargement des récoltes…');
    expect(element(racine, '.catalogue__etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Aucune récolte');
    expect(racine.querySelector('.catalogue__liste')).toBeNull();

    repondre([]);
  });

  it('demande GET /api/recoltes sans aucun paramètre à l’ouverture', () => {
    ouvrir();

    const requete = enAttente();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(URL_CATALOGUE);
    expect(requete.request.params.keys().length).toBe(0);

    repondre([], requete);
  });

  it('envoie uniquement statut, filière et recherche, sans pagination', () => {
    ouvrir();
    repondre([]);

    saisir(racine, '#recherche', '  mangue  ');
    choisir(racine, '#statut', 'EPUISEE');
    choisir(racine, '#filiere', 'CEREALES');
    rechercher();

    const requete = enAttente();
    const parametres = requete.request.params;
    expect(parametres.keys().length).toBe(3);
    expect(parametres.get('recherche')).toBe('mangue');
    expect(parametres.get('statut')).toBe('EPUISEE');
    expect(parametres.get('filiere')).toBe('CEREALES');
    expect(parametres.has('producteurId')).toBe(false);
    expect(parametres.has('page')).toBe(false);
    expect(parametres.has('tri')).toBe(false);

    repondre([], requete);
  });

  it('propose en filtres exactement les valeurs des référentiels partagés', () => {
    ouvrir();
    repondre([]);

    expect(elements<HTMLOptionElement>(racine, '#statut option').map((option) => option.value)).toEqual([
      '',
      ...STATUTS_RECOLTE,
    ]);
    expect(elements<HTMLOptionElement>(racine, '#filiere option').map((option) => option.value)).toEqual([
      '',
      ...FILIERES,
    ]);
  });

  it('conserve l’ordre de l’API et n’affiche que les données réellement reçues', () => {
    ouvrir();

    repondre([
      recolte(2, { produit: 'Niébe', quantiteDisponible: 80, prixUnitaire: 900 }),
      recolte(1, { produit: 'Mangue', quantiteDisponible: 500, prixUnitaire: 12500 }),
    ]);

    expect(
      elements<HTMLElement>(racine, '.catalogue__ligne .cellule-double__titre').map(texteDe),
    ).toEqual(['Niébe', 'Mangue']);
    expect(texteDe(racine)).toContain('2 récoltes affichées');

    const seconde = elements<HTMLElement>(racine, '.catalogue__ligne')[1];
    expect(sansEspace(texteDe(seconde))).toContain('12500FCFA');
    expect(texteDe(seconde)).toContain('500 kg');
    expect(texteDe(seconde)).toContain('Diop — Thiès');
    expect(texteDe(seconde)).toContain('Disponible');
  });

  it('passe sous silence les champs null plutôt que d’inventer une valeur', () => {
    ouvrir();

    repondre([recolte(1)]);

    const ligne = element<HTMLElement>(racine, '.catalogue__ligne');
    expect(texteDe(ligne)).not.toContain('Commande minimale');
    expect(texteDe(ligne)).not.toContain('Commande maximale');
    expect(texteDe(ligne)).not.toContain('Disponible à partir du');
    expect(elements(racine, '.catalogue__description')).toHaveLength(0);
    expect(elements(racine, '.catalogue__meta')).toHaveLength(0);
    expect(elements(racine, 'img')).toHaveLength(0);
    expect(texteDe(ligne)).not.toContain('null');
    expect(texteDe(ligne)).not.toContain('undefined');
  });

  it('ajoute borne basse et borne haute quand l’API les fournit', () => {
    ouvrir();

    repondre([recolte(1, { quantiteMin: 5, quantiteMax: 50, description: 'Variety Kent', localisation: 'Thiès', dateDisponibilite: '2026-04-10' })]);

    const ligne = element<HTMLElement>(racine, '.catalogue__ligne');
    expect(texteDe(ligne)).toContain('Commande minimale');
    expect(texteDe(ligne)).toContain('Commande maximale');
    expect(texteDe(ligne)).toContain('5 kg');
    expect(texteDe(ligne)).toContain('50 kg');
    expect(texteDe(ligne)).toContain('Variety Kent');
    expect(texteDe(element(racine, '.catalogue__meta'))).toContain('10/04/2026');
    expect(texteDe(element(racine, '.catalogue__meta'))).toContain('Thiès');
  });

  it('relie chaque ligne au détail avec l’identifiant renvoyé par l’API', () => {
    ouvrir();

    repondre([recolte(12), recolte(7)]);

    const hrefs = elements<HTMLAnchorElement>(racine, '.catalogue__ligne a').map((lien) =>
      sansEspace(lien.getAttribute('href') ?? ''),
    );
    expect(hrefs).toEqual(['/recoltes/12', '/recoltes/12', '/recoltes/7', '/recoltes/7']);
    expect(elements<HTMLAnchorElement>(racine, '.catalogue__action').map(texteDe)).toEqual([
      'Voir la récolte',
      'Voir la récolte',
    ]);
  });

  it('distingue un catalogue vide d’un résultat vide lié aux critères', () => {
    ouvrir();
    repondre([]);

    expect(texteDe(racine)).toContain('Aucune récolte disponible pour le moment.');
    expect(texteDe(racine)).not.toContain('correspond à vos critères');
    expect(racine.querySelector('#vide-reinitialiser')).toBeNull();

    saisir(racine, '#recherche', 'mangue');
    rechercher();
    repondre([]);

    expect(texteDe(racine)).toContain('Aucune récolte ne correspond à vos critères.');
    expect(texteDe(racine)).not.toContain('disponible pour le moment');
    expect(racine.querySelector('#vide-reinitialiser')).not.toBeNull();
  });

  it('affiche l’erreur du backend sans la transformer en état vide', () => {
    ouvrir();

    repondreErreur(500, 'Le service est temporairement indisponible.');

    expect(texteDe(racine)).toContain('Le service est temporairement indisponible.');
    expect(texteDe(racine)).not.toContain('Aucune récolte');
    expect(racine.querySelector('.catalogue__liste')).toBeNull();
    expect(texteDe(element(racine, '.message--erreur'))).toContain('Réessayer');
  });

  it('Réessayer relance la même requête avec les critères saisis', () => {
    ouvrir();
    repondre([]);

    choisir(racine, '#statut', 'EPUISEE');
    rechercher();
    repondre([]);

    saisir(racine, '#recherche', 'oignon');
    rechercher();
    repondreErreur(500, 'Le serveur a refusé la requête.');

    cliquer('#erreur-reessayer');

    const requete = enAttente();
    expect(requete.request.params.get('recherche')).toBe('oignon');
    expect(requete.request.params.get('statut')).toBe('EPUISEE');
    expect(element<HTMLInputElement>(racine, '#recherche').value).toBe('oignon');
    expect(element<HTMLSelectElement>(racine, '#statut').value).toBe('EPUISEE');

    repondre([recolte(1)], requete);
  });

  it('Réinitialiser efface les critères puis relance sans paramètre', () => {
    ouvrir();
    repondre([]);

    const bouton = element<HTMLButtonElement>(racine, '#filtres-reinitialiser');
    expect(bouton.disabled).toBe(true);

    saisir(racine, '#recherche', 'mangue');
    choisir(racine, '#filiere', 'MARAICHAGE');
    rechercher();
    expect(bouton.disabled).toBe(false);
    repondre([]);

    cliquer('#vide-reinitialiser');

    const requete = enAttente();
    expect(requete.request.params.keys().length).toBe(0);
    expect(element<HTMLInputElement>(racine, '#recherche').value).toBe('');
    expect(element<HTMLSelectElement>(racine, '#filiere').value).toBe('');

    repondre([recolte(1)], requete);
    expect(texteDe(racine)).toContain('1 récolte affichée');
  });

  it('ne propose aucun ajout au panier tant que la visite est anonyme', () => {
    ouvrir();
    repondre([recolte(1), recolte(2, { statut: 'EPUISEE', quantiteDisponible: 0 })]);

    expect(racine.querySelector('#ajouter-1')).toBeNull();
    expect(racine.querySelector('#ajouter-2')).toBeNull();
    expect(texteDe(racine)).not.toMatch(/panier/i);
  });

  it('réserve l’ajout au panier à un acheteur : un producteur ne le voit pas', () => {
    ouvrir('PRODUCTEUR');
    repondre([recolte(1)]);

    expect(racine.querySelector('#ajouter-1')).toBeNull();
    expect(texteDe(racine)).not.toContain('Ajouter au panier');
  });

  it('réserve l’ajout au panier à un acheteur : un administrateur ne le voit pas', () => {
    ouvrir('ADMIN');
    repondre([recolte(1)]);

    expect(racine.querySelector('.catalogue__achat')).toBeNull();
    expect(texteDe(racine)).not.toContain('Ajouter au panier');
  });

  it('ajoute une unité de l’unité déclarée, sans aucune conversion', () => {
    ouvrir('ACHETEUR');
    repondre([recolte(1, { unite: 'kg' }), recolte(2, { produit: 'Mil', unite: 'tonne' })]);

    const blocs = elements<HTMLElement>(racine, '.catalogue__quantite').map(texteDe);
    expect(blocs).toEqual(['Quantité ajoutée : 1 kg', 'Quantité ajoutée : 1 tonne']);

    const bouton = element<HTMLButtonElement>(racine, '#ajouter-1');
    expect(bouton.disabled).toBe(false);
    expect(texteDe(bouton)).toContain('Ajouter au panier');

    cliquer('#ajouter-1');

    const message = element(racine, '.message--succes');
    expect(message.getAttribute('role')).toBe('status');
    expect(texteDe(message)).toContain('Récolte ajoutée au panier');
    expect(texteDe(message)).toContain('Mangue');
    const lignes = panier().lignes();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].recolteId).toBe(1);
    expect(lignes[0].quantite).toBe(1);
    expect(lignes[0].unite).toBe('kg');
  });

  it('désactive l’ajout d’une récolte épuisée sans la retirer du catalogue', () => {
    ouvrir('ACHETEUR');
    repondre([recolte(1, { statut: 'EPUISEE', quantiteDisponible: 0 })]);

    expect(elements(racine, '.catalogue__ligne')).toHaveLength(1);
    const bouton = element<HTMLButtonElement>(racine, '#ajouter-1');
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-describedby')).toBe('motif-1');
    expect(texteDe(element(racine, '.catalogue__motif'))).toContain('Épuisée');
    expect(panier().lignes()).toHaveLength(0);
  });

  it('refuse un ajout qui dépasserait le stock affiché et l’explique, sans rien ajouter', () => {
    ouvrir('ACHETEUR');
    repondre([recolte(1, { quantiteDisponible: 0.5 })]);

    const bouton = element<HTMLButtonElement>(racine, '#ajouter-1');
    expect(bouton.disabled).toBe(false);

    cliquer('#ajouter-1');

    const message = element(racine, '.message--erreur');
    expect(message.getAttribute('role')).toBe('alert');
    expect(texteDe(message)).toContain('Mangue');
    expect(texteDe(message)).toContain('inférieur');
    expect(racine.querySelector('.message--succes')).toBeNull();
    expect(panier().lignes()).toHaveLength(0);
  });

  it('fusionne deux clics sur la même récolte en une seule ligne de panier', () => {
    ouvrir('ACHETEUR');
    repondre([recolte(1, { quantiteDisponible: 500 })]);

    cliquer('#ajouter-1');
    cliquer('#ajouter-1');

    const lignes = panier().lignes();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].quantite).toBe(2);
    expect(texteDe(element(racine, '.message--succes'))).toContain('Récolte ajoutée au panier');
  });
});
