import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import {
  AcheteurResponse,
  CommandeResponse,
  LigneCommandeResponse,
} from '../../../core/modeles/domaine.modeles';
import { MODES_RECEPTION, ModeReception } from '../../../core/modeles/referentiels';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { CLE_PANIER, LignePanier, PanierService } from '../../../core/services/panier.service';
import { Commande } from './commande';

const API = 'http://localhost:8080/api';
const MOI = `${API}/acheteurs/moi`;
const COMMANDES = `${API}/commandes`;

const MENTION_TOTAL = 'Total indicatif — le montant final sera confirmé par le serveur.';

function lignePanier(partiels: Partial<LignePanier> = {}): LignePanier {
  return {
    recolteId: 101,
    quantite: 2,
    produit: 'Tomate',
    prixUnitaire: 450,
    unite: 'kg',
    nomProducteur: 'Awa Diop',
    quantiteDisponible: 100,
    statut: 'DISPONIBLE',
    ...partiels,
  };
}

function acheteur(): AcheteurResponse {
  return {
    id: 7,
    utilisateurId: 12,
    nom: 'Fall',
    prenom: 'Mor',
    email: 'mor.fall@example.sn',
    telephone: '780000000',
    typeAcheteur: 'RESTAURATEUR',
  };
}

function ligneCommande(partiels: Partial<LigneCommandeResponse> = {}): LigneCommandeResponse {
  return {
    id: 801,
    recolteId: 101,
    produit: 'Tomate',
    unite: 'kg',
    quantite: 2,
    prixUnitaire: 600,
    sousTotal: 1200,
    ...partiels,
  };
}

/** Le serveur fige ses propres prix : total et lignes ne viennent pas du snapshot local. */
function commande(partiels: Partial<CommandeResponse> = {}): CommandeResponse {
  return {
    id: 512,
    acheteurId: 7,
    nomAcheteur: 'Mor Fall',
    dateCreation: '2026-09-28T10:15:00',
    statut: 'EN_ATTENTE',
    total: 1200,
    modeReception: 'RETRAIT',
    adresseLivraison: null,
    telephoneLivraison: null,
    instructionsLivraison: null,
    lignes: [ligneCommande()],
    ...partiels,
  };
}

function element<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T {
  const trouve = racine.querySelector<T>(selecteur);
  if (!trouve) {
    throw new Error(`Élément introuvable : ${selecteur}`);
  }
  return trouve;
}

function elements<T extends HTMLElement>(racine: HTMLElement, selecteur: string): T[] {
  return Array.from(racine.querySelectorAll<T>(selecteur));
}

/** Le formatage français sépare les milliers par une espace insécable. */
function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('Commande (tunnel acheteur)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Commande>;
  let racine: HTMLElement;
  let panier: PanierService;

  /** La page lit le panier au démarrage : le stockage est donc posé avant la création. */
  function ouvrir(contenu: readonly LignePanier[] = [lignePanier()]): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (contenu.length > 0) {
      localStorage.setItem(CLE_PANIER, JSON.stringify(contenu));
    }
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    // Aucune route n'est déclarée ici : la redirection de l'intercepteur ne doit pas échouer.
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    panier = TestBed.inject(PanierService);
    fixture = TestBed.createComponent(Commande);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function profilOk(): void {
    http.expectOne(MOI).flush(acheteur());
    fixture.detectChanges();
  }

  /** POST /api/commandes en attente. */
  function demandeCommande(): TestRequest {
    return http.expectOne(COMMANDES);
  }

  function corpsDe(requete: TestRequest): Record<string, unknown> {
    return requete.request.body as Record<string, unknown>;
  }

  /**
   * Les radios portent leur mode par l'entrée `value` de `formControlName` (aucun
   * attribut DOM) : ils sont donc repérés par leur ordre, celui de `MODES_RECEPTION`.
   */
  function radio(mode: ModeReception): HTMLInputElement {
    const trouve = elements<HTMLInputElement>(
      racine,
      'input[formcontrolname="modeReception"]',
    )[MODES_RECEPTION.indexOf(mode)];
    if (!trouve) {
      throw new Error(`Radio du mode introuvable : ${mode}`);
    }
    return trouve;
  }

  function choisirMode(mode: ModeReception): void {
    radio(mode).click();
    fixture.detectChanges();
  }

  function saisir(id: string, valeur: string): void {
    const champ = element<HTMLInputElement>(racine, `#${id}`);
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Le bouton « Vérifier la commande » est de type submit : c'est la soumission du formulaire. */
  function soumettre(): void {
    element(racine, 'form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /** Ouverture, profil chargé, puis écran de révision atteint en retrait. */
  function jusquaRevision(contenu?: readonly LignePanier[]): void {
    ouvrir(contenu);
    profilOk();
    soumettre();
  }

  /** Révision atteinte en livraison, champs renseignés. */
  function jusquaRevisionEnLivraison(
    valeurs: { adresse?: string; telephone?: string; instructions?: string } = {},
  ): void {
    ouvrir();
    profilOk();
    choisirMode('LIVRAISON');
    saisir('adresseLivraison', valeurs.adresse ?? 'Avenue Cheikh Anta Diop, Dakar');
    saisir('telephoneLivraison', valeurs.telephone ?? '780000000');
    if (valeurs.instructions !== undefined) {
      saisir('instructionsLivraison', valeurs.instructions);
    }
    soumettre();
  }

  /** Validation depuis l'écran de révision, puis réponse du serveur. */
  function validerEtRepondre(reponse: CommandeResponse): void {
    cliquer('#commande-confirmer');
    demandeCommande().flush(reponse);
    fixture.detectChanges();
  }

  /** Seul le texte du message, hors bouton « Réessayer l'envoi ». */
  function messageAffiche(): string {
    return texteDe(element(racine, '.message--erreur div p'));
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('chargement et panier', () => {
    it('attend le profil acheteur avant d’afficher le tunnel', () => {
      ouvrir();

      const demande = http.expectOne(MOI);
      expect(demande.request.method).toBe('GET');
      expect(demande.request.urlWithParams).toBe(MOI);
      expect(texteDe(element(racine, '.etat__texte'))).toBe('Chargement…');
      expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
      expect(racine.querySelector('form')).toBeNull();

      demande.flush(acheteur());
      fixture.detectChanges();
      expect(racine.querySelector('form')).not.toBeNull();
    });

    it('refuse une commande vide et renvoie au catalogue, sans aucun POST', () => {
      ouvrir([]);
      profilOk();

      expect(texteDe(element(racine, '.etat__titre'))).toBe('Votre panier est vide.');
      expect(racine.querySelector('form')).toBeNull();
      expect(racine.querySelector('.commande__recap')).toBeNull();
      expect(element<HTMLAnchorElement>(racine, '.etat a').getAttribute('href')).toBe('/recoltes');
      http.expectNone(COMMANDES);
    });

    it('signale un profil refusé et propose de réessayer, sans déconnexion', () => {
      ouvrir();
      localStorage.setItem(CLE_JETON, 'jeton-factice');
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify({ role: 'ACHETEUR' }));
      http
        .expectOne(MOI)
        .flush(
          { message: 'Accès refusé : vous n’avez pas les droits nécessaires.' },
          { status: 403, statusText: 'Forbidden' },
        );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Accès refusé : vous n’avez pas les droits nécessaires.',
      );
      expect(racine.querySelector('form')).toBeNull();
      expect(localStorage.getItem(CLE_JETON)).toBe('jeton-factice');

      cliquer('#profil-reessayer');
      profilOk();
      expect(racine.querySelector('form')).not.toBeNull();
    });
  });

  describe('récapitulatif', () => {
    it('reprend chaque ligne du panier avec produit, quantité, prix et sous-total', () => {
      ouvrir([
        lignePanier(),
        lignePanier({ recolteId: 102, produit: 'Oignon', quantite: 3, prixUnitaire: 250 }),
      ]);
      profilOk();

      const lignes = elements<HTMLElement>(racine, '.commande__recap .commande__ligne');
      expect(lignes).toHaveLength(2);
      expect(texteDe(lignes[0])).toContain('Tomate');
      expect(texteDe(lignes[0])).toContain('2 kg');
      expect(sansEspace(texteDe(lignes[0]))).toContain('450FCFA/kg');
      expect(sansEspace(texteDe(lignes[0]))).toContain('900FCFA');
      expect(sansEspace(texteDe(lignes[1]))).toContain('750FCFA');
      expect(sansEspace(texteDe(element(racine, '.commande__total-valeur')))).toBe('1650FCFA');
      expect(texteDe(element(racine, '.commande__mention'))).toBe(MENTION_TOTAL);
    });

    it('affiche toutes les lignes sous un seul titre de niveau 1', () => {
      ouvrir([
        lignePanier(),
        lignePanier({ recolteId: 102 }),
        lignePanier({ recolteId: 103 }),
      ]);
      profilOk();

      expect(elements(racine, 'h1').map(texteDe)).toEqual(['Commande']);
      expect(elements(racine, '.commande__recap .commande__ligne')).toHaveLength(3);
      expect(texteDe(element(racine, '.commande__zone-titre'))).toBe('Récapitulatif');
    });

    it('représent l’identité de l’acheteur sans aucun champ à saisir', () => {
      ouvrir();
      profilOk();

      expect(texteDe(element(racine, '.commande__acheteur'))).toContain('Mor Fall');
      expect(racine.querySelector('[formcontrolname="acheteurId"]')).toBeNull();
      expect(racine.querySelector('#acheteurId')).toBeNull();
      expect(elements(racine, 'form')).toHaveLength(1);
    });
  });

  describe('mode de réception', () => {
    it('groupe les deux modes dans un fieldset avec une légende', () => {
      ouvrir();
      profilOk();

      const groupe = element(racine, 'fieldset');
      expect(texteDe(element(groupe, 'legend'))).toBe('Mode de réception');
      const radios = elements<HTMLInputElement>(groupe, 'input[type="radio"]');
      expect(radios).toHaveLength(2);
      expect(elements(racine, '.commande__option-nom').map(texteDe)).toEqual([
        'Retrait',
        'Livraison',
      ]);
      expect(radios.every((entree) => entree.getAttribute('name') === 'modeReception')).toBe(true);
    });

    it('Retrait est choisi par défaut, marqué autrement que par la couleur', () => {
      ouvrir();
      profilOk();

      expect(radio('RETRAIT').checked).toBe(true);
      expect(radio('LIVRAISON').checked).toBe(false);
      expect(texteDe(element(racine, '.commande__option--choisi'))).toContain('Retrait');
      expect(texteDe(element(racine, '.commande__option--choisi'))).toContain(
        'Vous récupérez la commande auprès du producteur.',
      );
    });

    it('le retrait n’affiche ni adresse ni téléphone', () => {
      ouvrir();
      profilOk();

      expect(racine.querySelector('#adresseLivraison')).toBeNull();
      expect(racine.querySelector('#telephoneLivraison')).toBeNull();
      expect(racine.querySelector('#instructionsLivraison')).toBeNull();
      expect(texteDe(element(racine, '.commande__notice'))).toContain(
        'Aucun adresse ni téléphone n’est demandé pour un retrait',
      );
    });

    it('la livraison affiche adresse et téléphone obligatoires, instructions facultatives', () => {
      ouvrir();
      profilOk();
      choisirMode('LIVRAISON');

      expect(element(racine, '#adresseLivraison').hasAttribute('required')).toBe(true);
      expect(element(racine, '#telephoneLivraison').hasAttribute('required')).toBe(true);
      expect(element(racine, '#instructionsLivraison').hasAttribute('required')).toBe(false);
      const labels = elements<HTMLLabelElement>(racine, '.commande__champs .champ__libelle');
      expect(labels.filter((entree) => texteDe(entree).includes('(obligatoire)'))).toHaveLength(2);
      expect(racine.querySelector('#instructionsLivraison-aide')).not.toBeNull();
      expect(texteDe(racine)).toContain('Facultatif');
    });

    it('la livraison sans adresse ni téléphone est refusée avant tout appel', () => {
      ouvrir();
      profilOk();
      choisirMode('LIVRAISON');

      soumettre();

      expect(racine.querySelector('.commande__reception')).toBeNull();
      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Les informations de réception sont incomplètes',
      );
      expect(elements(racine, '.champ__erreur').map(texteDe)).toEqual([
        'Ce champ est obligatoire pour une livraison.',
        'Ce champ est obligatoire pour une livraison.',
      ]);
      expect(element(racine, '#adresseLivraison').getAttribute('aria-invalid')).toBe('true');
      http.expectNone(COMMANDES);
    });

    it('la livraison incomplète, téléphone seul manquant, ne soumet rien', () => {
      ouvrir();
      profilOk();
      choisirMode('LIVRAISON');
      saisir('adresseLivraison', 'Avenue Cheikh Anta Diop, Dakar');

      soumettre();

      expect(racine.querySelector('.commande__reception')).toBeNull();
      expect(elements(racine, '.champ__erreur')).toHaveLength(1);
      http.expectNone(COMMANDES);
    });

    it('un champ corrigé n’est plus signalé à la soumission suivante', () => {
      ouvrir();
      profilOk();
      choisirMode('LIVRAISON');
      soumettre();
      expect(elements(racine, '.champ__erreur')).toHaveLength(2);

      saisir('adresseLivraison', 'Avenue Cheikh Anta Diop, Dakar');
      saisir('telephoneLivraison', '780000000');
      soumettre();

      expect(racine.querySelector('.commande__reception')).not.toBeNull();
      http.expectNone(COMMANDES);
    });
  });

  describe('révision obligatoire avant envoi', () => {
    it('la saisie ne déclenche aucun POST, la révision précède l’envoi', () => {
      jusquaRevision();

      http.expectNone(COMMANDES);
      expect(texteDe(element(racine, '#titre-revision'))).toBe('Réception');
      expect(racine.querySelector('form')).toBeNull();
      expect(texteDe(element(racine, '.commande__choix'))).toBe('Mode de réception : Retrait');
      expect(texteDe(racine)).toContain('Rien n’est encore enregistré.');
      expect(texteDe(element(racine, '#commande-confirmer'))).toBe('Passer la commande');
      expect(racine.querySelector('.commande__mention')).not.toBeNull();
    });

    it('le focus se pose sur le titre de la révision', () => {
      jusquaRevision();

      expect(document.activeElement?.getAttribute('id')).toBe('titre-revision');
    });

    it('les informations de livraison sont relues à la révision', () => {
      jusquaRevisionEnLivraison({ instructions: 'Livrer le matin' });

      const chiffres = texteDe(element(racine, '.commande__chiffres'));
      expect(chiffres).toContain('Avenue Cheikh Anta Diop, Dakar');
      expect(chiffres).toContain('780000000');
      expect(chiffres).toContain('Livrer le matin');
      expect(texteDe(element(racine, '.commande__choix'))).toBe('Mode de réception : Livraison');
    });

    it('« Modifier les informations » ramène la saisie sans envoyer', () => {
      jusquaRevision();

      cliquer('#commande-modifier');

      expect(racine.querySelector('form')).not.toBeNull();
      expect(racine.querySelector('.commande__reception')).toBeNull();
      http.expectNone(COMMANDES);
    });
  });

  describe('requête envoyée', () => {
    it('construit exactement le CommandeRequest du DTO, sans montant ni statut', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');

      const demande = demandeCommande();
      expect(demande.request.method).toBe('POST');
      expect(demande.request.urlWithParams).toBe(COMMANDES);
      expect(demande.request.params.keys()).toEqual([]);

      const corps = corpsDe(demande);
      expect(Object.keys(corps).sort()).toEqual([
        'acheteurId',
        'adresseLivraison',
        'instructionsLivraison',
        'lignes',
        'modeReception',
        'telephoneLivraison',
      ]);
      expect(corps['acheteurId']).toBe(7);
      expect(corps['modeReception']).toBe('RETRAIT');
      expect(corps['total']).toBeUndefined();
      expect(corps['statut']).toBeUndefined();
      expect(corps['lignes']).toEqual([{ recolteId: 101, quantite: 2 }]);
    });

    it('un retrait n’envoie aucun champ de livraison, même déjà saisis', () => {
      ouvrir();
      profilOk();
      choisirMode('LIVRAISON');
      saisir('adresseLivraison', 'Avenue Cheikh Anta Diop, Dakar');
      saisir('telephoneLivraison', '780000000');
      saisir('instructionsLivraison', 'Livrer le matin');
      choisirMode('RETRAIT');
      soumettre();
      cliquer('#commande-confirmer');

      const corps = corpsDe(demandeCommande());
      expect(corps['modeReception']).toBe('RETRAIT');
      expect(corps['adresseLivraison']).toBeNull();
      expect(corps['telephoneLivraison']).toBeNull();
      expect(corps['instructionsLivraison']).toBeNull();
    });

    it('une livraison envoie l’adresse et le téléphone nettoyés, instructions vides à null', () => {
      ouvrir([
        lignePanier(),
        lignePanier({ recolteId: 102, produit: 'Oignon', quantite: 1.5, prixUnitaire: 250 }),
      ]);
      profilOk();
      choisirMode('LIVRAISON');
      saisir('adresseLivraison', '  Avenue Cheikh Anta Diop, Dakar  ');
      saisir('telephoneLivraison', '780000000');
      soumettre();
      cliquer('#commande-confirmer');

      const corps = corpsDe(demandeCommande());
      expect(corps['adresseLivraison']).toBe('Avenue Cheikh Anta Diop, Dakar');
      expect(corps['telephoneLivraison']).toBe('780000000');
      expect(corps['instructionsLivraison']).toBeNull();
      expect(corps['lignes']).toEqual([
        { recolteId: 101, quantite: 2 },
        { recolteId: 102, quantite: 1.5 },
      ]);
    });

    it('ne laisse pas partir deux commandes au premier double clic', () => {
      jusquaRevision();
      const bouton = element<HTMLButtonElement>(racine, '#commande-confirmer');

      bouton.click();
      bouton.click();
      fixture.detectChanges();

      expect(http.match(COMMANDES)).toHaveLength(1);
      expect(bouton.disabled).toBe(true);
      expect(bouton.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(bouton)).toBe('…');
      expect(texteDe(element(racine, '.commande__envoi'))).toBe('Envoi de la commande…');
    });
  });

  describe('commande créée', () => {
    it('affiche la réponse du serveur, total et prix compris, et vide le panier', () => {
      jusquaRevision();
      validerEtRepondre(commande());

      expect(panier.lignes()).toEqual([]);
      expect(localStorage.getItem(CLE_PANIER)).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('titre-succes');
      expect(texteDe(element(racine, '.commande__succes .commande__surtitre'))).toBe(
        'Commande n° 512',
      );
      expect(texteDe(element(racine, '#titre-succes'))).toBe('Commande enregistrée.');
      expect(sansEspace(texteDe(element(racine, '.commande__chiffres-total')))).toContain(
        '1200FCFA',
      );
      expect(sansEspace(texteDe(element(racine, '.commande__ligne')))).toContain('600FCFA');
      expect(texteDe(element(racine, '.commande__ligne'))).toContain('2 kg');
      expect(texteDe(element(racine, '.commande__chiffres'))).toContain('28/09/2026 à 10:15');
      expect(texteDe(element(racine, '.badge'))).toBe('En attente');
      expect(element<HTMLAnchorElement>(racine, '.commande__actions a').getAttribute('href')).toBe(
        '/recoltes',
      );
    });

    it('rappelle qu’aucun paiement n’a été effectué', () => {
      jusquaRevision();
      validerEtRepondre(commande());

      expect(texteDe(element(racine, '.commande__succes .commande__mention'))).toBe(
        'Commande enregistrée — paiement non effectué.',
      );
      expect(texteDe(racine)).not.toMatch(/paiement réussi|payé|transaction réussie|commande payée/i);
      expect(racine.querySelector('.commande__recap')).toBeNull();
      expect(racine.querySelector('form')).toBeNull();
    });

    it('conserve le statut renvoyé par le serveur, sans le réécrire', () => {
      jusquaRevision();
      validerEtRepondre(commande({ statut: 'CONFIRMEE' }));

      expect(texteDe(element(racine, '.badge'))).toBe('Confirmée');
      expect(racine.querySelector('.commande__mention')).toBeNull();
    });

    it('affiche les informations de livraison renvoyées par le serveur', () => {
      jusquaRevisionEnLivraison();
      validerEtRepondre(
        commande({
          modeReception: 'LIVRAISON',
          adresseLivraison: 'Avenue Cheikh Anta Diop, Dakar',
          telephoneLivraison: '780000000',
          instructionsLivraison: null,
        }),
      );

      const chiffres = texteDe(element(racine, '.commande__chiffres'));
      expect(chiffres).toContain('Avenue Cheikh Anta Diop, Dakar');
      expect(chiffres).toContain('780000000');
      expect(chiffres).toContain('Livraison');
      expect(chiffres).not.toContain('Instructions');
    });
  });

  describe('erreurs du serveur', () => {
    it('400 métier : message du serveur, panier et saisies conservés', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');
      reponseErreur(
        { message: 'Stock insuffisant pour « Tomate » : disponible 5.00, demandé 6.00.' },
        400,
      );

      expect(texteDe(element(racine, '.message--erreur'))).toContain('Stock insuffisant pour');
      expect(racine.querySelector('.commande__succes')).toBeNull();
      expect(panier.lignes()).toHaveLength(1);
      expect(localStorage.getItem(CLE_PANIER)).not.toBeNull();
      expect(racine.querySelector('.commande__reception')).not.toBeNull();
    });

    it('400 avec erreurs par champ : retour à la saisie, panier conservé', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');
      reponseErreur(
        { message: 'Requête invalide.', erreurs: { modeReception: 'Mode obligatoire.' } },
        400,
      );

      expect(racine.querySelector('form')).not.toBeNull();
      expect(messageAffiche()).toBe(
        'Le serveur a refusé une des informations saisies.',
      );
      expect(panier.lignes()).toHaveLength(1);
    });

    it('401 : la purge et la redirection restent celles de l’intercepteur', () => {
      ouvrir();
      localStorage.setItem(CLE_JETON, 'jeton-a-expirer');
      profilOk();
      soumettre();
      cliquer('#commande-confirmer');
      reponseErreur(
        { message: 'Authentification requise : fournissez un jeton JWT valide.' },
        401,
      );

      expect(localStorage.getItem(CLE_JETON)).toBeNull();
      expect(racine.querySelector('.commande__succes')).toBeNull();
      expect(racine.querySelector('.message--erreur')).toBeNull();
      expect(panier.lignes()).toHaveLength(1);
    });

    it('403 : refus affiché, session conservée, aucune déconnexion', () => {
      ouvrir();
      localStorage.setItem(CLE_JETON, 'jeton-valide');
      profilOk();
      soumettre();
      cliquer('#commande-confirmer');
      reponseErreur({ message: 'Accès refusé : commande interdite.' }, 403);

      expect(messageAffiche()).toBe('Accès refusé : commande interdite.');
      expect(localStorage.getItem(CLE_JETON)).toBe('jeton-valide');
      expect(racine.querySelector('.commande__succes')).toBeNull();
    });

    it('404 : la récolte disparue est nommée, le panier reste à composer', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');
      reponseErreur({ message: 'Récolte introuvable avec l\'id : 101' }, 404);

      expect(texteDe(element(racine, '.message--erreur'))).toContain(
        'Une récolte du panier n’existe plus sur le catalogue.',
      );
      expect(panier.lignes()).toHaveLength(1);
      expect(racine.querySelector('#erreur-reessayer')).not.toBeNull();
    });

    it('500 : message du serveur, aucune commande inventée, réessai possible', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');
      reponseErreur({ message: 'Une erreur inattendue est survenue.' }, 500);

      expect(messageAffiche()).toBe(
        'Une erreur inattendue est survenue.',
      );
      expect(racine.querySelector('.commande__succes')).toBeNull();
      expect(element<HTMLButtonElement>(racine, '#commande-confirmer').disabled).toBe(false);

      cliquer('#erreur-reessayer');
      demandeCommande().flush(commande());
      fixture.detectChanges();
      expect(racine.querySelector('.commande__succes')).not.toBeNull();
    });

    it('une panne réseau n’est jamais masquée', () => {
      jusquaRevision();
      cliquer('#commande-confirmer');
      demandeCommande().error(new ProgressEvent('error'), {
        status: 0,
        statusText: 'Connexion coupée',
      });
      fixture.detectChanges();

      expect(messageAffiche()).toBe(
        'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
      );
      expect(panier.lignes()).toHaveLength(1);
    });
  });

  function reponseErreur(corps: Record<string, unknown>, statut: number): void {
    demandeCommande().flush(corps, { status: statut, statusText: 'Refus' });
    fixture.detectChanges();
  }
});

/**
 * La protection de la route est vérifiée sur la table réelle ; le refus des autres
 * rôles est couvert par roleGuard.spec et authGuard.spec.
 */
describe('route de la commande acheteur', () => {
  interface RouteProtegee {
    canActivate?: unknown[];
    data?: { roles?: string[] };
    title?: string;
    loadComponent?: unknown;
  }

  function route(path: string): RouteProtegee {
    const trouvee = routes.find((entree) => entree.path === path);
    if (!trouvee) {
      throw new Error(`Route introuvable : ${path}`);
    }
    return trouvee as unknown as RouteProtegee;
  }

  it('exige authGuard puis roleGuard pour ACHETEUR uniquement', () => {
    const protegee = route('acheteur/commande');

    expect(protegee.canActivate?.[0]).toBe(authGuard);
    expect(protegee.canActivate?.[1]).toBe(roleGuard);
    expect(protegee.data).toEqual({ roles: ['ACHETEUR'] });
    expect(protegee.title).toBe('SunuRecolte — Commande');
    expect(typeof protegee.loadComponent).toBe('function');
  });

  it('ne touche ni au panier ni au catalogue publics', () => {
    expect(route('acheteur/panier').data).toEqual({ roles: ['ACHETEUR'] });
    expect(route('recoltes').canActivate).toBeUndefined();
  });
});
