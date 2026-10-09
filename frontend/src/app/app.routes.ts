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
    path: 'recoltes',
    title: 'SunuRecolte — Catalogue',
    loadComponent: () =>
      import('./features/catalogue/catalogue').then((m) => m.Catalogue),
  },
  {
    path: 'recoltes/:id',
    title: 'SunuRecolte — Détail de la récolte',
    loadComponent: () =>
      import('./features/catalogue/detail-recolte').then((m) => m.DetailRecolte),
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
    // Écran transverse : le backend écrit des notifications pour un producteur comme pour un
    // acheteur, et l'ADMIN y a accès. `authGuard` seul, aucun `roleGuard` (FRONTEND_DESIGN.md §29).
    path: 'notifications',
    title: 'SunuRecolte — Notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications').then((m) => m.Notifications),
  },
  {
    path: 'producteur',
    pathMatch: 'full',
    redirectTo: 'producteur/recoltes',
  },
  {
    path: 'producteur/recoltes',
    title: 'SunuRecolte — Mes récoltes',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/mes-recoltes/mes-recoltes').then((m) => m.MesRecoltes),
  },
  {
    path: 'producteur/recoltes/nouvelle',
    title: 'SunuRecolte — Publier une récolte',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/formulaire-recolte/formulaire-recolte').then(
        (m) => m.FormulaireRecolte,
      ),
  },
  {
    path: 'producteur/recoltes/:id/modifier',
    title: 'SunuRecolte — Modifier la récolte',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/formulaire-recolte/formulaire-recolte').then(
        (m) => m.FormulaireRecolte,
      ),
  },
  {
    // Le backend n'admet CONFIRMEE / PRETE / LIVREE que de la part d'un producteur concerné
    // (CommandeService.verifierDroitDeChangerStatut) : écran séparé des écrans acheteur (§35).
    path: 'producteur/commandes',
    title: 'SunuRecolte — Commandes reçues',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/commandes-recues/commandes-recues').then(
        (m) => m.CommandesRecues,
      ),
  },
  {
    // GET /api/producteurs/moi puis PUT /api/producteurs/{id} : aucun autre endpoint,
    // l'identité du compte restant en lecture seule (FRONTEND_DESIGN.md §36).
    path: 'producteur/profil',
    title: 'SunuRecolte — Profil',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/profil/profil-producteur').then((m) => m.ProfilProducteur),
  },
  {
    // GET /api/producteurs/moi/statistiques : le producteur est déduit du jeton par le backend,
    // l'écran n'envoie aucun identifiant (LOT STAT-1).
    path: 'producteur/statistiques',
    title: 'SunuRecolte — Statistiques de vente',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PRODUCTEUR'] },
    loadComponent: () =>
      import('./features/producteur/statistiques/statistiques').then((m) => m.Statistiques),
  },
  {
    path: 'acheteur',
    pathMatch: 'full',
    redirectTo: 'acheteur/commandes',
  },
  {
    path: 'acheteur/commandes',
    title: 'SunuRecolte — Mes commandes',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () =>
      import('./features/acheteur/commandes/commandes').then((m) => m.Commandes),
  },
  {
    path: 'acheteur/commandes/:id',
    title: 'SunuRecolte — Détail de la commande',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () =>
      import('./features/acheteur/detail-commande/detail-commande').then((m) => m.DetailCommande),
  },
  {
    // Le paiement se fait depuis une commande déjà créée : l'identifiant dans l'URL
    // n'est jamais une autorisation, le serveur vérifie le propriétaire (403).
    path: 'acheteur/paiement/:id',
    title: 'SunuRecolte — Paiement simulé',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () =>
      import('./features/acheteur/paiement/paiement').then((m) => m.Paiement),
  },
  {
    path: 'acheteur/panier',
    title: 'SunuRecolte — Panier',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () => import('./features/acheteur/panier/panier').then((m) => m.Panier),
  },
  {
    path: 'acheteur/commande',
    title: 'SunuRecolte — Commande',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ACHETEUR'] },
    loadComponent: () =>
      import('./features/acheteur/commande/commande').then((m) => m.Commande),
  },
  {
    path: 'admin',
    title: 'SunuRecolte — Espace administrateur',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/espace-admin').then((m) => m.EspaceAdmin),
  },
  {
    // GET /api/utilisateurs + PATCH /api/utilisateurs/{id}/actif : aucun endpoint « moi »,
    // l'administration porte toujours sur un compte désigné par son identifiant (B5).
    path: 'admin/utilisateurs',
    title: 'SunuRecolte — Utilisateurs',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/utilisateurs/utilisateurs').then((m) => m.Utilisateurs),
  },
  {
    // GET /api/recoltes (public) + PATCH /api/recoltes/{id}/statut (ADMIN) : la modération
    // de statut ne passe jamais par /api/recoltes/mes-recoltes, propriété d'un producteur.
    path: 'admin/recoltes',
    title: 'SunuRecolte — Récoltes',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/recoltes-admin/recoltes-admin').then((m) => m.RecoltesAdmin),
  },
  {
    // Les quatre opérations du contrat prix-marché : GET public, POST/PUT/DELETE réservés
    // à l'ADMIN, sur un même écran.
    path: 'admin/prix-marche',
    title: 'SunuRecolte — Prix indicatifs',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/prix-marche/prix-marche').then((m) => m.PrixMarche),
  },
  {
    // GET /api/admin/statistiques : premier endpoint de ce préfixe, et le seul écran de
    // comptage transverse. L'ADMIN n'est pas déduit d'un « moi » : c'est le rôle du jeton,
    // revérifié en base par le backend, qui porte la portée des chiffres (LOT STAT-2).
    path: 'admin/statistiques',
    title: 'SunuRecolte — Statistiques de la plateforme',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/statistiques-admin/statistiques-admin').then(
        (m) => m.StatistiquesAdmin,
      ),
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
