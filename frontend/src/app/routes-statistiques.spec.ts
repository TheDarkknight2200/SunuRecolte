import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * LOT STAT-1 et LOT STAT-2 : la protection des deux routes de statistiques est vérifiée sur la
 * table réelle.
 *
 * Comme pour `routes-admin.spec.ts`, ce fichier ne monte aucun composant et n'invoque jamais
 * `loadComponent()` : un appel réel dans une spec casse le rendu `@if` / `@for` des autres
 * fichiers de la suite Vitest.
 */
interface RouteProtegee {
  canActivate?: unknown[];
  data?: { roles?: string[] };
  title?: string;
  loadComponent?: unknown;
}

function route(path: string): RouteProtegee {
  const trouvee = routes.find((entree) => entree.path === path);
  if (!trouvee) {
    throw new Error(`Route introuvable : ${path}`);
  }
  return trouvee as unknown as RouteProtegee;
}

describe('routes des deux écrans de statistiques', () => {
  it('exige authGuard puis roleGuard, réservés au seul rôle PRODUCTEUR', () => {
    const protegee = route('producteur/statistiques');

    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(protegee.title).toBe('SunuRecolte — Statistiques de vente');
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('n’ouvre la route à un second rôle, ni acheteur ni administrateur', () => {
    expect(route('producteur/statistiques').data).toEqual({ roles: ['PRODUCTEUR'] });
  });

  it('réserve l’écran de la plateforme au seul rôle ADMIN, sur le même modèle', () => {
    const protegee = route('admin/statistiques');

    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['ADMIN'] });
    expect(protegee.title).toBe('SunuRecolte — Statistiques de la plateforme');
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('ne fait jamais croiser les deux écrans : chacun n’accepte qu’un rôle', () => {
    expect(route('producteur/statistiques').data).toEqual({ roles: ['PRODUCTEUR'] });
    expect(route('admin/statistiques').data).toEqual({ roles: ['ADMIN'] });
  });
});
