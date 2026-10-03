import { Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InscriptionRequest } from '../../../core/modeles/auth.modeles';
import {
  FILIERES,
  Filiere,
  LIBELLES_FILIERE,
  LIBELLES_ROLE_INSCRIPTION,
  LIBELLES_TYPE_ACHETEUR,
  ROLES_INSCRIPTION,
  RoleInscription,
  TYPES_ACHETEUR,
  TypeAcheteur,
} from '../../../core/modeles/referentiels';
import { AuthService } from '../../../core/services/auth.service';
import { erreursParChamp, messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  MESSAGE_DOMAINE_INCOMPLET,
  domaineEmailComplet,
} from '../../../core/utilitaires/validation-email';

type ChampInscription =
  | 'role'
  | 'nom'
  | 'prenom'
  | 'email'
  | 'telephone'
  | 'motDePasse'
  | 'filiere'
  | 'typeAcheteur';

/**
 * Inscription : POST /api/auth/inscription.
 * Seuls PRODUCTEUR et ACHETEUR sont proposés (ROLES_INSCRIPTION) ; ADMIN ne peut
 * pas être créé par cette voie, ni ici ni côté backend.
 */
@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inscription.html',
  styleUrl: './inscription.scss',
})
export class Inscription {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly routeur = inject(Router);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);

  /**
   * Ordre du DOM : un envoi refusé donne le focus au premier champ invalide. Le groupe de rôles
   * est représenté par son premier radio, le champ conditionnel n'est dans la liste que rendu.
   */
  private readonly champsDansOrdreDuDom: readonly { nom: ChampInscription; selecteur: string }[] = [
    { nom: 'role', selecteur: '.auth__roles input[type="radio"]' },
    { nom: 'nom', selecteur: '#inscription-nom' },
    { nom: 'prenom', selecteur: '#inscription-prenom' },
    { nom: 'email', selecteur: '#inscription-email' },
    { nom: 'telephone', selecteur: '#inscription-telephone' },
    { nom: 'motDePasse', selecteur: '#inscription-mot-de-passe' },
    { nom: 'filiere', selecteur: '#inscription-filiere' },
    { nom: 'typeAcheteur', selecteur: '#inscription-type-acheteur' },
  ];

  protected readonly rolesInscription = ROLES_INSCRIPTION;
  protected readonly filieres = FILIERES;
  protected readonly typesAcheteur = TYPES_ACHETEUR;

  protected readonly formulaire = this.fb.group({
    role: this.fb.control<RoleInscription | null>(null, Validators.required),
    nom: ['', [Validators.required, Validators.maxLength(100)]],
    prenom: ['', [Validators.required, Validators.maxLength(100)]],
    email: [
      '',
      [Validators.required, Validators.email, domaineEmailComplet, Validators.maxLength(150)],
    ],
    telephone: ['', [Validators.required, Validators.maxLength(20)]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
    filiere: this.fb.control<Filiere | null>(null),
    typeAcheteur: this.fb.control<TypeAcheteur | null>(null),
  });

  protected readonly roleChoisi = signal<RoleInscription | null>(null);
  protected readonly enCours = signal(false);
  protected readonly erreurGenerale = signal<string | null>(null);
  private readonly erreursServeur = signal<Record<string, string>>({});

  constructor() {
    this.formulaire.controls.role.valueChanges.subscribe((role) => {
      this.roleChoisi.set(role);
      this.ajusterChampsConditionnels(role);
    });
  }

  protected libelleRole(role: RoleInscription): string {
    return LIBELLES_ROLE_INSCRIPTION[role];
  }

  protected libelleFiliere(filiere: Filiere): string {
    return LIBELLES_FILIERE[filiere];
  }

  protected libelleTypeAcheteur(type: TypeAcheteur): string {
    return LIBELLES_TYPE_ACHETEUR[type];
  }

  protected invalide(nom: ChampInscription): boolean {
    if (this.erreursServeur()[nom] !== undefined) {
      return true;
    }
    const controle = this.formulaire.controls[nom];
    return controle.invalid && controle.touched;
  }

  protected messageErreur(nom: ChampInscription): string | null {
    const messageServeur = this.erreursServeur()[nom];
    if (messageServeur !== undefined) {
      return messageServeur;
    }
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
    if (controle.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (controle.hasError('maxlength')) {
      return 'Ce champ est trop long.';
    }
    return 'Valeur invalide.';
  }

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.focusSurPremierChampInvalide();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    const role = valeurs.role;
    if (role === null) {
      this.formulaire.controls.role.markAsTouched();
      return;
    }

    const requete: InscriptionRequest = {
      nom: valeurs.nom,
      prenom: valeurs.prenom,
      email: valeurs.email,
      telephone: valeurs.telephone,
      motDePasse: valeurs.motDePasse,
      role,
    };
    if (role === 'PRODUCTEUR' && valeurs.filiere !== null) {
      requete.filiere = valeurs.filiere;
    }
    if (role === 'ACHETEUR' && valeurs.typeAcheteur !== null) {
      requete.typeAcheteur = valeurs.typeAcheteur;
    }

    this.enCours.set(true);
    this.erreursServeur.set({});
    this.erreurGenerale.set(null);

    this.auth.inscription(requete).subscribe({
      next: () => {
        this.enCours.set(false);
        void this.routeur.navigate(['/tableau-de-bord'], {
          queryParams: { compteCree: '1' },
        });
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        const parChamp = erreursParChamp(erreur);
        this.erreursServeur.set(parChamp);
        if (Object.keys(parChamp).length > 0) {
          this.formulaire.markAllAsTouched();
          this.focusSurPremierChampInvalide();
          return;
        }
        this.erreurGenerale.set(
          messageErreurApi(erreur, "L'inscription n'a pas pu aboutir. Réessayez plus tard."),
        );
      },
    });
  }

  /**
   * Un seul focus, jamais différé ni piégé. Une erreur générale sans champ invalide ne déplace
   * rien : sa bannière `role="alert"` est déjà annoncée.
   */
  private focusSurPremierChampInvalide(): void {
    const cible = this.champsDansOrdreDuDom.find((champ) => this.invalide(champ.nom));
    if (cible === undefined) {
      return;
    }
    this.element.nativeElement.querySelector<HTMLElement>(cible.selecteur)?.focus();
  }

  /** Filière et type d'acheteur ne sont exigés que par le rôle choisi (contrat backend). */
  private ajusterChampsConditionnels(role: RoleInscription | null): void {
    const filiere = this.formulaire.controls.filiere;
    const typeAcheteur = this.formulaire.controls.typeAcheteur;

    if (role === 'PRODUCTEUR') {
      filiere.setValidators(Validators.required);
      typeAcheteur.setValue(null);
      typeAcheteur.clearValidators();
    } else if (role === 'ACHETEUR') {
      typeAcheteur.setValidators(Validators.required);
      filiere.setValue(null);
      filiere.clearValidators();
    } else {
      filiere.clearValidators();
      typeAcheteur.clearValidators();
    }

    filiere.updateValueAndValidity();
    typeAcheteur.updateValueAndValidity();
  }
}
