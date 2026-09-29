import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Role } from '../../../core/modeles/referentiels';
import { AuthService } from '../../../core/services/auth.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { espaceParRole } from '../../../core/utilitaires/navigation';
import {
  MESSAGE_DOMAINE_INCOMPLET,
  domaineEmailComplet,
} from '../../../core/utilitaires/validation-email';

/** Connexion : POST /api/auth/connexion puis redirection selon le rôle renvoyé. */
@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.scss',
})
export class Connexion {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly routeur = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly formulaire = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, domaineEmailComplet, Validators.maxLength(150)],
    ],
    motDePasse: ['', [Validators.required]],
  });

  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly sessionExpiree = signal(
    this.route.snapshot.queryParamMap.has('sessionExpiree'),
  );

  protected invalide(nom: 'email' | 'motDePasse'): boolean {
    const controle = this.formulaire.controls[nom];
    return controle.invalid && controle.touched;
  }

  protected messageChamp(nom: 'email' | 'motDePasse'): string {
    const controle = this.formulaire.controls[nom];
    if (controle.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }
    if (controle.hasError('email')) {
      return "Format d'adresse email invalide.";
    }
    if (controle.hasError('domaineIncomplete')) {
      return MESSAGE_DOMAINE_INCOMPLET;
    }
    if (controle.hasError('maxlength')) {
      return 'Ce champ est trop long.';
    }
    return 'Valeur invalide.';
  }

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.enCours.set(true);
    this.erreur.set(null);

    this.auth.connexion(this.formulaire.getRawValue()).subscribe({
      next: (reponse) => {
        this.enCours.set(false);
        void this.routeur.navigateByUrl(this.cibleApresConnexion(reponse.role));
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        this.erreur.set(
          messageErreurApi(erreur, 'Connexion impossible pour le moment. Réessayez plus tard.'),
        );
      },
    });
  }

  private cibleApresConnexion(role: Role): string {
    const retour = this.route.snapshot.queryParamMap.get('retour');
    const estCheminInterne = retour !== null && retour.startsWith('/') && !retour.startsWith('//');
    return estCheminInterne ? retour : espaceParRole(role);
  }
}
