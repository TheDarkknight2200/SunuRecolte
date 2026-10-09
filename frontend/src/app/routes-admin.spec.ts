import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * B5 : la protection est vérifiée sur la table de routes réelle.
 *
 * Ce fichier n'importe et ne monte aucun composant, et `loadComponent` n'y est jamais invoqué :
 * les appels réels de `loadComponent()` dans une spec cassent le rendu `@if` / `@for` des autres
 * fichiers de la suite Vitest. La table de routes se lit ici comme une simple structure de données.
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

describe('table de routes de l’espace administrateur', () => {
  it.each([
    ['admin', 'SunuRecolte — Espace administrateur'],
    ['admin/utilisateurs', 'SunuRecolte — Utilisateurs'],
    ['admin/recoltes', 'SunuRecolte — Récoltes'],
    ['admin/prix-marche', 'SunuRecolte — Prix indicatifs'],
    ['admin/statistiques', 'SunuRecolte — Statistiques de la plateforme'],
  ])('%s exige authGuard puis roleGuard pour ADMIN', (chemin, titre) => {
    const protegee = route(chemin);
    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['ADMIN'] });
    expect(protegee.title).toBe(titre);
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('réserve ces cinq routes à ADMIN, sans rôle supplémentaire', () => {
    for (const chemin of [
      'admin',
      'admin/utilisateurs',
      'admin/recoltes',
      'admin/prix-marche',
      'admin/statistiques',
    ]) {
      expect(route(chemin).data).toEqual({ roles: ['ADMIN'] });
    }
  });

  it('ne laisse aucune route d’administration ouverte à un autre rôle', () => {
    const administrées = routes.filter((entree) => (entree.path ?? '').startsWith('admin'));
    expect(administrées.map((entree) => entree.path)).toEqual([
      'admin',
      'admin/utilisateurs',
      'admin/recoltes',
      'admin/prix-marche',
      'admin/statistiques',
    ]);
    for (const entree of administrées) {
      const protegee = entree as unknown as RouteProtegee;
      expect(protegee.data).toEqual({ roles: ['ADMIN'] });
    }
  });

  it('laisse le catalogue et les prix indicatifs publics sans garde', () => {
    for (const chemin of ['recoltes', 'recoltes/:id']) {
      const publique = route(chemin);
      expect(publique.canActivate).toBeUndefined();
      expect(publique.data).toBeUndefined();
    }
  });
});
