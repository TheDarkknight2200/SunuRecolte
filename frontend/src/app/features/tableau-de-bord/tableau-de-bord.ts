import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UtilisateurResponse } from '../../core/modeles/domaine.modeles';
import { LIBELLES_ROLE } from '../../core/modeles/referentiels';
import { AuthService } from '../../core/services/auth.service';
import { UtilisateurService } from '../../core/services/utilisateur.service';
import { messageErreurApi } from '../../core/utilitaires/erreurs-api';
import { espaceParRole } from '../../core/utilitaires/navigation';

/**
 * Tableau de bord commun : charge le profil réel de l'utilisateur connecté via
 * GET /api/utilisateurs/{id} (route protégée, propriétaire ou ADMIN).
 */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [RouterLink],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord {
  private readonly auth = inject(AuthService);
  private readonly utilisateurs = inject(UtilisateurService);
  private readonly route = inject(ActivatedRoute);

  protected readonly profil = signal<UtilisateurResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly compteCree = signal(this.route.snapshot.queryParamMap.has('compteCree'));

  constructor() {
    this.charger();
  }

  protected libelleRole(role: UtilisateurResponse['role']): string {
    return LIBELLES_ROLE[role];
  }

  protected lienEspace(profil: UtilisateurResponse): string {
    return espaceParRole(profil.role);
  }

  protected charger(): void {
    const session = this.auth.session();
    if (session === null) {
      this.chargement.set(false);
      this.erreur.set("Votre session n'est plus valide. Reconnectez-vous.");
      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);
    this.utilisateurs.findById(session.utilisateurId).subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, "Le profil n'a pas pu être chargé."));
        this.chargement.set(false);
      },
    });
  }
}
