import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnTete } from './partage/en-tete/en-tete';
import { PanierTiroir } from './partage/panier-tiroir/panier-tiroir';
import { PiedDePage } from './partage/pied-de-page/pied-de-page';
import { Toast } from './partage/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnTete, PiedDePage, PanierTiroir, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
