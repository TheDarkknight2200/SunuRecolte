import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { Subject } from 'rxjs';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { ProducteurResponse, RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { FormulaireRecolte } from './formulaire-recolte';

const API = 'http://localhost:8080/api';
const MOI = `${API}/producteurs/moi`;
const RECOLTES = `${API}/recoltes`;

const PROFIL: ProducteurResponse = {
  id: 4,
  utilisateurId: 4,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  telephone: '770000000',
  localisationExploitation: 'Rufisque',
  filiere: 'MARAICHAGE',
  description: null,
};

function recolte(id: number, surcharge: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id,
    producteurId: PROFIL.id,
    nomProducteur: 'Awa Diop',
    localisationProducteur: 'Rufisque',
    produit: 'Tomate',
    description: 'Tomates de saison',
    quantiteDisponible: 500,
    quantiteMin: 10,
    quantiteMax: 200,
    unite: 'kg',
    prixUnitaire: 250,
    imageUrl: null,
    localisation: 'Rufisque',
    dateDisponibilite: '2026-10-05',
    statut: 'DISPONIBLE',
    dateCreation: '2026-09-01T09:00:00',
    ...surcharge,
  };
}

const SESSION: SessionUtilisateur = {
  utilisateurId: 4,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '4', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function valeur(racine: HTMLElement, selecteur: string): string {
  return element<HTMLInputElement>(racine, selecteur).value;
}

function saisir(racine: HTMLElement, selecteur: string, valeurSaisie: string): void {
  const champ = element<HTMLInputElement>(racine, selecteur);
  champ.value = valeurSaisie;
  champ.dispatchEvent(new Event('input'));
}

function taper(selecteur: string, valeurSaisie: string): void {
  saisir(racine, selecteur, valeurSaisie);
  fixture.detectChanges();
}

function valeurChamp(selecteur: string): string {
  return valeur(racine, selecteur);
}

let http: HttpTestingController;
let fixture: ComponentFixture<FormulaireRecolte>;
let racine: HTMLElement;
let parametres: Subject<ParamMap>;

/** Navigations réellement demandées par le composant (aucune assertion interne au composant). */
let navigations: unknown[][];

/** Ouvre la route de création (aucun paramètre) ou de modification (id). */
function ouvrir(id: string | null): void {
  navigations = [];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([], withDisabledInitialNavigation()),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: parametres.asObservable() } },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation((...appels: unknown[]) => {
    navigations.push(appels);
    return Promise.resolve(true);
  });
  fixture = TestBed.createComponent(FormulaireRecolte);
  fixture.detectChanges();
  parametres.next(convertToParamMap(id === null ? {} : { id }));
  fixture.detectChanges();
  racine = fixture.nativeElement as HTMLElement;
}

/** Charge le profil du producteur connecté, seul fournisseur de `producteurId`. */
function chargerProfil(profil: ProducteurResponse = PROFIL): void {
  http.expectOne(MOI).flush(profil);
  fixture.detectChanges();
}

function enAttenteRecolte(id = 7): TestRequest {
  return http.expectOne(`${RECOLTES}/${id}`);
}

/** Saisie complète et cohérente d'une nouvelle récolte. */
function saisieComplete(): void {
  taper('#produit', '  Tomate  ');
  taper('#quantiteDisponible', '500');
  taper('#unite', ' kg ');
  taper('#prixUnitaire', '250');
}

function soumettre(): void {
  element<HTMLFormElement>(racine, 'form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

describe('FormulaireRecolte', () => {
  beforeEach(() => {
    localStorage.clear();
    parametres = new Subject<ParamMap>();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('création', () => {
    beforeEach(() => {
      ouvrir(null);
      chargerProfil();
    });

    it('demande l’identité du producteur à /producteurs/moi, sans paramètre client', () => {
      expect(texteDe(element(racine, 'h1'))).toBe('Publier une récolte');
      expect(texteDe(racine)).toContain('Vous publiez en tant que Awa Diop.');
      expect(element(racine, 'form').querySelector('#producteurId')).toBeNull();
    });

    it('offre exactement les champs du contrat RecolteRequest, jamais le statut', () => {
      const ids = Array.from(racine.querySelectorAll('[formControlName]')).map(
        (champ) => champ.getAttribute('formControlName'),
      );
      expect(ids).toEqual([
        'produit',
        'description',
        'quantiteDisponible',
        'unite',
        'prixUnitaire',
        'quantiteMin',
        'quantiteMax',
        'dateDisponibilite',
        'localisation',
        'imageUrl',
      ]);
      expect(ids).not.toContain('statut');
      expect(ids).not.toContain('producteurId');
    });

    it('annonce les quatre champs obligatoires au navigateur et aux lecteurs d’écran', () => {
      for (const id of ['produit', 'quantiteDisponible', 'unite', 'prixUnitaire']) {
        const champ = element(racine, `#${id}`);
        expect(champ.hasAttribute('required')).toBe(true);
        expect(champ.getAttribute('aria-required')).toBe('true');
      }
      for (const id of ['description', 'quantiteMin', 'quantiteMax', 'localisation', 'imageUrl']) {
        const champ = element(racine, `#${id}`);
        expect(champ.hasAttribute('required')).toBe(false);
        expect(champ.getAttribute('aria-required')).toBeNull();
      }
    });

    it('bloque l’envoi tant qu’un champ obligatoire manque et nomme le champ', () => {
      soumettre();

      expect(element(racine, '#produit').getAttribute('aria-invalid')).toBe('true');
      expect(texteDe(element(racine, '#produit-erreur'))).toBe('Ce champ est obligatoire.');
      expect(element(racine, '#quantiteDisponible').getAttribute('aria-invalid')).toBe('true');
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('refuse une quantité ou un prix nul avant tout appel', () => {
      taper('#produit', 'Tomate');
      taper('#unite', 'kg');
      taper('#quantiteDisponible', '0');
      taper('#prixUnitaire', '250');
      soumettre();

      expect(texteDe(element(racine, '#quantiteDisponible-erreur'))).toBe(
        'Cette valeur doit être supérieure à 0.',
      );
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('refuse une commande minimale supérieure à la commande maximale', () => {
      saisieComplete();
      taper('#quantiteMin', '50');
      taper('#quantiteMax', '10');
      soumettre();

      expect(texteDe(racine)).toContain(
        'La commande minimale ne peut pas dépasser la commande maximale.',
      );
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('accepte une commande minimale inférieure à la maximale malgré l’ordre lexical', () => {
      saisieComplete();
      taper('#quantiteMin', '5');
      taper('#quantiteMax', '50');
      soumettre();

      const requete = http.expectOne(RECOLTES);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body.quantiteMin).toBe(5);
      expect(requete.request.body.quantiteMax).toBe(50);
      requete.flush(recolte(12), { status: 201, statusText: 'Created' });
    });

    it('envoie POST /api/recoltes avec le producteurId lu du profil et les champs vides à null', () => {
      taper('#produit', '  Niébe  ');
      taper('#quantiteDisponible', '80');
      taper('#unite', ' kg ');
      taper('#prixUnitaire', '900');

      soumettre();

      const requete = http.expectOne(RECOLTES);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({
        producteurId: PROFIL.id,
        produit: 'Niébe',
        description: null,
        quantiteDisponible: 80,
        quantiteMin: null,
        quantiteMax: null,
        unite: 'kg',
        prixUnitaire: 900,
        imageUrl: null,
        localisation: null,
        dateDisponibilite: null,
      });

      requete.flush(recolte(12, { produit: 'Niébe' }), { status: 201, statusText: 'Created' });
    });

    it('un seul envoi à la fois : le bouton se verrouille pendant la requête', () => {
      saisieComplete();
      soumettre();

      const bouton = element<HTMLButtonElement>(racine, '#formulaire-soumettre');
      expect(bouton.disabled).toBe(true);
      expect(bouton.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(bouton)).toBe('…');
      const envois = http.match((requete) => requete.method === 'POST');
      expect(envois).toHaveLength(1);

      envois[0].flush(recolte(12), { status: 201, statusText: 'Created' });
      fixture.detectChanges();

      expect(bouton.disabled).toBe(false);
      expect(texteDe(bouton)).toBe('Publier la récolte');
    });

    it('publie puis ramène la liste avec le message de création', () => {
      saisieComplete();
      soumettre();
      http.expectOne(RECOLTES).flush(recolte(12), { status: 201, statusText: 'Created' });

      expect(navigations).toEqual([[['/producteur/recoltes'], { queryParams: { recolteCreee: '1' } }]]);
    });

    it('conserve les valeurs et rapporte les erreurs de champ du backend', () => {
      taper('#produit', 'Tomate');
      taper('#quantiteDisponible', '500');
      taper('#unite', 'kg');
      taper('#prixUnitaire', '250');
      soumettre();

      http.expectOne(RECOLTES).flush(
        {
          statut: 400,
          message: 'Données invalides.',
          erreurs: { produit: 'Le produit ne peut pas dépasser 150 caractères' },
          timestamp: '2026-09-01T09:00:00',
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '#produit-erreur'))).toBe(
        'Le produit ne peut pas dépasser 150 caractères',
      );
      expect(valeurChamp('#prixUnitaire')).toBe('250');
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });

    it('affiche le message métier du backend sans déconnexion', () => {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
      saisieComplete();
      soumettre();

      http.expectOne(RECOLTES).flush(
        {
          statut: 400,
          message: 'La quantité minimale ne peut pas dépasser la quantité maximale.',
          timestamp: '2026-09-01T09:00:00',
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'La quantité minimale ne peut pas dépasser la quantité maximale.',
      );
      expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
      expect(navigations).toEqual([]);
    });

    it('un refus 403 reste un refus : ni purge ni redirection', () => {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));

      saisieComplete();
      soumettre();
      http.expectOne(RECOLTES).flush(
        { statut: 403, message: 'Accès refusé.', timestamp: '2026-09-01T09:00:00' },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
      expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
      expect(navigations).toEqual([]);
    });
  });

  describe('modification', () => {
    beforeEach(() => {
      ouvrir('7');
      chargerProfil();
    });

    it('recharge la récolte dont l’identifiant vient de la route', () => {
      const requete = enAttenteRecolte();
      expect(requete.request.method).toBe('GET');
      expect(requete.request.params.keys().length).toBe(0);

      requete.flush(recolte(7));
      fixture.detectChanges();

      expect(texteDe(element(racine, 'h1'))).toBe('Modifier la récolte');
      expect(valeurChamp('#produit')).toBe('Tomate');
      expect(valeurChamp('#quantiteDisponible')).toBe('500');
      expect(valeurChamp('#prixUnitaire')).toBe('250');
      expect(valeurChamp('#quantiteMin')).toBe('10');
      expect(valeurChamp('#quantiteMax')).toBe('200');
      expect(element<HTMLTextAreaElement>(racine, '#description').value).toBe('Tomates de saison');
      expect(valeurChamp('#localisation')).toBe('Rufisque');
      expect(valeurChamp('#dateDisponibilite')).toBe('2026-10-05');
      expect(valeurChamp('#imageUrl')).toBe('');
    });

    it('enregistre par PUT /api/recoltes/{id} avec le producteurId du profil', () => {
      enAttenteRecolte().flush(recolte(7));
      fixture.detectChanges();

      taper('#quantiteDisponible', '300');
      soumettre();

      const requete = http.expectOne(`${RECOLTES}/7`);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.body.produit).toBe('Tomate');
      expect(requete.request.body.producteurId).toBe(PROFIL.id);
      expect(requete.request.body.quantiteDisponible).toBe(300);

      requete.flush(recolte(7, { quantiteDisponible: 300 }));
      expect(navigations).toEqual([
        [['/producteur/recoltes'], { queryParams: { recolteModifiee: '1' } }],
      ]);
    });

    it('propose « Enregistrer les modifications » et le retour à la liste', () => {
      enAttenteRecolte().flush(recolte(7));
      fixture.detectChanges();

      expect(texteDe(element(racine, '#formulaire-soumettre'))).toBe('Enregistrer les modifications');
      expect(sansEspace(element<HTMLAnchorElement>(racine, '.formulaire-recolte__actions a').getAttribute('href') ?? '')).toBe(
        '/producteur/recoltes',
      );
    });

    it('présente un 404 comme récolte introuvable, sans formulaire', () => {
      enAttenteRecolte().flush(
        { statut: 404, message: 'Recolte introuvable avec l’id : 7', timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(racine)).toContain('Récolte introuvable.');
      expect(racine.querySelector('form')).toBeNull();
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });

    it('refuse d’ouvrir la récolte d’un autre producteur, sans purge', () => {
      localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));

      enAttenteRecolte().flush(
        { statut: 403, message: 'Accès refusé.', timestamp: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, 'h1'))).toBe('Accès refusé');
      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Accès refusé : cette récolte ne vous appartient pas.',
      );
      expect(racine.querySelector('form')).toBeNull();
      expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    });

    it('compare l’appartenance avec le profil réel si l’API renvoie une autre récolte', () => {
      enAttenteRecolte().flush(recolte(7, { producteurId: 99 }));
      fixture.detectChanges();

      expect(texteDe(racine)).toContain('cette récolte ne vous appartient pas');
      expect(racine.querySelector('form')).toBeNull();
    });
  });

  describe('chargement', () => {
    it('qualifie un identifiant mal formé de récolte introuvable, sans aucun appel', () => {
      ouvrir('abc');

      expect(texteDe(racine)).toContain('Récolte introuvable.');
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('affiche l’état de chargement avant le profil, sans formulaire', () => {
      ouvrir(null);

      expect(texteDe(element(racine, '.etat'))).toContain('Chargement…');
      expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
      expect(racine.querySelector('form')).toBeNull();

      chargerProfil();
      expect(racine.querySelector('form')).not.toBeNull();
    });

    it('offre Réessayer quand le profil producteur ne se charge pas', () => {
      ouvrir(null);
      http.expectOne(MOI).flush(
        { statut: 500, message: 'Le service est temporairement indisponible.', timestamp: 'x' },
        { status: 500, statusText: 'Erreur' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Le service est temporairement indisponible.',
      );

      element<HTMLButtonElement>(racine, '#erreur-reessayer').click();
      fixture.detectChanges();

      const requete = http.expectOne(MOI);
      expect(requete.request.method).toBe('GET');
      requete.flush(PROFIL);
      fixture.detectChanges();

      expect(racine.querySelector('form')).not.toBeNull();
      expect(racine.querySelector('.message--erreur')).toBeNull();
    });

    it('recharge le formulaire quand la route change d’identifiant', () => {
      ouvrir('7');
      chargerProfil();
      enAttenteRecolte().flush(recolte(7, { produit: 'Tomate' }));
      fixture.detectChanges();
      expect(valeurChamp('#produit')).toBe('Tomate');

      parametres.next(convertToParamMap({ id: '9' }));
      fixture.detectChanges();

      const requete = http.expectOne(MOI);
      requete.flush(PROFIL);
      fixture.detectChanges();
      enAttenteRecolte(9).flush(recolte(9, { produit: 'Mangue' }));
      fixture.detectChanges();

      expect(valeurChamp('#produit')).toBe('Mangue');
      expect(texteDe(element(racine, 'h1'))).toBe('Modifier la récolte');
    });
  });
});
