import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { Role } from '../modeles/referentiels';
import { SessionUtilisateur } from '../modeles/auth.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../services/auth.service';
import { authGuard } from './auth.guard';

const ROUTE = {} as unknown as ActivatedRouteSnapshot;
const ETAT = { url: '/tableau-de-bord' } as unknown as RouterStateSnapshot;

const SESSION_PRODUCTEUR: SessionUtilisateur = {
  utilisateurId: 7,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

function fabriquerJeton(expirationSecondes: number): string {
  const charge = { sub: '7', exp: expirationSecondes };
  const base64 = btoa(JSON.stringify(charge))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

/** Route visée par l'UrlTree retourné par un guard. */
function cible(resultat: unknown): string {
  if (resultat instanceof UrlTree) {
    const segments = resultat.root.children['primary']?.segments ?? [];
    return `/${segments.map((segment: UrlSegment) => segment.path).join('/')}`;
  }
  return resultat === true ? 'autorise' : 'refus-inattendu';
}

describe('authGuard', () => {
  function preparer(session?: { role: Role; expiration: number }): void {
    localStorage.clear();
    if (session) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(session.expiration));
      localStorage.setItem(
        CLE_UTILISATEUR,
        JSON.stringify({ ...SESSION_PRODUCTEUR, role: session.role }),
      );
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    });
  }

  function executer(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard(ROUTE, ETAT)) as boolean | UrlTree;
  }

  afterEach(() => localStorage.clear());

  it('laisse passer une session valide', () => {
    preparer({ role: 'PRODUCTEUR', expiration: dansUneHeure() });

    expect(executer()).toBe(true);
  });

  it('redirige vers la connexion sans session, en mémorisant la cible', () => {
    preparer();

    const resultat = executer();

    expect(cible(resultat)).toBe('/connexion');
    expect((resultat as UrlTree).queryParams).toEqual({ retour: '/tableau-de-bord' });
  });

  it('refuse un jeton expiré et purge la session locale', () => {
    preparer({ role: 'PRODUCTEUR', expiration: Math.floor(Date.now() / 1000) - 60 });

    const resultat = executer();

    expect(cible(resultat)).toBe('/connexion');
    expect(TestBed.inject(AuthService).estConnecte()).toBe(false);
    expect(localStorage.getItem(CLE_JETON)).toBeNull();
  });
});
