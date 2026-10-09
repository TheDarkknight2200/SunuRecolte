import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { EspaceAdmin } from './espace-admin';

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

// B5 : la protection de la table de routes est vérifiée dans `src/app/routes-admin.spec.ts`,
// un fichier qui n'importe et ne monte aucun composant.
describe('EspaceAdmin', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EspaceAdmin>;
  let racine: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EspaceAdmin);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('donne une entrée par domaine administré, et aucune valeur chiffrée', () => {
    expect(texteDe(element(racine, 'h1'))).toBe('Administration');
    expect(elements<HTMLElement>(racine, '.espace-admin__carte .carte__titre').map(texteDe)).toEqual([
      'Utilisateurs',
      'Récoltes',
      'Prix indicatifs',
      'Statistiques',
    ]);
  });

  it('ne charge aucune donnée à l’ouverture : l’accueil reste une page d’entrées', () => {
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('n’affiche aucun graphique, aucun tableau de chiffres ni pourcentage inventé', () => {
    expect(racine.querySelector('canvas, svg, table, meter, progress')).toBeNull();
    expect(texteDe(racine)).not.toMatch(/\d+\s?%/);
    expect(texteDe(racine)).not.toMatch(/\d+ (producteurs|commandes|récoltes) publi/);
  });

  it('relie chaque carte à sa route d’administration', () => {
    const liens = elements<HTMLAnchorElement>(racine, '.espace-admin__carte a');
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual([
      '/admin/utilisateurs',
      '/admin/recoltes',
      '/admin/prix-marche',
      '/admin/statistiques',
    ]);
    expect(liens.map(texteDe)).toEqual([
      'Gérer les utilisateurs',
      'Modérer les récoltes',
      'Gérer les prix indicatifs',
      'Voir les statistiques',
    ]);
  });

  it('offre l’accès aux notifications, seules données transverses de l’ADMIN', () => {
    const lien = element<HTMLAnchorElement>(racine, '#lien-admin-notifications');
    expect(lien.getAttribute('href')).toBe('/notifications');
    expect(texteDe(lien)).toBe('Notifications');
  });

  it('nomme le rôle et la portée de l’écran sans promettre une capacité absente', () => {
    const texte = texteDe(racine);
    expect(texte).toContain('Espace administrateur');
    expect(texte).toContain('les comptes, les récoltes publiées et les prix indicatifs de marché');
    expect(texte).not.toContain('Valider');
    expect(texte).not.toContain('export');
  });
});
