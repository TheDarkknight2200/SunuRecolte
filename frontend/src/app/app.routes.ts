import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * Routes de l'application.
 * Les espaces par rôle sont protégés par la chaîne authGuard puis roleGuard :
 * un seul système de gardes, aucune logique de sécurité dans les composants.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'SunuRecolte — Accueil',
    loadComponent: () => import('./features/accueil/accueil').then((m) => m.Accueil),
  },
  {
    path: 'connexion',
    title: 'SunuRecolte — Connexion',
    loadComponent: () => import('./features/auth/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'inscription',
    title: 'SunuRecolte — Inscription',
    loadComponent: () =>
      import('./features/auth/inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'tableau-de-bord',
    title: 'SunuRecolte — Tableau de bord',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tableau-de-bord/tableau-de-bord').then((m) => m.TableauDeBord),
  },
  {
    path: 'producteur',
    title: 'SunuRecolte — Espace producteur',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/espace-producteur').then((m) => m.EspaceProducteur),
  },
  {
    path: 'acheteur',
    title: 'SunuRecolte — Espace acheteur',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () => import('./features/acheteur/espace-acheteur').then((m) => m.EspaceAcheteur),
  },
  {
    path: 'admin',
    title: 'SunuRecolte — Espace administrateur',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/espace-admin').then((m) => m.EspaceAdmin),
  },
  {
    path: 'acces-interdit',
    title: 'SunuRecolte — Accès refusé',
    loadComponent: () => import('./features/erreurs/acces-interdit').then((m) => m.AccesInterdit),
  },
  {
    path: '**',
    title: 'SunuRecolte — Page introuvable',
    loadComponent: () =>
      import('./features/erreurs/page-introuvable').then((m) => m.PageIntrouvable),
  },
];
