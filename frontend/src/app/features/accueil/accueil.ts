import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE } from '../../core/modeles/referentiels';
import { RecolteService } from '../../core/services/recolte.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { formaterDate, formaterMontant, formaterQuantite } from '../../core/utilitaires/formatage';

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

  // Les formats sont ceux de toute l'interface (core/utilitaires/formatage).
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;
  protected readonly formaterDate = formaterDate;

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

  protected producteur(recolte: RecolteResponse): string {
    return recolte.localisationProducteur
      ? `${recolte.nomProducteur} — ${recolte.localisationProducteur}`
      : recolte.nomProducteur;
  }

  /** Ligne de disponibilité : une récolte peut n'avoir ni date ni lieu de retrait. */
  protected meta(recolte: RecolteResponse): string | null {
    const date = recolte.dateDisponibilite
      ? `Disponible à partir du ${formaterDate(recolte.dateDisponibilite)}`
      : null;
    const lieu = recolte.localisation;
    if (date && lieu) {
      return `${date} — ${lieu}`;
    }
    return date ?? lieu;
  }
}
