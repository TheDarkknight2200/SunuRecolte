import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnTete } from './partage/en-tete/en-tete';
import { PanierTiroir } from './partage/panier-tiroir/panier-tiroir';
import { PiedDePage } from './partage/pied-de-page/pied-de-page';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnTete, PiedDePage, PanierTiroir],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
