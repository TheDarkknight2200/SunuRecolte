import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { AuthResponse } from '../../../core/modeles/auth.modeles';
import { Connexion } from './connexion';

const API = 'http://localhost:8080/api';

const REPONSE: AuthResponse = {
  token: 'jeton-de-test',
  utilisateurId: 7,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

/** ActivatedRoute minimal : fournit les paramètres de requête sans navigation réelle. */
function routeFactice(parametres: Record<string, string>): ActivatedRoute {
  const snapshot: Record<string, unknown> = {
    outlet: 'primary',
    url: [],
    params: {},
    queryParams: parametres,
    queryParamMap: convertToParamMap(parametres),
    fragment: null,
    data: {},
    children: [],
    pathFromRoot: [],
  };
  snapshot['root'] = snapshot;
  snapshot['pathFromRoot'] = [snapshot];
  return { snapshot } as unknown as ActivatedRoute;
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function saisir(racine: HTMLElement, selecteur: string, valeur: string): void {
  const champ = element<HTMLInputElement>(racine, selecteur);
  champ.value = valeur;
  champ.dispatchEvent(new Event('input'));
}

function soumettre(fixture: ComponentFixture<Connexion>): void {
  element<HTMLFormElement>(fixture.nativeElement, 'form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function erreurs(fixture: ComponentFixture<Connexion>): string[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.champ__erreur'),
  ).map((noeud) => (noeud.textContent ?? '').trim());
}

describe('Connexion', () => {
  let http: HttpTestingController;
  let routeur: Router;

  function creer(parametres: Record<string, string> = {}): ComponentFixture<Connexion> {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: routeFactice(parametres) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    routeur = TestBed.inject(Router);
    vi.spyOn(routeur, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Connexion);
    fixture.detectChanges();
    return fixture;
  }

  function identifier(fixture: ComponentFixture<Connexion>): void {
    saisir(fixture.nativeElement, '#connexion-email', 'awa.diop@example.sn');
    saisir(fixture.nativeElement, '#connexion-mot-de-passe', 'secret1');
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('signale les champs obligatoires d’un formulaire vide', () => {
    const fixture = creer();

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual(['Ce champ est obligatoire.', 'Ce champ est obligatoire.']);
    expect(routeur.navigateByUrl).not.toHaveBeenCalled();
  });

  it('signale un format d’adresse email invalide', () => {
    const fixture = creer();
    saisir(fixture.nativeElement, '#connexion-email', 'pas-une-adresse');
    saisir(fixture.nativeElement, '#connexion-mot-de-passe', 'secret1');

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual(["Format d'adresse email invalide."]);
  });

  it('refuse un domaine sans extension, que le backend accepterait pourtant', () => {
    const fixture = creer();
    // `@Email` (Jakarta) accepte `awa@exemple` : le blocage est ici purement client, avant requête.
    saisir(fixture.nativeElement, '#connexion-email', 'awa@exemple');
    saisir(fixture.nativeElement, '#connexion-mot-de-passe', 'secret1');

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual([
      'Il manque l’extension du domaine, par exemple prenom@exemple.sn.',
    ]);
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('envoie les identifiants, affiche l’état de chargement puis redirige selon le rôle', () => {
    const fixture = creer();
    identifier(fixture);

    soumettre(fixture);

    const bouton = element<HTMLButtonElement>(fixture.nativeElement, 'button[type="submit"]');
    expect(bouton.getAttribute('aria-busy')).toBe('true');
    expect(bouton.disabled).toBe(true);

    const requete = http.expectOne(`${API}/auth/connexion`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({
      email: 'awa.diop@example.sn',
      motDePasse: 'secret1',
    });

    requete.flush(REPONSE);
    fixture.detectChanges();

    expect(routeur.navigateByUrl).toHaveBeenCalledWith('/producteur');
    expect(bouton.getAttribute('aria-busy')).toBe('false');
    expect(bouton.textContent).toContain('Se connecter');
  });

  it('affiche le message du backend quand les identifiants sont refusés', () => {
    const fixture = creer();
    identifier(fixture);

    soumettre(fixture);

    http
      .expectOne(`${API}/auth/connexion`)
      .flush(
        { statut: 401, message: 'Email ou mot de passe incorrect.', timestamp: '2026-01-01T10:00:00' },
        { status: 401, statusText: 'Unauthorized' },
      );
    fixture.detectChanges();

    const message = element<HTMLElement>(fixture.nativeElement, '.message--erreur');
    expect(message.textContent).toContain('Email ou mot de passe incorrect.');
    expect(routeur.navigateByUrl).not.toHaveBeenCalled();
  });

  it('revient à la page demandée après connexion (paramètre retour interne)', () => {
    const fixture = creer({ retour: '/tableau-de-bord' });
    identifier(fixture);

    soumettre(fixture);
    http.expectOne(`${API}/auth/connexion`).flush(REPONSE);

    expect(routeur.navigateByUrl).toHaveBeenCalledWith('/tableau-de-bord');
  });

  it('ignore un paramètre retour menant hors du site', () => {
    const fixture = creer({ retour: '//exemple-malveillant.sn' });
    identifier(fixture);

    soumettre(fixture);
    http.expectOne(`${API}/auth/connexion`).flush(REPONSE);

    expect(routeur.navigateByUrl).toHaveBeenCalledWith('/producteur');
  });

  it('explique une redirection pour session expirée', () => {
    const fixture = creer({ sessionExpiree: '1' });

    const message = element<HTMLElement>(fixture.nativeElement, '.message--info');
    expect(message.textContent).toContain('Votre session a expiré');
  });

  it('porte un titre h1 unique et un seul formulaire', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    const titres = Array.from(racine.querySelectorAll<HTMLElement>('h1'));
    expect(titres).toHaveLength(1);
    expect((titres[0].textContent ?? '').trim()).toBe('Connexion');
    expect(racine.querySelectorAll('form')).toHaveLength(1);
  });

  it('place le formulaire sous le même parent que le titre', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    expect(element(racine, 'form').parentElement).toBe(element(racine, 'h1').parentElement);
  });

  it('place la bannière de session expirée sous le même parent que le formulaire', () => {
    const fixture = creer({ sessionExpiree: '1' });
    const racine = fixture.nativeElement as HTMLElement;

    const banniere = element<HTMLElement>(racine, '.message--info');
    expect(banniere.getAttribute('role')).toBe('status');
    expect(banniere.parentElement).toBe(element(racine, 'form').parentElement);
  });

  it('place la bannière d’erreur sous le même parent que le formulaire', () => {
    const fixture = creer();
    identifier(fixture);

    soumettre(fixture);
    http
      .expectOne(`${API}/auth/connexion`)
      .flush(
        {
          statut: 401,
          message: 'Email ou mot de passe incorrect.',
          timestamp: '2026-01-01T10:00:00',
        },
        { status: 401, statusText: 'Unauthorized' },
      );
    fixture.detectChanges();

    const racine = fixture.nativeElement as HTMLElement;
    const banniere = element<HTMLElement>(racine, '.message--erreur');
    expect(banniere.getAttribute('role')).toBe('alert');
    expect(banniere.parentElement).toBe(element(racine, 'form').parentElement);
  });

  it('centre son contenu dans le conteneur unique de la section', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    const section = element<HTMLElement>(racine, '.auth');
    expect(section.children).toHaveLength(1);
    const conteneur = element<HTMLElement>(racine, '.conteneur');
    expect(conteneur.parentElement).toBe(section);
    expect(element(racine, 'h1').parentElement).toBe(conteneur);
  });
});
