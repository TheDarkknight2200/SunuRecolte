import { Component } from '@angular/core';

/** Pied de page unique de l'application (FRONTEND_DESIGN.md §10.5). */
@Component({
  selector: 'app-pied-de-page',
  templateUrl: './pied-de-page.html',
  styleUrl: './pied-de-page.scss',
})
export class PiedDePage {
  protected readonly annee = new Date().getFullYear();
}
