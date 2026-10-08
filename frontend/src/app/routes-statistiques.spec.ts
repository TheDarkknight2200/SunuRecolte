import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * LOT STAT-1 : la protection de `/producteur/statistiques` est vérifiée sur la table réelle.
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

describe('route des statistiques producteur', () => {
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
});
