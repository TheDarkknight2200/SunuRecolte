import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ModifierProfilProducteurRequest,
  ProducteurResponse,
} from '../../../core/modeles/domaine.modeles';
import { FILIERES, LIBELLES_FILIERE, type Filiere } from '../../../core/modeles/referentiels';
import { AuthService } from '../../../core/services/auth.service';
import { ProducteurService } from '../../../core/services/producteur.service';
import { erreursParChamp, messageErreurApi } from '../../../core/utilitaires/erreurs-api';

type ChampProfil =
  | 'prenom'
  | 'nom'
  | 'email'
  | 'telephone'
  | 'localisationExploitation'
  | 'filiere'
  | 'description';

/**
 * Bornes reprises du schéma réel, colonne par colonne : utilisateurs.prenom et nom sont
 * des varchar(100), email un varchar(150), telephone un varchar(20), et
 * producteurs.localisation_exploitation un varchar(255). `description` est un TEXT :
 * aucune limite n'est posée ici, le schéma n'en impose aucune.
 */
const LONGUEUR_PRENOM = 100;
const LONGUEUR_NOM = 100;
const LONGUEUR_EMAIL = 150;
const LONGUEUR_TELEPHONE = 20;
const LONGUEUR_LOCALISATION = 255;

/** Table de rappel pour les messages : `filiere` et `description` n'y figurent pas. */
const LONGUEURS: Partial<Record<ChampProfil, number>> = {
  prenom: LONGUEUR_PRENOM,
  nom: LONGUEUR_NOM,
  email: LONGUEUR_EMAIL,
  telephone: LONGUEUR_TELEPHONE,
  localisationExploitation: LONGUEUR_LOCALISATION,
};

/**
 * Profil du producteur connecté : les sept champs envoyés à PUT /api/producteurs/moi.
 * Le contrat n'admet aucune écriture partielle — le service Java réécrit le compte et
 * l'exploitation — donc les sept valeurs sont toujours renvoyées, vides comprises
 * (FRONTEND_DESIGN.md §36). Aucun identifiant n'est porté par la requête : le serveur
 * modifie le producteur du jeton.
 */
@Component({
  selector: 'app-profil-producteur',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profil-producteur.html',
  styleUrl: './profil-producteur.scss',
})
export class ProfilProducteur {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly producteurs = inject(ProducteurService);
  private readonly auth = inject(AuthService);

  protected readonly filieres = FILIERES;
  protected readonly libelleFiliere = LIBELLES_FILIERE;

  protected readonly formulaire = this.fb.group({
    prenom: ['', [Validators.required, Validators.maxLength(LONGUEUR_PRENOM)]],
    nom: ['', [Validators.required, Validators.maxLength(LONGUEUR_NOM)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(LONGUEUR_EMAIL)]],
    telephone: ['', [Validators.required, Validators.maxLength(LONGUEUR_TELEPHONE)]],
    localisationExploitation: ['', [Validators.maxLength(LONGUEUR_LOCALISATION)]],
    filiere: this.fb.control<Filiere | null>(null, [Validators.required]),
    description: [''],
  });

  protected readonly profil = signal<ProducteurResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly enCours = signal(false);
  protected readonly erreurGenerale = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);
  private readonly erreursServeur = signal<Record<string, string>>({});

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.producteurs.moi().subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.preparer(profil);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger votre profil.'));
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected invalide(nom: ChampProfil): boolean {
    if (this.erreursServeur()[nom] !== undefined) {
      return true;
    }
    const controle = this.formulaire.controls[nom];
    return controle.invalid && controle.touched;
  }

  protected messageErreur(nom: ChampProfil): string | null {
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
    if (controle.hasError('maxlength')) {
      return `Ce champ ne peut pas dépasser ${LONGUEURS[nom]} caractères.`;
    }
    return 'Valeur invalide.';
  }

  protected soumettre(): void {
    // Garde d'exécution : le bouton est désactivé pendant l'envoi, mais un second
    // déclenchement du formulaire ne doit jamais partir deux fois.
    if (this.enCours()) {
      return;
    }
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    if (valeurs.filiere === null) {
      this.erreurGenerale.set('Le profil n’a pas pu être enregistré. Vérifiez la filière.');
      return;
    }

    const requete: ModifierProfilProducteurRequest = {
      prenom: valeurs.prenom.trim(),
      nom: valeurs.nom.trim(),
      email: valeurs.email.trim(),
      telephone: valeurs.telephone.trim(),
      localisationExploitation: this.texteOuNull(valeurs.localisationExploitation),
      filiere: valeurs.filiere,
      description: this.texteOuNull(valeurs.description),
    };

    this.enCours.set(true);
    this.erreurGenerale.set(null);
    this.succes.set(null);
    this.erreursServeur.set({});

    this.producteurs.modifierMonProfil(requete).subscribe({
      next: (profil) => {
        this.enCours.set(false);
        // Le formulaire est rechargé depuis la réponse persistée, pas depuis la saisie.
        this.profil.set(profil);
        this.preparer(profil);
        // L'en-tête affiche le nom porté par la session locale : sans ce rafraîchissement,
        // il garderait l'identité précédente jusqu'à la prochaine connexion.
        this.auth.mettreAJourIdentite({
          prenom: profil.prenom,
          nom: profil.nom,
          email: profil.email,
        });
        this.succes.set('Profil mis à jour.');
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        const parChamp = erreursParChamp(erreur);
        if (Object.keys(parChamp).length > 0) {
          this.erreursServeur.set(parChamp);
          this.formulaire.markAllAsTouched();
          return;
        }
        // 403 : refus affiché, aucune déconnexion ni purge (authInterceptor ne traite que 401).
        this.erreurGenerale.set(messageErreurApi(erreur, 'Le profil n’a pas pu être enregistré.'));
      },
    });
  }

  private preparer(profil: ProducteurResponse): void {
    this.formulaire.reset({
      prenom: profil.prenom,
      nom: profil.nom,
      email: profil.email,
      telephone: profil.telephone,
      localisationExploitation: profil.localisationExploitation ?? '',
      filiere: profil.filiere,
      description: profil.description ?? '',
    });
  }

  private texteOuNull(valeur: string): string | null {
    const nettoye = valeur.trim();
    return nettoye === '' ? null : nettoye;
  }
}
