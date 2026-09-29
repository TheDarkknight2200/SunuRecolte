import { Role } from '../modeles/referentiels';

/**
 * Espace de travail associé à un rôle. Les routes correspondantes sont
 * protégées côté Angular (authGuard + roleGuard) et côté API (403).
 */
export function espaceParRole(role: Role): string {
  switch (role) {
    case 'PRODUCTEUR':
      return '/producteur';
    case 'ACHETEUR':
      return '/acheteur/commandes';
    case 'ADMIN':
      return '/admin';
  }
}
