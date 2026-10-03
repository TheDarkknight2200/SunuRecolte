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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommandeResponse, PaiementResponse } from '../../../core/modeles/domaine.modeles';
import {
  LIBELLES_MOYEN_PAIEMENT,
  LIBELLES_STATUT_COMMANDE,
  LIBELLES_STATUT_PAIEMENT,
  MOYENS_PAIEMENT,
  MoyenPaiement,
  StatutCommande,
  VARIANTES_BADGE_COMMANDE,
} from '../../../core/modeles/referentiels';
import { CommandeService } from '../../../core/services/commande.service';
import { PaiementService } from '../../../core/services/paiement.service';
import { messageErreurApi } from '../../../core/utilitaires/erreurs-api';
import { formaterDateHeure, formaterMontant } from '../../../core/utilitaires/formatage';

/**
 * Statuts pour lesquels `PaiementService.creer` accepte un paiement : il refuse
 * uniquement `ANNULEE` (« commande annulée ») et `LIVREE` (« déjà livrée »), et encore
 * par un 400 serveur. Retirer le formulaire dans ces deux cas est un confort d'usage :
 * l'autorité reste le backend, qui garde le dernier mot (403 si la commande n'est pas
 * celle du titulaire du jeton, 400 si un paiement existe déjà).
 */
const STATUTS_PAYABLES: readonly StatutCommande[] = ['EN_ATTENTE', 'CONFIRMEE', 'PRETE'];

/**
 * Paiement **simulé** d'une commande (POST /api/paiements).
 *
 * Aucun paiement réel n'est effectué et aucune API Wave ou Orange Money n'est appelée :
 * le backend enregistre une intention, lui reprend le montant du total de la commande et
 * renvoie un paiement `REUSSI` portant une référence `SIMU-…`. La réussite fait partie de
 * la simulation (`PaiementService.appliquerLaReussiteSimulee`, seul endroit qui écrit
 * `REUSSI`) ; la date de confirmation est un horodatage local du serveur, pas le retour
 * d'un opérateur. À l'annulation de la commande, ce statut devient `REMBOURSE`
 * (`CommandeService.rembourserOuAnnulerPaiement`). `ECHOUE` est dans l'enum sans chemin
 * d'API qui l'écrive aujourd'hui.
 *
 * Cet écran affiche le statut renvoyé sans jamais l'interpréter ni le fabriquer : chaque
 * phrase de résultat dit la simulation, et le montant vient de `CommandeResponse.total`
 * (serveur), jamais du panier local ; l'identifiant de commande envoyé est celui renvoyé
 * par le serveur, pas celui de l'URL.
 */
@Component({
  selector: 'app-paiement',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './paiement.html',
  styleUrl: './paiement.scss',
})
export class Paiement {
  private readonly route = inject(ActivatedRoute);
  private readonly commandes = inject(CommandeService);
  private readonly paiements = inject(PaiementService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly chargement = signal(true);
  protected readonly introuvable = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly commande = signal<CommandeResponse | null>(null);

  /** Paiement déjà enregistré pour cette commande : un seul par commande. */
  protected readonly paiementEnregistre = signal<PaiementResponse | null>(null);

  protected readonly formulaire = this.fb.group({
    moyenPaiement: this.fb.control<MoyenPaiement | null>(null, [Validators.required]),
  });

  protected readonly enCours = signal(false);
  protected readonly erreurSoumission = signal<string | null>(null);
  protected readonly resultat = signal<PaiementResponse | null>(null);

  protected readonly moyens = MOYENS_PAIEMENT;

  protected readonly payable = computed(() => {
    const statut = this.commande()?.statut;
    return statut !== undefined && STATUTS_PAYABLES.includes(statut);
  });

  /** Phrase de refus qui reprend exactement le motif posé par le backend. */
  protected readonly motifRefus = computed(() => {
    switch (this.commande()?.statut) {
      case 'ANNULEE':
        return 'Le paiement n’est pas disponible : cette commande est annulée.';
      case 'LIVREE':
        return 'Le paiement n’est pas disponible : cette commande est déjà livrée.';
      default:
        return null;
    }
  });

  protected readonly formaterMontant = formaterMontant;
  protected readonly formaterDateHeure = formaterDateHeure;

  private readonly titreResultat = viewChild('titreResultat', { read: ElementRef });

  /** Le focus est attendu dès que le résultat — ou la fiche du paiement existant — est rendu. */
  private readonly focusAttendu = signal(false);

  private identifiant: number | null = null;

  constructor() {
    // Le refus « aucun moyen choisi » n'a plus de raison d'être dès qu'un choix est fait :
    // sans cette purge, le message survit au clic sur une option et l'écran paraît cassé.
    this.formulaire.controls.moyenPaiement.valueChanges.subscribe(() =>
      this.erreurSoumission.set(null),
    );

    this.route.paramMap.subscribe((parametres) => {
      const id = Number(parametres.get('id'));
      this.identifiant = Number.isInteger(id) && id > 0 ? id : null;
      this.charger();
    });

    effect(() => {
      const titre = this.titreResultat();
      if (this.focusAttendu() && titre !== undefined) {
        titre.nativeElement.focus();
        this.focusAttendu.set(false);
      }
    });
  }

  protected charger(): void {
    const id = this.identifiant;
    this.chargement.set(true);
    this.erreur.set(null);
    this.introuvable.set(false);
    this.commande.set(null);
    this.paiementEnregistre.set(null);
    this.resultat.set(null);
    this.erreurSoumission.set(null);

    if (id === null) {
      this.introuvable.set(true);
      this.chargement.set(false);
      return;
    }

    this.commandes.findById(id).subscribe({
      next: (commande) => {
        this.commande.set(commande);
        this.chercherPaiementEnregistre(commande.id);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.introuvable.set(true);
          return;
        }
        // 403 : accès refusé, sans déconnexion ni purge (le 401 reste à l'intercepteur).
        this.erreur.set(messageErreurApi(erreur, 'Impossible de charger cette commande.'));
      },
    });
  }

  /**
   * Un 404 signifie « aucun paiement n'existe encore pour cette commande » : c'est la
   * réponse normale du backend quand la demande n'a pas été faite, donc le formulaire
   * reste proposé. Toute autre erreur est présentée comme telle.
   */
  private chercherPaiementEnregistre(commandeId: number): void {
    this.paiements.parCommande(commandeId).subscribe({
      next: (paiement) => {
        this.paiementEnregistre.set(paiement);
        this.chargement.set(false);
        this.focusAttendu.set(true);
      },
      error: (erreur: unknown) => {
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.chargement.set(false);
          return;
        }
        this.chargement.set(false);
        this.erreur.set(
          messageErreurApi(erreur, 'Impossible de vérifier si un paiement a déjà été enregistré.'),
        );
      },
    });
  }

  protected reessayer(): void {
    this.charger();
  }

  protected libelleStatutCommande(statut: StatutCommande): string {
    return LIBELLES_STATUT_COMMANDE[statut];
  }

  protected classesStatut(statut: StatutCommande): string {
    return `badge ${VARIANTES_BADGE_COMMANDE[statut]}`;
  }

  protected libelleMoyen(moyen: MoyenPaiement): string {
    return LIBELLES_MOYEN_PAIEMENT[moyen];
  }

  protected libelleStatutPaiement(paiement: PaiementResponse): string {
    return LIBELLES_STATUT_PAIEMENT[paiement.statut];
  }

  /**
   * Phrase de résultat reprise du statut **renvoyé par le serveur**. Le backend écrit
   * `REUSSI` dès l'enregistrement (réussite simulée) et solde ce paiement en `REMBOURSE`
   * quand la commande est annulée ; `EN_ATTENTE` comme `ECHOUE` restent mappés alors
   * qu'aucun chemin d'API ne les écrit aujourd'hui. Aucune phrase ne laisse croire à un
   * encaissement réel : là où le statut affirme une réussite, la simulation est dite.
   */
  protected phraseResultat(paiement: PaiementResponse): string {
    switch (paiement.statut) {
      case 'EN_ATTENTE':
        return 'Simulation enregistrée — paiement en attente.';
      case 'ANNULE':
        return 'Paiement annulé : la commande a été annulée.';
      case 'REUSSI':
        return 'Paiement simulé enregistré : aucune transaction réelle n’a été effectuée.';
      case 'ECHOUE':
        return 'Le serveur a enregistré un échec de paiement.';
      case 'REMBOURSE':
        return 'Remboursement simulé : aucune transaction réelle n’a été remboursée.';
    }
  }

  /** Valeur absente : un seul signe, jamais une case vide ni « null » (§30). */
  protected ouValeurAbsente(valeur: string | null): string {
    return valeur ?? '—';
  }

  protected estChoisi(moyen: MoyenPaiement): boolean {
    return this.formulaire.controls.moyenPaiement.value === moyen;
  }

  /**
   * Une seule requête par simulation : la garde bloque le second clic et le bouton est
   * désactivé pendant l'appel. Aucun POST n'est envoyé sans moyen de paiement choisi.
   */
  protected payer(): void {
    const commande = this.commande();
    if (commande === null || this.enCours()) {
      return;
    }
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.erreurSoumission.set('Choisissez un moyen de paiement pour continuer.');
      return;
    }

    const moyenPaiement = this.formulaire.controls.moyenPaiement.value as MoyenPaiement;
    this.enCours.set(true);
    this.erreurSoumission.set(null);

    this.paiements
      .simuler({ commandeId: commande.id, moyenPaiement })
      .subscribe({
        next: (paiement) => {
          // Le résultat est la réponse du serveur : aucun statut écrit ici.
          this.resultat.set(paiement);
          this.paiementEnregistre.set(paiement);
          this.enCours.set(false);
          this.focusAttendu.set(true);
        },
        error: (erreur: unknown) => {
          this.enCours.set(false);
          this.erreurSoumission.set(
            messageErreurApi(erreur, 'Le paiement simulé n’a pas pu être enregistré.'),
          );
        },
      });
  }
}
