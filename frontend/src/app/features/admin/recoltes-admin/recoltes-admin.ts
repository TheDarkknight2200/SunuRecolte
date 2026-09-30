import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { LIBELLES_STATUT_RECOLTE, StatutRecolte } from '../../../core/modeles/referentiels';
import { RecolteService } from '../../../core/services/recolte.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  formaterDate,
  formaterDateHeure,
  formaterMontant,
  formaterQuantite,
} from '../../../core/utilitaires/formatage';
import { AdminNavigation } from '../../../partage/admin-navigation/admin-navigation';

/**
 * Le domaine ne connaît que deux statuts de récolte (`ck_recoltes_statut` en base) : la
 * modération est donc un aller-retour entre les deux, jamais un sens unique. Aucun statut de
 * retrait ou de validation n'existe dans le modèle approuvé.
 */
const AUTRE_STATUT: Record<StatutRecolte, { statut: StatutRecolte; libelle: string }> = {
  DISPONIBLE: { statut: 'EPUISEE', libelle: 'Marquer comme épuisée' },
  EPUISEE: { statut: 'DISPONIBLE', libelle: 'Marquer comme disponible' },
};

/**
 * Récoltes de la plateforme vues de l'administration (GET /api/recoltes).
 *
 * La consultation est publique côté backend : cet écran n'ajoute aucune donnée, il reprend la
 * liste complète — y compris les récoltes épuisées que le catalogue laisse aussi paraître — et
 * n'offre que la modération de statut (PATCH /api/recoltes/{id}/statut), réservée à l'ADMIN.
 * Le contenu d'une récolte reste la propriété du producteur : ni création, ni modification, ni
 * suppression ici. Le statut rendu après un `PATCH` est celui renvoyé par le serveur, et le
 * bouton de la ligne traitée garde le focus : il ne disparaît jamais, les deux statuts restant
 * accessibles l'un depuis l'autre.
 */
@Component({
  selector: 'app-admin-recoltes',
  imports: [RouterLink, AdminNavigation],
  templateUrl: './recoltes-admin.html',
  styleUrl: './recoltes-admin.scss',
})
export class RecoltesAdmin {
  private readonly recoltes = inject(RecolteService);
  private readonly document = inject(DOCUMENT);
  private readonly rendu = inject(ChangeDetectorRef);

  protected readonly liste = signal<RecolteResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** Identifiant de la récolte dont le `PATCH` est en vol : une seule requête à la fois. */
  protected readonly enCours = signal<number | null>(null);
  protected readonly succes = signal<{ id: number; message: string } | null>(null);
  protected readonly refus = signal<{ id: number; message: string } | null>(null);

  protected readonly formaterDate = formaterDate;
  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.succes.set(null);
    this.refus.set(null);

    this.recoltes.lister().subscribe({
      next: (recoltes) => {
        this.liste.set(recoltes);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.liste.set([]);
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger les récoltes.'));
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected actionDe(recolte: RecolteResponse): { statut: StatutRecolte; libelle: string } {
    return AUTRE_STATUT[recolte.statut];
  }

  protected libelleStatut(statut: StatutRecolte): string {
    return LIBELLES_STATUT_RECOLTE[statut];
  }

  /** Le libellé reste affiché à côté : la couleur ne porte jamais le sens seule (§27). */
  protected classesStatut(statut: StatutRecolte): string {
    return statut === 'DISPONIBLE' ? 'badge badge--succes' : 'badge badge--erreur';
  }

  protected modifierStatut(recolte: RecolteResponse): void {
    const action = this.actionDe(recolte);
    if (this.enCours() !== null) {
      return;
    }

    this.enCours.set(recolte.id);
    this.succes.set(null);
    this.refus.set(null);

    this.recoltes.changerStatut(recolte.id, action.statut).subscribe({
      next: (reponse) => {
        this.liste.update((liste) =>
          liste.map((element) => (element.id === reponse.id ? reponse : element)),
        );
        this.enCours.set(null);
        this.succes.set({
          id: reponse.id,
          message: `« ${reponse.produit} » est désormais ${this.libelleStatut(reponse.statut).toLowerCase()}.`,
        });
        this.rendreLeFocusAuBouton(reponse.id);
      },
      error: (erreur: unknown) => {
        // Échec : la ligne garde le statut affiché, c'est le serveur qui a le dernier mot.
        this.enCours.set(null);
        this.refus.set({
          id: recolte.id,
          message: messageErreurApi(
            erreur,
            `Le statut de « ${recolte.produit} » n’a pas pu être mis à jour.`,
          ),
        });
        this.rendreLeFocusAuBouton(recolte.id);
      },
    });
  }

  /**
   * Le bouton traité est `disabled` pendant le vol et le navigateur rend alors le focus au
   * `body`. Le bouton de cette ligne revivant après la réponse, le focus lui est rendu : la
   * navigation clavier reprend à la ligne traitée au lieu de repartir du haut de page (§37.1).
   */
  private rendreLeFocusAuBouton(id: number): void {
    this.rendu.detectChanges();
    if (this.document.activeElement !== this.document.body) {
      return;
    }
    this.document.getElementById(`statut-${id}`)?.focus();
  }

  protected succesPour(recolte: RecolteResponse): string | null {
    const succes = this.succes();
    return succes !== null && succes.id === recolte.id ? succes.message : null;
  }

  protected refusPour(recolte: RecolteResponse): string | null {
    const refus = this.refus();
    return refus !== null && refus.id === recolte.id ? refus.message : null;
  }

  protected enCoursPour(recolte: RecolteResponse): boolean {
    return this.enCours() === recolte.id;
  }

  protected lienFiche(recolte: RecolteResponse): string[] {
    return ['/recoltes', String(recolte.id)];
  }

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

  protected denombrement(): string {
    const total = this.liste().length;
    return total === 1 ? '1 récolte publiée' : `${total} récoltes publiées`;
  }
}
