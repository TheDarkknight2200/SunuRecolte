import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE } from '../../core/modeles/referentiels';
import { RecolteService } from '../../core/services/recolte.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';

/** Page publique : présentation du projet et catalogue réel (GET /api/recoltes). */
@Component({
  selector: 'app-accueil',
  imports: [RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  private readonly recoltes = inject(RecolteService);

  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly liste = signal<RecolteResponse[]>([]);

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.recoltes.lister().subscribe({
      next: (recoltes) => {
        this.liste.set(recoltes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, "Le catalogue n'a pas pu être chargé."));
        this.chargement.set(false);
      },
    });
  }

  protected libelleStatut(recolte: RecolteResponse): string {
    return LIBELLES_STATUT_RECOLTE[recolte.statut];
  }

  protected formaterMontant(valeur: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(valeur);
  }

  /** Reformatage d'une date « AAAA-MM-JJ » sans passer par Date (aucun décalage de fuseau). */
  protected formaterDate(valeur: string): string {
    const [annee, mois, jour] = valeur.split('-');
    return annee && mois && jour ? `${jour}/${mois}/${annee}` : valeur;
  }
}
