import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { SessionUtilisateur } from '../../core/modeles/auth.modeles';
import { Role } from '../../core/modeles/referentiels';
import { CLE_UTILISATEUR } from '../../core/services/auth.service';
import { CLE_PANIER, LignePanier, PanierService } from '../../core/services/panier.service';
import { EnTete } from './en-tete';

function session(role: Role): SessionUtilisateur {
  return {
    utilisateurId: 9,
    nom: 'Fall',
    prenom: 'Moussa',
    email: 'moussa.fall@example.sn',
    role,
  };
}

/** Ligne valide telle qu'elle serait relue depuis `localStorage` par le service. */
function ligne(recolteId: number): LignePanier {
  return {
    recolteId,
    quantite: 10,
    produit: `Récolte ${recolteId}`,
    prixUnitaire: 12500,
    unite: 'kg',
    nomProducteur: 'Diop',
    quantiteDisponible: 500,
    statut: 'DISPONIBLE',
  };
}

function lignes(count: number): LignePanier[] {
  return Array.from({ length: count }, (_, index) => ligne(index + 1));
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

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Les glyphes Material Symbols sont des points de code à usage privé : retirés avant comparaison. */
function sansIcone(valeur: string): string {
  return valeur
    .replace(/[\u{E000}-\u{F8FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('EnTete — indicateur de panier', () => {
  let fixture: ComponentFixture<EnTete>;
  let racine: HTMLElement;

  /** La session et le panier sont lus au démarrage des services : ils sont posés avant le rendu. */
  function ouvrir(role?: Role, contenu: readonly LignePanier[] = []): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session(role)));
    }
    if (contenu.length > 0) {
      localStorage.setItem(CLE_PANIER, JSON.stringify(contenu));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(EnTete);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => localStorage.clear());

  it('compte les lignes du panier d’un acheteur, en direct', () => {
    ouvrir('ACHETEUR', [ligne(1)]);

    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('1');

    TestBed.inject(PanierService).retirer(1);
    fixture.detectChanges();
    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('0');
  });

  it('n’affiche aucun indicateur pour un producteur, un administrateur ou une visite anonyme', () => {
    ouvrir('ACHETEUR', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).not.toBeNull();

    ouvrir('PRODUCTEUR', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();

    ouvrir('ADMIN', [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();

    ouvrir(undefined, [ligne(1)]);
    expect(racine.querySelector('.entete__panier')).toBeNull();
  });

  /**
   * Le lien « Mes commandes » est l'entrée de la consultation des commandes : il ne
   * doit apparaître que pour un acheteur, et mener à la liste réelle et non à un
   * espace vide.
   */
  it('ne propose « Mes commandes » qu’à un acheteur, vers la liste de ses commandes', () => {
    const liensEspace = () =>
      elements<HTMLAnchorElement>(racine, '.entete__navigation a')
        .map((lien) => ({
          libelle: sansIcone(texteDe(lien)),
          href: lien.getAttribute('href'),
        }))
        .filter((lien) => lien.libelle === 'Mes commandes');

    ouvrir('ACHETEUR');
    expect(liensEspace()).toEqual([{ libelle: 'Mes commandes', href: '/acheteur/commandes' }]);

    ouvrir('PRODUCTEUR');
    expect(liensEspace()).toEqual([]);

    ouvrir('ADMIN');
    expect(liensEspace()).toEqual([]);

    ouvrir();
    expect(liensEspace()).toEqual([]);
  });

  it('plafonne le compteur à 99+ et relie le panier à sa page', () => {
    ouvrir('ACHETEUR', lignes(100));

    const lien = element<HTMLAnchorElement>(racine, '.entete__panier');
    expect(lien.tagName).toBe('A');
    expect(lien.getAttribute('href')).toBe('/acheteur/panier');
    expect(texteDe(lien)).toContain('Panier');
    expect(texteDe(element(racine, '.entete__panier-compteur'))).toBe('99+');

    const liens = elements<HTMLAnchorElement>(racine, '.entete__navigation a').map((lien) =>
      sansIcone(texteDe(lien)),
    );
    expect(liens).toEqual(['Catalogue', 'Tableau de bord', 'Mes commandes', 'Panier 99+']);
  });

  it('garde le compteur dans un badge non cliquable (§10.7)', () => {
    ouvrir('ACHETEUR', [ligne(1)]);

    const compteur = element(racine, '.entete__panier-compteur');
    expect(compteur.tagName).toBe('SPAN');
    expect(compteur.getAttribute('href')).toBeNull();
    expect(racine.querySelector('a.badge')).toBeNull();
  });
});
