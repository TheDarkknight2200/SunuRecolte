import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  UrlSegment,
  UrlTree,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { SessionUtilisateur } from '../modeles/auth.modeles';
import { Role } from '../modeles/referentiels';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../services/auth.service';
import { roleGuard } from './role.guard';

const SESSION: SessionUtilisateur = {
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

function routeAvecRoles(roles?: readonly Role[]): ActivatedRouteSnapshot {
  return { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
}

/** Route visée par l'UrlTree retourné par un guard. */
function cible(resultat: unknown): string {
  if (resultat instanceof UrlTree) {
    const segments = resultat.root.children['primary']?.segments ?? [];
    return `/${segments.map((segment: UrlSegment) => segment.path).join('/')}`;
  }
  return resultat === true ? 'autorise' : 'refus-inattendu';
}

describe('roleGuard', () => {
  function preparer(role?: Role): void {
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_JETON, fabriquerJeton(Math.floor(Date.now() / 1000) + 3600));
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify({ ...SESSION, role }));
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    });
  }

  function executer(route: ActivatedRouteSnapshot): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => roleGuard(route, {} as never)) as boolean | UrlTree;
  }

  afterEach(() => localStorage.clear());

  it('laisse passer le rôle autorisé', () => {
    preparer('PRODUCTEUR');

    expect(executer(routeAvecRoles(['PRODUCTEUR']))).toBe(true);
  });

  it('refuse un rôle non autorisé sans déconnecter l’utilisateur', () => {
    preparer('ACHETEUR');

    const resultat = executer(routeAvecRoles(['PRODUCTEUR']));

    expect(cible(resultat)).toBe('/acces-interdit');
    expect(TestBed.inject(AuthService).estConnecte()).toBe(true);
  });

  it('refuse l’absence de session', () => {
    preparer();

    expect(cible(executer(routeAvecRoles(['PRODUCTEUR'])))).toBe('/acces-interdit');
  });

  it('refuse une route sans rôle déclaré', () => {
    preparer('PRODUCTEUR');

    expect(cible(executer(routeAvecRoles()))).toBe('/acces-interdit');
  });
});
