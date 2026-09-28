import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('monte la coquille de l’application : lien d’évitement, en-tête et pied de page', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const racine = fixture.nativeElement as HTMLElement;

    expect(racine.querySelector('.lien-evitement')?.textContent).toContain('Aller au contenu');
    expect(racine.querySelector('main#contenu')).not.toBeNull();
    expect(racine.querySelector('app-en-tete')).not.toBeNull();
    expect(racine.querySelector('app-pied-de-page')).not.toBeNull();
  });

  it('affiche l’en-tête visiteur quand aucune session n’est ouverte', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const racine = fixture.nativeElement as HTMLElement;

    expect(racine.querySelector('.entete__marque')?.textContent).toContain('SunuRecolte');
    expect(racine.querySelector('.entete__navigation')?.textContent).toContain('Créer un compte');
    expect(racine.querySelector('.entete__identite')).toBeNull();
  });
});
