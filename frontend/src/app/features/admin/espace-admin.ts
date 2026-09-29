import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Accueil de l'espace administrateur : une entrée par domaine administré et rien de plus.
 *
 * Aucun chiffre, aucun graphique : le backend n'expose aucun endpoint de comptage ou de
 * statistique, et en inventer un affichage serait du faux contenu (FRONTEND_DESIGN.md §17).
 * Les données ne sont chargées que sur l'écran qui les administre.
 */
@Component({
  selector: 'app-espace-admin',
  imports: [RouterLink],
  templateUrl: './espace-admin.html',
  styleUrl: './espace-admin.scss',
})
export class EspaceAdmin {}
