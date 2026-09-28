import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page 403 : un refus d'accès n'entraîne jamais de déconnexion automatique
 * (FRONTEND_DESIGN.md §19) ; l'utilisateur reste connecté sur son propre espace.
 */
@Component({
  selector: 'app-acces-interdit',
  imports: [RouterLink],
  templateUrl: './acces-interdit.html',
})
export class AccesInterdit {}
