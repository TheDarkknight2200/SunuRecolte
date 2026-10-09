import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Bandeau d'onglets entre les quatre routes sœurs de l'administration
 * (`FRONTEND_DESIGN.md` §10.5 et §38.3).
 *
 * Le composant est **purement présentation et navigation** : il n'appelle aucun service, ne
 * connaît aucun DTO et ne porte aucune logique d'autorisation — `authGuard` et `roleGuard`
 * des routes restent la seule source de vérité (§19). Les routes ne sont pas fusionnées :
 * chaque onglet est un lien, et le bouton du navigateur reste seul arbitre de la page affichée.
 *
 * Il n'est posé que sur les quatre écrans administrés, jamais sur `/admin` : la page d'entrée
 * est déjà la liste des entrées (§37), et un onglet sans destination active n'apporterait
 * qu'un filet de plus.
 */
@Component({
  selector: 'app-admin-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-navigation.html',
  styleUrl: './admin-navigation.scss',
})
export class AdminNavigation {}
