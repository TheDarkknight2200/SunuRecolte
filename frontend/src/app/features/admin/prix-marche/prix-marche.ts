import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrixMarcheRequest, PrixMarcheResponse } from '../../../core/modeles/domaine.modeles';
import { PrixMarcheService } from '../../../core/services/prix-marche.service';
import { erreursParChamp, messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { formaterDateHeure, formaterMontant } from '../../../core/utilitaires/formatage';

type ChampPrix = 'produit' | 'unite' | 'prixMoyen' | 'marcheReference';

/** Bornes reprises du DTO Java `PrixMarcheRequest` : @Size, @DecimalMin et @DecimalMax. */
const LONGUEUR_PRODUIT = 150;
const LONGUEUR_UNITE = 30;
const LONGUEUR_MARCHE = 150;
const PRIX_MINIMUM = 0.01;
const PRIX_MAXIMUM = 99999999.99;

/**
 * Une saisie `type="number"` livre une chaîne au control : toute comparaison ou envoi
 * passe donc par cette conversion, sinon « 5 > 50 » deviendrait vrai.
 */
function nombre(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === '') {
    return null;
  }
  const converti = Number(valeur);
  return Number.isFinite(converti) ? converti : null;
}

/**
 * Prix indicatifs de marché : lecture publique, écriture réservée à l'ADMIN.
 *
 * Un seul écran pour les quatre opérations du contrat réel : la liste vient de
 * GET /api/prix-marche, le formulaire au-dessus sert à la création (POST) comme à la
 * modification (PUT /{id}), la suppression passe par une modale confirmée (DELETE /{id}).
 * `dateMiseAJour` n'est jamais envoyé : c'est l'entité Java qui le remplit.
 *
 * Les bornes de validation sont celles du DTO, vérifiées avant l'envoi pour éviter un
 * aller-retour inutile ; l'API reste seule autorité et ses `erreurs` par champ reprennent
 * la main sur le message local si elle refuse la ligne.
 */
@Component({
  selector: 'app-admin-prix-marche',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './prix-marche.html',
  styleUrl: './prix-marche.scss',
})
export class PrixMarche {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly prixMarche = inject(PrixMarcheService);
  private readonly document = inject(DOCUMENT);
  private readonly rendu = inject(ChangeDetectorRef);

  protected readonly liste = signal<PrixMarcheResponse[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);

  /** Identifiant de la ligne chargée dans le formulaire : `null` = création. */
  protected readonly enEdition = signal<number | null>(null);
  /** `true` pendant l'appel de création ou de modification. */
  protected readonly envoi = signal(false);
  protected readonly erreurFormulaire = signal<string | null>(null);
  private readonly erreursServeur = signal<Record<string, string>>({});

  protected readonly ligneASupprimer = signal<PrixMarcheResponse | null>(null);
  protected readonly suppressionEnCours = signal(false);
  protected readonly erreurSuppression = signal<string | null>(null);

  protected readonly formaterDateHeure = formaterDateHeure;
  protected readonly formaterMontant = formaterMontant;

  protected readonly formulaire = this.fb.group({
    produit: ['', [Validators.required, Validators.maxLength(LONGUEUR_PRODUIT)]],
    unite: ['', [Validators.required, Validators.maxLength(LONGUEUR_UNITE)]],
    prixMoyen: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(PRIX_MINIMUM),
      Validators.max(PRIX_MAXIMUM),
    ]),
    marcheReference: ['', Validators.maxLength(LONGUEUR_MARCHE)],
  });

  private readonly premierChamp = viewChild('champProduit', { read: ElementRef });
  private readonly boutonAnnuler = viewChild('boutonAnnuler', { read: ElementRef });
  private readonly modale = viewChild('modale', { read: ElementRef });
  private readonly boutonRetourListe = viewChild('boutonRetourListe', { read: ElementRef });

  /** Déclencheur de la modale, pour lui rendre le focus à la fermeture. */
  private declencheur: HTMLElement | null = null;

  constructor() {
    this.charger();

    // viewChild est un signal : l'effet se rejoue quand la modale est réellement rendue.
    effect(() => {
      const bouton = this.boutonAnnuler();
      if (this.ligneASupprimer() !== null && bouton !== undefined) {
        bouton.nativeElement.focus();
      }
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.prixMarche.lister().subscribe({
      next: (prix) => {
        this.liste.set(prix);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.liste.set([]);
        this.erreur.set(
          messageErreurApi(erreur, 'Impossible de charger les prix indicatifs.'),
        );
        this.chargement.set(false);
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected titreFormulaire(): string {
    return this.enEdition() === null ? 'Nouveau prix indicatif' : 'Modifier un prix indicatif';
  }

  protected libelleBouton(): string {
    return this.enEdition() === null ? 'Ajouter le prix' : 'Enregistrer les modifications';
  }

  protected ouValeurAbsente(valeur: string | null): string {
    return valeur ?? '—';
  }

  protected denombrement(): string {
    const total = this.liste().length;
    return total === 1 ? '1 prix indicatif' : `${total} prix indicatifs`;
  }

  // === Formulaire de création et de modification ===

  protected invalide(nom: ChampPrix): boolean {
    if (this.erreursServeur()[nom] !== undefined) {
      return true;
    }
    const controle = this.formulaire.controls[nom];
    return controle.invalid && controle.touched;
  }

  protected messageErreur(nom: ChampPrix): string | null {
    const messageServeur = this.erreursServeur()[nom];
    if (messageServeur !== undefined) {
      return messageServeur;
    }
    const controle = this.formulaire.controls[nom];
    if (controle.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }
    if (controle.hasError('min')) {
      return 'Ce prix doit être supérieur à 0.';
    }
    if (controle.hasError('max')) {
      return 'Ce prix dépasse la valeur maximale autorisée.';
    }
    if (controle.hasError('maxlength')) {
      return 'Ce champ est trop long.';
    }
    return 'Valeur invalide.';
  }

  protected preparerEdition(prix: PrixMarcheResponse): void {
    this.enEdition.set(prix.id);
    this.succes.set(null);
    this.erreurFormulaire.set(null);
    this.erreursServeur.set({});
    this.formulaire.reset({
      produit: prix.produit,
      unite: prix.unite,
      prixMoyen: prix.prixMoyen,
      marcheReference: prix.marcheReference ?? '',
    });
    // Le formulaire est rendu en permanence : la cible est déjà dans le DOM.
    this.premierChamp()?.nativeElement.focus();
  }

  /** « Annuler » n'est jamais destructif ici : la ligne reste enregistrée telle quelle. */
  protected quitterEdition(): void {
    this.enEdition.set(null);
    this.erreurFormulaire.set(null);
    this.erreursServeur.set({});
    this.formulaire.reset({ produit: '', unite: '', prixMoyen: null, marcheReference: '' });
  }

  protected soumettre(): void {
    if (this.formulaire.invalid || this.envoi()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    const prixMoyen = nombre(valeurs.prixMoyen);
    if (prixMoyen === null) {
      this.erreurFormulaire.set('Le prix moyen doit être un nombre.');
      return;
    }

    const identifiant = this.enEdition();
    const requete: PrixMarcheRequest = {
      produit: valeurs.produit.trim(),
      unite: valeurs.unite.trim(),
      prixMoyen,
      marcheReference: this.texteOuNull(valeurs.marcheReference),
    };

    this.envoi.set(true);
    this.erreurFormulaire.set(null);
    this.erreursServeur.set({});
    this.succes.set(null);

    const demande =
      identifiant === null
        ? this.prixMarche.creer(requete)
        : this.prixMarche.modifier(identifiant, requete);

    demande.subscribe({
      next: (reponse) => {
        this.envoi.set(false);
        // L'ordre affiché vient du serveur à chaque chargement : la ligne traitée est posée
        // à sa place dans la liste, sans tri recomposé ici.
        this.liste.update((liste) =>
          identifiant === null
            ? [...liste, reponse]
            : liste.map((element) => (element.id === reponse.id ? reponse : element)),
        );
        this.quitterEdition();
        this.succes.set(
          identifiant === null
            ? `« ${reponse.produit} » a été ajouté aux prix indicatifs.`
            : `« ${reponse.produit} » a été mis à jour.`,
        );
        this.sePositionnerSurLaListe();
      },
      error: (erreur: unknown) => {
        this.envoi.set(false);
        const parChamp = erreursParChamp(erreur);
        if (Object.keys(parChamp).length > 0) {
          this.erreursServeur.set(parChamp);
          this.formulaire.markAllAsTouched();
          return;
        }
        // 403, 404 et 400 : message du backend, valeurs conservées, aucune déconnexion.
        this.erreurFormulaire.set(
          messageErreurApi(
            erreur,
            identifiant === null
              ? 'Le prix indicatif n’a pas pu être ajouté.'
              : 'Le prix indicatif n’a pas pu être mis à jour.',
          ),
        );
      },
    });
  }

  // === Modale de suppression ===

  /**
   * Escape ferme la modale même si le focus a quitté son sous-arbre : l'événement
   * est écouté sur le document, pas sur l'overlay.
   */
  @HostListener('document:keydown.escape')
  protected fermerParEscape(): void {
    if (this.ligneASupprimer() !== null) {
      this.annulerSuppression();
    }
  }

  /**
   * Piège de focus : Tab et Shift+Tab tournent entre les cibles focusables de la modale.
   * Les deux événements sont écoutés séparément : « keydown.tab » ne correspond pas à
   * une pression Shift+Tab.
   */
  @HostListener('document:keydown.tab', ['$event'])
  @HostListener('document:keydown.shift.tab', ['$event'])
  protected piegerLeFocus(evenement: Event): void {
    const modale = this.modale()?.nativeElement;
    if (modale === undefined) {
      return;
    }
    const focusables = this.focusablesDe(modale);
    if (focusables.length === 0) {
      return;
    }

    evenement.preventDefault();
    const { shiftKey } = evenement as KeyboardEvent;
    const actif = this.document.activeElement as HTMLElement | null;
    const index = actif === null ? -1 : focusables.indexOf(actif);
    const cible = shiftKey
      ? (index <= 0 ? focusables[focusables.length - 1] : focusables[index - 1])
      : (index === -1 || index === focusables.length - 1 ? focusables[0] : focusables[index + 1]);
    cible.focus();
  }

  protected demanderSuppression(prix: PrixMarcheResponse, evenement: MouseEvent): void {
    this.declencheur = evenement.currentTarget as HTMLElement;
    this.erreurSuppression.set(null);
    this.succes.set(null);
    this.ligneASupprimer.set(prix);
  }

  protected annulerSuppression(): void {
    if (this.suppressionEnCours()) {
      return;
    }
    this.ligneASupprimer.set(null);
    this.erreurSuppression.set(null);
    this.rendreLeFocus();
  }

  protected confirmerSuppression(): void {
    const prix = this.ligneASupprimer();
    if (prix === null || this.suppressionEnCours()) {
      return;
    }

    this.suppressionEnCours.set(true);
    this.erreurSuppression.set(null);

    this.prixMarche.supprimer(prix.id).subscribe({
      next: () => {
        this.liste.update((liste) => liste.filter((element) => element.id !== prix.id));
        this.suppressionEnCours.set(false);
        this.ligneASupprimer.set(null);
        if (this.enEdition() === prix.id) {
          this.quitterEdition();
        }
        this.succes.set(`« ${prix.produit} » a été retiré des prix indicatifs.`);
        this.placerLeFocusApresSuppression();
      },
      error: (erreur: unknown) => {
        this.suppressionEnCours.set(false);
        // 403 (pas ADMIN) et 404 (ligne déjà retirée) : message du backend, aucune purge.
        this.erreurSuppression.set(
          messageErreurApi(erreur, 'La suppression a échoué.'),
        );
      },
    });
  }

  private focusablesDe(modale: HTMLElement): HTMLElement[] {
    return Array.from(
      modale.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
    );
  }

  /**
   * Le bouton déclencheur est retiré du DOM avec sa carte : le focus reprend le bouton
   * d'actualisation, seule cible stable encore présente dans cet écran.
   */
  private placerLeFocusApresSuppression(): void {
    this.declencheur = null;
    this.sePositionnerSurLaListe();
  }

  private rendreLeFocus(): void {
    const bouton = this.declencheur;
    this.declencheur = null;
    this.rendu.detectChanges();
    if (bouton !== null && bouton.isConnected) {
      bouton.focus();
      return;
    }
    this.boutonRetourListe()?.nativeElement.focus();
  }

  /**
   * Le bouton d'actualisation porte `[disabled]` pendant `envoi` et `suppressionEnCours`, et
   * un contrôle désactivé refuse le focus : le DOM est d'abord rafraîchi, puis la cible est
   * cherchée dans l'état rendu.
   */
  private sePositionnerSurLaListe(): void {
    this.rendu.detectChanges();
    this.boutonRetourListe()?.nativeElement.focus();
  }

  private texteOuNull(valeur: string): string | null {
    const nettoye = valeur.trim();
    return nettoye === '' ? null : nettoye;
  }
}
