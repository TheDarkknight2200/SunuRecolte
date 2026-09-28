import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnTete } from './partage/en-tete/en-tete';
import { PiedDePage } from './partage/pied-de-page/pied-de-page';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnTete, PiedDePage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
