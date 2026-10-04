import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AcheteurResponse,
  CommandeRequest,
  CommandeResponse,
} from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_MODE_RECEPTION,
  LIBELLES_STATUT_COMMANDE,
  MODES_RECEPTION,
  ModeReception,
  StatutCommande,
} from '../../../core/modeles/referentiels';
import { LignePanier, PanierService } from '../../../core/services/panier.service';
import { AcheteurService } from '../../../core/services/acheteur.service';
import { CommandeService } from '../../../core/services/commande.service';
import { erreursParChamp, messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import {
  formaterDateHeure,
  formaterMontant,
  formaterQuantite,
} from '../../../core/utilitaires/formatage';

/** Le tunnel est un parcours en trois temps, jamais une page à états croisés. */
type Etape = 'saisie' | 'revision' | 'confirmee';

type ChampLivraison = 'adresseLivraison' | 'telephoneLivraison' | 'instructionsLivraison';

/** Bornes de `CommandeRequest` : @Size(max = 255) et @Size(max = 20). */
const LONGUEUR_ADRESSE = 255;
const LONGUEUR_TELEPHONE = 20;

/**
 * Tunnel de commande de l'acheteur (FRONTEND_DESIGN.md §26).
 *
 * Le panier reste la source frontend des lignes jusqu'au `POST /api/commandes` :
 * cette page ne calcule ni prix, ni stock, ni total. Elle présente un récapitulatif,
 * recueille le mode de réception, impose une révision, envoie exactement le
 * `CommandeRequest` du DTO, puis affiche la commande réellement retournée par le
 * serveur. Aucun paiement n'est appelé ici : la carte de confirmation ne fait que proposer
 * d'y aller, par un lien, et le paiement proposé dépend de la commande rendue par le `201`.
 */
@Component({
  selector: 'app-commande',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './commande.html',
  styleUrl: './commande.scss',
})
export class Commande {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly panier = inject(PanierService);
  private readonly acheteurs = inject(AcheteurService);
  private readonly commandes = inject(CommandeService);
  private readonly document = inject(DOCUMENT);

  protected readonly lignes = this.panier.lignes;
  protected readonly totalIndicatif = this.panier.totalIndicatif;
  protected readonly modes = MODES_RECEPTION;

  protected readonly formulaire = this.fb.group({
    modeReception: this.fb.control<ModeReception>('RETRAIT', [Validators.required]),
    adresseLivraison: ['', [Validators.maxLength(LONGUEUR_ADRESSE)]],
    telephoneLivraison: ['', [Validators.maxLength(LONGUEUR_TELEPHONE)]],
    instructionsLivraison: [''],
  });

  protected readonly etape = signal<Etape>('saisie');

  /** Profil lu à GET /api/acheteurs/moi : source d'affichage et seule source du `acheteurId`. */
  protected readonly profil = signal<AcheteurResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreurChargement = signal<string | null>(null);

  protected readonly enCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly commandeCreee = signal<CommandeResponse | null>(null);
  private readonly erreursServeur = signal<Record<string, string>>({});

  protected readonly estVide = computed(() => this.lignes().length === 0);

  private readonly titreRevision = viewChild('titreRevision', { read: ElementRef });
  private readonly titreSucces = viewChild('titreSucces', { read: ElementRef });
  private readonly blocErreur = viewChild('erreurMessage', { read: ElementRef });

  /** Le focus se pose après le rendu du bloc concerné, jamais pendant le handler. */
  private readonly focusAttendu = signal<'revision' | 'succes' | 'erreur' | null>(null);

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterQuantite = formaterQuantite;
  protected readonly formaterDateHeure = formaterDateHeure;

  constructor() {
    this.formulaire.controls.modeReception.valueChanges.subscribe(() =>
      this.appliquerValidateurs(),
    );
    this.appliquerValidateurs();
    this.chargerProfil();

    effect(() => {
      const cible = this.focusAttendu();
      if (cible === 'revision') {
        const titre = this.titreRevision();
        if (titre !== undefined) {
          titre.nativeElement.focus();
          this.focusAttendu.set(null);
        }
        return;
      }
      if (cible === 'succes') {
        const titre = this.titreSucces();
        if (titre !== undefined) {
          titre.nativeElement.focus();
          this.focusAttendu.set(null);
        }
        return;
      }
      if (cible === 'erreur') {
        const message = this.blocErreur();
        if (message !== undefined) {
          message.nativeElement.focus();
          this.focusAttendu.set(null);
        }
      }
    });
  }

  protected get mode(): ModeReception {
    return this.formulaire.controls.modeReception.value;
  }

  protected get livraison(): boolean {
    return this.mode === 'LIVRAISON';
  }

  protected estChoisi(mode: ModeReception): boolean {
    return this.mode === mode;
  }

  protected libelleMode(mode: ModeReception): string {
    return LIBELLES_MODE_RECEPTION[mode];
  }

  /** Le sens du choix est porté par du texte, jamais par la seule couleur (§26). */
  protected detailMode(mode: ModeReception): string {
    return mode === 'RETRAIT'
      ? 'Vous récupérez la commande auprès du producteur.'
      : 'Adresse et téléphone de livraison demandés.';
  }

  protected libelleStatut(statut: StatutCommande): string {
    return LIBELLES_STATUT_COMMANDE[statut];
  }

  /**
   * Sous-total d'affichage du snapshot (quantité × prix enregistré à l'ajout) :
   * le total opposable est celui que le serveur recalcule à la création.
   */
  protected sousTotal(ligne: LignePanier): number {
    return ligne.quantite * ligne.prixUnitaire;
  }

  protected chargerProfil(): void {
    this.chargement.set(true);
    this.erreurChargement.set(null);

    this.acheteurs.moi().subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        this.erreurChargement.set(
          messageErreurApi(erreur, 'Votre profil acheteur n’a pas pu être chargé.'),
        );
      },
    });
  }

  protected invalide(champ: ChampLivraison): boolean {
    if (this.erreursServeur()[champ] !== undefined) {
      return true;
    }
    const controle = this.formulaire.controls[champ];
    return controle.invalid && controle.touched;
  }

  protected messageErreur(champ: ChampLivraison): string {
    const messageServeur = this.erreursServeur()[champ];
    if (messageServeur !== undefined) {
      return messageServeur;
    }
    const controle = this.formulaire.controls[champ];
    if (controle.hasError('required')) {
      return 'Ce champ est obligatoire pour une livraison.';
    }
    if (controle.hasError('maxlength')) {
      return 'Ce champ est trop long.';
    }
    return 'Valeur invalide.';
  }

  /**
   * §8 et §9 : adresse et téléphone ne sont exigés qu'en `LIVRAISON`
   * (`CommandeService` répond 400 sinon), jamais en `RETRAIT`.
   */
  private appliquerValidateurs(): void {
    const obligation = this.livraison ? [Validators.required] : [];
    this.formulaire.controls.adresseLivraison.setValidators([
      ...obligation,
      Validators.maxLength(LONGUEUR_ADRESSE),
    ]);
    this.formulaire.controls.telephoneLivraison.setValidators([
      ...obligation,
      Validators.maxLength(LONGUEUR_TELEPHONE),
    ]);
    this.formulaire.controls.adresseLivraison.updateValueAndValidity({ emitEvent: false });
    this.formulaire.controls.telephoneLivraison.updateValueAndValidity({ emitEvent: false });
  }

  protected passerEnRevision(): void {
    if (this.estVide() || this.enCours()) {
      return;
    }
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.erreur.set(
        'Les informations de réception sont incomplètes : corrigez les champs signalés.',
      );
      return;
    }
    this.erreur.set(null);
    this.erreursServeur.set({});
    this.etape.set('revision');
    this.focusAttendu.set('revision');
  }

  protected modifierInformations(): void {
    this.etape.set('saisie');
    this.erreur.set(null);
  }

  protected confirmer(): void {
    // Le garde-fou de la double soumission : ni second clic ni second appel concurrent.
    if (this.enCours() || this.etape() !== 'revision') {
      return;
    }

    const profil = this.profil();
    const lignes = this.lignes();
    if (profil === null || lignes.length === 0 || this.formulaire.invalid) {
      // Panier vidé ou valeurs devenues invalides : on revient sur la saisie, aucun POST.
      this.etape.set('saisie');
      this.erreur.set(
        lignes.length === 0
          ? 'Votre panier est vide : ajoutez une récolte avant de commander.'
          : 'Les informations de réception sont incomplètes : corrigez les champs signalés.',
      );
      return;
    }

    const requete = this.construireRequete(profil.id, lignes);
    this.envoyer(requete);
  }

  private construireRequete(acheteurId: number, lignes: readonly LignePanier[]): CommandeRequest {
    const valeurs = this.formulaire.getRawValue();
    const livraison = this.livraison;

    return {
      acheteurId,
      modeReception: valeurs.modeReception,
      // En retrait, les colonnes de livraison ne sont pas renseignées : rien n'est envoyé.
      adresseLivraison: livraison ? this.texteOuNull(valeurs.adresseLivraison) : null,
      telephoneLivraison: livraison ? this.texteOuNull(valeurs.telephoneLivraison) : null,
      instructionsLivraison: livraison ? this.texteOuNull(valeurs.instructionsLivraison) : null,
      lignes: lignes.map((ligne) => ({ recolteId: ligne.recolteId, quantite: ligne.quantite })),
    };
  }

  private envoyer(requete: CommandeRequest): void {
    this.enCours.set(true);
    this.erreur.set(null);
    this.erreursServeur.set({});

    this.commandes.creer(requete).subscribe({
      next: (commande) => {
        this.enCours.set(false);
        this.commandeCreee.set(commande);
        // Le panier n'est vidé qu'après la réponse 201 : un échec le conserve intact.
        this.panier.vider();
        this.etape.set('confirmee');
        this.focusAttendu.set('succes');
      },
      error: (erreur: unknown) => this.traiterErreur(erreur),
    });
  }

  private traiterErreur(erreur: unknown): void {
    this.enCours.set(false);
    const statut = erreur instanceof HttpErrorResponse ? erreur.status : 0;

    if (statut === 401) {
      // L'intercepteur purge la session et redirige : le composant ne duplique rien (§19).
      return;
    }

    const parChamp = erreursParChamp(erreur);
    if (Object.keys(parChamp).length > 0) {
      this.erreursServeur.set(parChamp);
      this.formulaire.markAllAsTouched();
      this.etape.set('saisie');
      this.erreur.set('Le serveur a refusé une des informations saisies.');
      this.focusAttendu.set('erreur');
      return;
    }

    if (statut === 404) {
      this.erreur.set(
        'Une récolte du panier n’existe plus sur le catalogue. Retirez-la de votre panier puis ' +
          'recomposez la commande.',
      );
      this.focusAttendu.set('erreur');
      return;
    }

    if (statut === 403) {
      this.erreur.set(
        messageErreurApi(erreur, 'Accès refusé : la commande n’a pas été enregistrée.'),
      );
      this.focusAttendu.set('erreur');
      return;
    }

    // 400 métier (stock, disponibilité, livraison) et erreurs inattendues : message du serveur.
    this.erreur.set(
      messageErreurApi(
        erreur,
        'La commande n’a pas pu être enregistrée. Votre panier et vos informations sont conservés.',
      ),
    );
    this.focusAttendu.set('erreur');
  }

  private texteOuNull(valeur: string): string | null {
    const nettoye = valeur.trim();
    return nettoye === '' ? null : nettoye;
  }
}
