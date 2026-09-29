import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProducteurResponse, RecolteRequest, RecolteResponse } from '../../../core/modeles/domaine.modeles';
import { ProducteurService } from '../../../core/services/producteur.service';
import { RecolteService } from '../../../core/services/recolte.service';
import { erreursParChamp, messageErreurApi } from '../../../core/utilitaires/erreurs-api';

type ChampRecolte =
  | 'produit'
  | 'description'
  | 'quantiteDisponible'
  | 'unite'
  | 'prixUnitaire'
  | 'quantiteMin'
  | 'quantiteMax'
  | 'imageUrl'
  | 'localisation'
  | 'dateDisponibilite';

/** Bornes reprises du backend : @DecimalMin("0.01") et @Size des DTO RecolteRequest. */
const MINIMUM_QUANTITE = 0.01;

/**
 * Une saisie `type="number"` livre une chaîne au control : toute comparaison ou
 * envoi passe donc par cette conversion, sinon « 5 > 50 » deviendrait vrai.
 */
function nombre(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === '') {
    return null;
  }
  const converti = Number(valeur);
  return Number.isFinite(converti) ? converti : null;
}

/**
 * Le backend refuse min > max (400). La même règle est vérifiée avant l'envoi,
 * uniquement pour éviter un aller-retour inutile : l'API reste l'autorité.
 */
const quantitesCoherentes: ValidatorFn = (groupe) => {
  const min = nombre(groupe.get('quantiteMin')?.value);
  const max = nombre(groupe.get('quantiteMax')?.value);
  if (min === null || max === null) {
    return null;
  }
  return min > max ? { quantitesIncoherentes: true } : null;
};

/**
 * Formulaire unique pour la création (POST /api/recoltes) et la modification
 * (PUT /api/recoltes/{id}). Le champ `producteurId` du DTO n'est jamais demandé
 * à l'utilisateur : il vient de GET /api/producteurs/moi.
 */
@Component({
  selector: 'app-formulaire-recolte',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './formulaire-recolte.html',
  styleUrl: './formulaire-recolte.scss',
})
export class FormulaireRecolte {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly recoltes = inject(RecolteService);
  private readonly producteurs = inject(ProducteurService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeur = inject(Router);

  protected readonly formulaire = this.fb.group(
    {
      produit: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      quantiteDisponible: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(MINIMUM_QUANTITE),
      ]),
      unite: ['', [Validators.required, Validators.maxLength(30)]],
      prixUnitaire: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(MINIMUM_QUANTITE),
      ]),
      quantiteMin: this.fb.control<number | null>(null, [Validators.min(MINIMUM_QUANTITE)]),
      quantiteMax: this.fb.control<number | null>(null, [Validators.min(MINIMUM_QUANTITE)]),
      imageUrl: [''],
      localisation: [''],
      dateDisponibilite: [''],
    },
    { validators: quantitesCoherentes },
  );

  protected readonly producteur = signal<ProducteurResponse | null>(null);
  protected readonly enEdition = signal(false);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly introuvable = signal(false);
  protected readonly accesRefuse = signal(false);

  protected readonly enCours = signal(false);
  protected readonly erreurGenerale = signal<string | null>(null);
  private readonly erreursServeur = signal<Record<string, string>>({});

  private identifiant: number | null = null;

  constructor() {
    // paramMap et non snapshot : le composant est réutilisé entre deux routes.
    this.route.paramMap.subscribe((parametres) => {
      const brut = parametres.get('id');
      // « en edition » vient de la route ; l'id n'est valide qu'ensuite : un identifiant
      // mal formé doit mener à l'état « introuvable », jamais à un formulaire de création.
      this.enEdition.set(brut !== null);
      this.identifiant = brut === null ? null : this.identifiantValide(brut);
      this.charger();
    });
  }

  protected get creation(): boolean {
    return !this.enEdition();
  }

  /** Le titre suit l'état affiché : « Modifier la récolte » ment quand l'accès est refusé. */
  protected get titre(): string {
    if (this.accesRefuse()) {
      return 'Accès refusé';
    }
    return this.creation ? 'Publier une récolte' : 'Modifier la récolte';
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.introuvable.set(false);
    this.accesRefuse.set(false);

    // Un identifiant mal formé est « introuvable » : aucun appel HTTP inutile.
    if (this.identifiant === null && this.enEdition()) {
      this.introuvable.set(true);
      this.chargement.set(false);
      return;
    }

    this.producteurs.moi().subscribe({
      next: (profil) => {
        this.producteur.set(profil);
        if (this.identifiant === null) {
          this.chargement.set(false);
          return;
        }
        this.chargerRecolte(profil);
      },
      error: (erreur: unknown) => {
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger votre profil producteur.'));
        this.chargement.set(false);
      },
    });
  }

  private chargerRecolte(profil: ProducteurResponse): void {
    const id = this.identifiant as number;
    this.recoltes.findById(id).subscribe({
      next: (recolte) => {
        // Confort d'usage : le contrôle d'appartenance réel est fait par l'API (403).
        if (recolte.producteurId !== profil.id) {
          this.accesRefuse.set(true);
          this.chargement.set(false);
          return;
        }
        this.preparer(recolte);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.introuvable.set(true);
          return;
        }
        if (erreur instanceof HttpErrorResponse && erreur.status === 403) {
          this.accesRefuse.set(true);
          return;
        }
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger cette récolte.'));
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected invalide(nom: ChampRecolte): boolean {
    if (this.erreursServeur()[nom] !== undefined) {
      return true;
    }
    const controle = this.formulaire.controls[nom];
    return controle.invalid && controle.touched;
  }

  protected messageErreur(nom: ChampRecolte): string | null {
    const messageServeur = this.erreursServeur()[nom];
    if (messageServeur !== undefined) {
      return messageServeur;
    }
    const controle = this.formulaire.controls[nom];
    if (controle.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }
    if (controle.hasError('min')) {
      return 'Cette valeur doit être supérieure à 0.';
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

    const profil = this.producteur();
    const valeurs = this.formulaire.getRawValue();
    const quantiteDisponible = nombre(valeurs.quantiteDisponible);
    const prixUnitaire = nombre(valeurs.prixUnitaire);

    if (profil === null || quantiteDisponible === null || prixUnitaire === null) {
      this.erreurGenerale.set(
        'Le formulaire n’a pas pu être envoyé. Rechargez la page puis réessayez.',
      );
      return;
    }

    const requete: RecolteRequest = {
      producteurId: profil.id,
      produit: valeurs.produit.trim(),
      description: this.texteOuNull(valeurs.description),
      quantiteDisponible,
      quantiteMin: nombre(valeurs.quantiteMin),
      quantiteMax: nombre(valeurs.quantiteMax),
      unite: valeurs.unite.trim(),
      prixUnitaire,
      imageUrl: this.texteOuNull(valeurs.imageUrl),
      localisation: this.texteOuNull(valeurs.localisation),
      dateDisponibilite: this.texteOuNull(valeurs.dateDisponibilite),
    };

    this.enCours.set(true);
    this.erreurGenerale.set(null);
    this.erreursServeur.set({});

    const demande = this.creation
      ? this.recoltes.creer(requete)
      : this.recoltes.modifier(this.identifiant as number, requete);

    demande.subscribe({
      next: () => {
        this.enCours.set(false);
        void this.routeur.navigate(['/producteur/recoltes'], {
          queryParams: this.creation ? { recolteCreee: '1' } : { recolteModifiee: '1' },
        });
      },
      error: (erreur: unknown) => {
        this.enCours.set(false);
        const statut = erreur instanceof HttpErrorResponse ? erreur.status : 0;

        if (statut === 404) {
          this.introuvable.set(true);
          return;
        }
        // 403 et 400 : message du backend, valeurs conservées, aucune déconnexion.
        const parChamp = erreursParChamp(erreur);
        if (Object.keys(parChamp).length > 0) {
          this.erreursServeur.set(parChamp);
          this.formulaire.markAllAsTouched();
          return;
        }
        this.erreurGenerale.set(
          messageErreurApi(
            erreur,
            this.creation
              ? 'La récolte n’a pas pu être publiée.'
              : 'La récolte n’a pas pu être modifiée.',
          ),
        );
      },
    });
  }

  private preparer(recolte: RecolteResponse): void {
    this.formulaire.reset({
      produit: recolte.produit,
      description: recolte.description ?? '',
      quantiteDisponible: recolte.quantiteDisponible,
      unite: recolte.unite,
      prixUnitaire: recolte.prixUnitaire,
      quantiteMin: recolte.quantiteMin,
      quantiteMax: recolte.quantiteMax,
      imageUrl: recolte.imageUrl ?? '',
      localisation: recolte.localisation ?? '',
      dateDisponibilite: recolte.dateDisponibilite ?? '',
    });
  }

  private identifiantValide(brut: string): number | null {
    const id = Number(brut);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private texteOuNull(valeur: string): string | null {
    const nettoye = valeur.trim();
    return nettoye === '' ? null : nettoye;
  }
}
