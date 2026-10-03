import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { PageIntrouvable } from './page-introuvable';

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

describe('PageIntrouvable (page 404)', () => {
  let fixture: ComponentFixture<PageIntrouvable>;
  let racine: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    });
    fixture = TestBed.createComponent(PageIntrouvable);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  });

  it('porte un titre h1 unique « Page introuvable »', () => {
    const titres = elements(racine, 'h1');
    expect(titres).toHaveLength(1);
    expect(texteDe(titres[0])).toBe('Page introuvable');
  });

  it('affiche les deux libellés exacts de l\'état', () => {
    expect(texteDe(element(racine, '.etat__titre'))).toBe(
      'Cette adresse ne correspond à aucune page.',
    );
    expect(texteDe(element(racine, '.etat__texte'))).toBe(
      'Le lien est peut-être incomplet ou obsolète.',
    );
  });

  it('propose un seul lien, vers l\'accueil', () => {
    const liens = elements<HTMLAnchorElement>(racine, '.etat a');
    expect(liens).toHaveLength(1);
    expect(liens[0].getAttribute('href')).toBe('/');
    expect(texteDe(liens[0])).toBe("Retour à l'accueil");
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
