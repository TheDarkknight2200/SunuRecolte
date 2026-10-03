import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { AccesInterdit } from './acces-interdit';

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

describe('AccesInterdit (page 403)', () => {
  let fixture: ComponentFixture<AccesInterdit>;
  let racine: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    });
    fixture = TestBed.createComponent(AccesInterdit);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  });

  it('porte un titre h1 unique « Accès refusé »', () => {
    const titres = elements(racine, 'h1');
    expect(titres).toHaveLength(1);
    expect(texteDe(titres[0])).toBe('Accès refusé');
  });

  it('annonce que la session est conservée', () => {
    expect(texteDe(element(racine, '.etat__texte'))).toContain('Vous restez connecté.');
  });

  it('propose les deux liens de sortie', () => {
    const liens = elements<HTMLAnchorElement>(racine, '.page-interieure__actions a');
    expect(liens.map((lien) => lien.getAttribute('href'))).toEqual(['/tableau-de-bord', '/']);
  });

  it('masque l’icône décorative à la lecture d’écran', () => {
    expect(element(racine, '.etat__icone').getAttribute('aria-hidden')).toBe('true');
  });

  it('place l’état sous le même parent que le titre', () => {
    expect(element(racine, '.etat').parentElement).toBe(element(racine, 'h1').parentElement);
  });

  it('centre son contenu dans le conteneur unique de la section', () => {
    const section = element<HTMLElement>(racine, '.page-interieure');
    expect(section.children).toHaveLength(1);
    const conteneur = element<HTMLElement>(racine, '.conteneur');
    expect(conteneur.parentElement).toBe(section);
    expect(element(racine, 'h1').parentElement).toBe(conteneur);
  });
});
