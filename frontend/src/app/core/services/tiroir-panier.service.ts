import { Injectable, signal } from '@angular/core';

/**
 * État d'ouverture du panier latéral. Purement visuel : le contenu du panier reste celui
 * de `PanierService`, et la commande est toujours calculée et validée par le serveur.
 */
@Injectable({ providedIn: 'root' })
export class TiroirPanierService {
  private readonly etatOuvert = signal(false);

  readonly ouvert = this.etatOuvert.asReadonly();

  ouvrir(): void {
    this.etatOuvert.set(true);
  }

  fermer(): void {
    this.etatOuvert.set(false);
  }
}
