import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { AdminNavigation } from './admin-navigation';

/** Sonde de test : une page administrée, sans aucun appel HTTP. */
@Component({ selector: 'app-sonde-admin', template: '<p>Écran administré</p>' })
class SondeAdmin {}

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

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('AdminNavigation (bandeau d’onglets de l’administration)', () => {
  let fixture: ComponentFixture<AdminNavigation>;
  let racine: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'admin/utilisateurs', component: SondeAdmin },
            { path: 'admin/recoltes', component: SondeAdmin },
            { path: 'admin/prix-marche', component: SondeAdmin },
          ],
          withDisabledInitialNavigation(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminNavigation);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('propose exactement les trois routes administrées, sans en inventer une quatrième', () => {
    const liens = elements<HTMLAnchorElement>(racine, '.onglets__lien');

    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/admin/utilisateurs',
      '/admin/recoltes',
      '/admin/prix-marche',
    ]);
    expect(liens.map(texteDe)).toEqual(['Utilisateurs', 'Récoltes', 'Prix indicatifs']);
  });

  it('est une navigation nommée, et non une suite de boutons', () => {
    const bandeau = element<HTMLElement>(racine, 'nav');

    expect(bandeau.classList.contains('onglets')).toBe(true);
    expect(bandeau.getAttribute('aria-label')).toBe('Sections de l’administration');
    expect(racine.querySelector('button, form, input')).toBeNull();
  });

  it('n’émet aucune requête, avec ou sans session locale : il ne porte aucune autorisation', () => {
    expect(http.match(() => true)).toHaveLength(0);

    // Une session complète est écrite après le rendu : le bandeau ne doit réagir à rien.
    localStorage.setItem('sunurecolte.jeton', 'entete.charge.signature');
    localStorage.setItem(
      'sunurecolte.utilisateur',
      JSON.stringify({ utilisateurId: 1, nom: 'Sow', prenom: 'Fatou', email: 'a@b.sn', role: 'ADMIN' }),
    );
    fixture.detectChanges();

    expect(http.match(() => true)).toHaveLength(0);
    expect(elements(racine, '.onglets__lien')).toHaveLength(3);
  });

  it('n’active que l’onglet de la route réellement affichée', async () => {
    await TestBed.inject(Router).navigate(['/admin/recoltes']);
    fixture.detectChanges();

    expect(elements(racine, '.onglets__lien--actif')).toHaveLength(1);
    const actif = element<HTMLAnchorElement>(racine, '.onglets__lien--actif');
    expect(actif.getAttribute('href')).toBe('/admin/recoltes');
    expect(actif.getAttribute('aria-current')).toBe('page');
    expect(
      elements<HTMLAnchorElement>(racine, '.onglets__lien')
        .filter((lien) => lien !== actif)
        .every((lien) => lien.getAttribute('aria-current') === null),
    ).toBe(true);
  });

  it('déplace l’onglet actif quand la route change, sans jamais fusionner deux destinations', async () => {
    const routeur = TestBed.inject(Router);

    await routeur.navigate(['/admin/utilisateurs']);
    fixture.detectChanges();
    expect(element<HTMLAnchorElement>(racine, '.onglets__lien--actif').getAttribute('href')).toBe(
      '/admin/utilisateurs',
    );

    await routeur.navigate(['/admin/prix-marche']);
    fixture.detectChanges();
    expect(elements(racine, '.onglets__lien--actif')).toHaveLength(1);
    expect(element<HTMLAnchorElement>(racine, '.onglets__lien--actif').getAttribute('href')).toBe(
      '/admin/prix-marche',
    );
  });
});
