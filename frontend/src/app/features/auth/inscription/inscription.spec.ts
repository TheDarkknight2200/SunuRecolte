import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { AuthResponse } from '../../../core/modeles/auth.modeles';
import { ROLES_INSCRIPTION, RoleInscription } from '../../../core/modeles/referentiels';
import { CLE_JETON } from '../../../core/services/auth.service';
import { Inscription } from './inscription';

const API = 'http://localhost:8080/api';

const REPONSE: AuthResponse = {
  token: 'jeton-de-test',
  utilisateurId: 12,
  nom: 'Ndiaye',
  prenom: 'Moussa',
  email: 'moussa.ndiaye@example.sn',
  role: 'PRODUCTEUR',
};

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

/**
 * Sélection par position : `[value]` se lie au RadioControlValueAccessor, qui ne recopie
 * jamais la valeur dans l'attribut DOM. L'ordre de ROLES_INSCRIPTION fait donc foi, et
 * c'est l'événement « change » qui pousse la valeur liée dans le contrôle de formulaire.
 */
function choisirRole(racine: HTMLElement, role: RoleInscription): void {
  const radio = Array.from(
    racine.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  )[ROLES_INSCRIPTION.indexOf(role)];
  if (!radio) {
    throw new Error(`Rôle introuvable : ${role}`);
  }
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Sélection par libellé : les options utilisent ngValue, leur valeur DOM est interne. */
function choisirOption(racine: HTMLElement, selecteur: string, libelle: string): void {
  const select = element<HTMLSelectElement>(racine, selecteur);
  const option = Array.from(select.options).find(
    (candidat) => (candidat.textContent ?? '').trim() === libelle,
  );
  if (!option) {
    throw new Error(`Option introuvable : ${libelle}`);
  }
  select.selectedIndex = option.index;
  select.dispatchEvent(new Event('change'));
}

function soumettre(fixture: ComponentFixture<Inscription>): void {
  element<HTMLFormElement>(fixture.nativeElement, 'form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function erreurs(fixture: ComponentFixture<Inscription>): string[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.champ__erreur'),
  ).map((noeud) => (noeud.textContent ?? '').trim());
}

describe('Inscription', () => {
  let http: HttpTestingController;
  let routeur: Router;

  function creer(): ComponentFixture<Inscription> {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    routeur = TestBed.inject(Router);
    vi.spyOn(routeur, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Inscription);
    fixture.detectChanges();
    return fixture;
  }

  /** Nom, prénom, email, téléphone, mot de passe — hors rôle et champs conditionnels. */
  function remplirIdentite(
    fixture: ComponentFixture<Inscription>,
    valeurs: { email?: string; motDePasse?: string } = {},
  ): void {
    saisir(fixture.nativeElement, '#inscription-nom', 'Ndiaye');
    saisir(fixture.nativeElement, '#inscription-prenom', 'Moussa');
    saisir(fixture.nativeElement, '#inscription-email', valeurs.email ?? 'moussa.ndiaye@example.sn');
    saisir(fixture.nativeElement, '#inscription-telephone', '771234567');
    saisir(fixture.nativeElement, '#inscription-mot-de-passe', valeurs.motDePasse ?? 'secret1');
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('ne propose que les rôles producteur et acheteur', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    const libelles = Array.from(racine.querySelectorAll<HTMLElement>('.auth__choix')).map(
      (choix) => (choix.textContent ?? '').trim(),
    );
    expect(libelles).toEqual(['Producteur', 'Acheteur']);
    expect(racine.textContent).not.toContain('Administrateur');

    choisirRole(racine, 'PRODUCTEUR');
    fixture.detectChanges();
    expect(racine.querySelector('#inscription-filiere')).not.toBeNull();

    choisirRole(racine, 'ACHETEUR');
    fixture.detectChanges();
    expect(racine.querySelector('#inscription-type-acheteur')).not.toBeNull();
    expect(racine.querySelector('#inscription-filiere')).toBeNull();
  });

  it('signale tous les champs obligatoires d’un formulaire vide', () => {
    const fixture = creer();

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual([
      'Ce champ est obligatoire.',
      'Ce champ est obligatoire.',
      'Ce champ est obligatoire.',
      'Ce champ est obligatoire.',
      'Ce champ est obligatoire.',
      'Ce champ est obligatoire.',
    ]);
    expect(routeur.navigate).not.toHaveBeenCalled();
  });

  it('signale un email invalide', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture, { email: 'pas-une-adresse' });
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual(["Format d'adresse email invalide."]);
  });

  it('refuse un domaine sans extension, que le backend accepterait pourtant', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture, { email: 'moussa.ndiaye@exemple' });
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual([
      'Il manque l’extension du domaine, par exemple prenom@exemple.sn.',
    ]);
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('signale un mot de passe de moins de six caractères', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture, { motDePasse: 'court' });
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual([
      'Le mot de passe doit contenir au moins 6 caractères.',
    ]);
  });

  it('exige la filière d’un producteur et jamais le type d’acheteur', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture);

    expect(fixture.nativeElement.querySelector('#inscription-filiere')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#inscription-type-acheteur')).toBeNull();

    soumettre(fixture);

    expect(erreurs(fixture)).toEqual(['Ce champ est obligatoire.']);
    expect(routeur.navigate).not.toHaveBeenCalled();
  });

  it('envoie une inscription producteur conforme au contrat puis redirige', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture);
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);

    const requete = http.expectOne(`${API}/auth/inscription`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({
      nom: 'Ndiaye',
      prenom: 'Moussa',
      email: 'moussa.ndiaye@example.sn',
      telephone: '771234567',
      motDePasse: 'secret1',
      role: 'PRODUCTEUR',
      filiere: 'MARAICHAGE',
    });

    requete.flush(REPONSE);
    fixture.detectChanges();

    expect(routeur.navigate).toHaveBeenCalledWith(['/tableau-de-bord'], {
      queryParams: { compteCree: '1' },
    });
    expect(localStorage.getItem(CLE_JETON)).toBe('jeton-de-test');
  });

  it('envoie une inscription acheteur avec son type et sans filière', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'ACHETEUR');
    remplirIdentite(fixture);

    expect(fixture.nativeElement.querySelector('#inscription-type-acheteur')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#inscription-filiere')).toBeNull();

    choisirOption(fixture.nativeElement, '#inscription-type-acheteur', 'Restaurateur');
    soumettre(fixture);

    const requete = http.expectOne(`${API}/auth/inscription`);
    expect(requete.request.body).toEqual({
      nom: 'Ndiaye',
      prenom: 'Moussa',
      email: 'moussa.ndiaye@example.sn',
      telephone: '771234567',
      motDePasse: 'secret1',
      role: 'ACHETEUR',
      typeAcheteur: 'RESTAURATEUR',
    });

    requete.flush({ ...REPONSE, role: 'ACHETEUR' as const });
  });

  it('affiche les erreurs de validation renvoyées par le backend', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture);
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);

    http
      .expectOne(`${API}/auth/inscription`)
      .flush(
        {
          statut: 400,
          message: 'Données invalides.',
          erreurs: { email: 'Cette adresse email est déjà utilisée.' },
          timestamp: '2026-01-01T10:00:00',
        },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(element<HTMLElement>(fixture.nativeElement, '#inscription-email-erreur').textContent).toContain(
      'Cette adresse email est déjà utilisée.',
    );
    expect(fixture.nativeElement.querySelector('.message--erreur')).toBeNull();
  });

  it('porte un titre h1 unique et un seul formulaire', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    const titres = Array.from(racine.querySelectorAll<HTMLElement>('h1'));
    expect(titres).toHaveLength(1);
    expect((titres[0].textContent ?? '').trim()).toBe('Créer un compte');
    expect(racine.querySelectorAll('form')).toHaveLength(1);
  });

  it('place le formulaire sous le même parent que le titre', () => {
    const fixture = creer();
    const racine = fixture.nativeElement as HTMLElement;

    expect(element(racine, 'form').parentElement).toBe(element(racine, 'h1').parentElement);
  });

  it('place la bannière d’erreur générale sous le même parent que le formulaire', () => {
    const fixture = creer();
    choisirRole(fixture.nativeElement, 'PRODUCTEUR');
    remplirIdentite(fixture);
    choisirOption(fixture.nativeElement, '#inscription-filiere', 'Maraîchage');

    soumettre(fixture);
    http
      .expectOne(`${API}/auth/inscription`)
      .flush(
        { statut: 500, message: 'Le serveur n’a pas répondu.', timestamp: '2026-01-01T10:00:00' },
        { status: 500, statusText: 'Internal Server Error' },
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
