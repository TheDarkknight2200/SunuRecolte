import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { PrixMarcheResponse } from '../../../core/modeles/domaine.modeles';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { PrixMarche } from './prix-marche';

const API = 'http://localhost:8080/api';
const PRIX = `${API}/prix-marche`;

const SESSION_ADMIN: SessionUtilisateur = {
  utilisateurId: 1,
  nom: 'Sow',
  prenom: 'Fatou',
  email: 'admin@sunurecolte.sn',
  role: 'ADMIN',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '1', exp: expirationSecondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `entete.${base64}.signature`;
}

function dansUneHeure(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

function prix(id: number, surcharge: Partial<PrixMarcheResponse> = {}): PrixMarcheResponse {
  return {
    id,
    produit: 'Mande de 1er choix',
    unite: 'sac',
    prixMoyen: 12500,
    marcheReference: 'Marché de Thiaroye',
    dateMiseAJour: '2026-05-12T08:30:00',
    ...surcharge,
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

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function saisir(racine: HTMLElement, selecteur: string, valeurSaisie: string): void {
  const champ = element<HTMLInputElement>(racine, selecteur);
  champ.value = valeurSaisie;
  champ.dispatchEvent(new Event('input'));
}

describe('PrixMarche (administration)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<PrixMarche>;
  let racine: HTMLElement;

  function ouvrir(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrixMarche);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function listeEnAttente() {
    return http.expectOne(PRIX);
  }

  function charger(lignes: PrixMarcheResponse[]): void {
    listeEnAttente().flush(lignes);
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  function soumettre(): void {
    element<HTMLFormElement>(racine, 'form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function saisirPrixCompletes(): void {
    saisir(racine, '#produit', 'Tomate locale');
    saisir(racine, '#unite', 'kg');
    saisir(racine, '#prixMoyen', '450');
    fixture.detectChanges();
  }

  function presserTab(shift: boolean = false): void {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }),
    );
  }

  function escape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  }

  function ouvrirModale(id = 5): void {
    element<HTMLButtonElement>(racine, `#supprimer-${id}`).click();
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/prix-marche sans aucun paramètre et garde l’ordre du serveur', () => {
    ouvrir();

    const requete = listeEnAttente();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(PRIX);
    expect(requete.request.params.keys().length).toBe(0);

    requete.flush([prix(7, { produit: 'Oignon' }), prix(5)]);
    fixture.detectChanges();

    const produits = elements<HTMLElement>(racine, '.prix-marche__produit').map(texteDe);
    expect(produits).toEqual(['Oignon', 'Mande de 1er choix']);
  });

  it('propose les notifications, seules données transverses de l’ADMIN, depuis l’écran', () => {
    ouvrir();
    charger([prix(5)]);

    const lien = element<HTMLAnchorElement>(racine, '#lien-notifications-prix-marche');
    expect(lien.getAttribute('href')).toBe('/notifications');
    expect(texteDe(lien)).toBe('Notifications');
  });

  it('affiche l’état de chargement, jamais l’état vide pendant la requête', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des prix indicatifs…');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Aucun prix indicatif publié');
    expect(racine.querySelector('.prix-marche__liste')).toBeNull();

    charger([]);
  });

  it('rend la ligne du serveur avec le montant et l’horodatage formatés', () => {
    ouvrir();
    charger([prix(5)]);

    const carte = element<HTMLElement>(racine, '.prix-marche__carte');
    expect(texteDe(element(racine, 'h1'))).toBe('Prix indicatifs');
    expect(texteDe(element(racine, '.prix-marche__liste-titre'))).toBe('1 prix indicatif');
    expect(texteDe(carte)).toContain('Mande de 1er choix');
    expect(texteDe(carte)).toContain('12 500 FCFA');
    expect(texteDe(carte)).toContain('sac');
    expect(texteDe(carte)).toContain('Marché de Thiaroye');
    expect(texteDe(carte)).toContain('12/05/2026 à 08:30');
    expect(texteDe(carte)).not.toContain('null');
    expect(texteDe(carte)).not.toContain('undefined');
  });

  it('rend un signe unique pour le marché de référence absent', () => {
    ouvrir();
    charger([prix(5, { marcheReference: null })]);

    expect(texteDe(element(racine, '.prix-marche__carte'))).toContain('—');
  });

  it('propose de déposer une ligne dès la liste vide, sans état vide concurrent', () => {
    ouvrir();
    charger([]);

    expect(texteDe(element(racine, '.etat'))).toContain('Aucun prix indicatif publié.');
    expect(racine.querySelector('.prix-marche__liste')).toBeNull();
    expect(element(racine, '#formulaire-soumettre')).toBeTruthy();
  });

  it('compte les lignes au singulier comme au pluriel', () => {
    ouvrir();
    charger([prix(5)]);
    expect(texteDe(element(racine, '.prix-marche__liste-titre'))).toBe('1 prix indicatif');

    cliquer('#bouton-actualiser');
    charger([prix(5), prix(6), prix(7)]);
    expect(texteDe(element(racine, '.prix-marche__liste-titre'))).toBe('3 prix indicatifs');
  });

  it('affiche l’erreur du backend avec Réessayer, sans état vide', () => {
    ouvrir();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service est temporairement indisponible.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le service est temporairement indisponible.',
    );
    expect(texteDe(racine)).not.toContain('Aucun prix indicatif publié');
  });

  it('Réessayer relance la liste et remplace le message par les lignes', () => {
    ouvrir();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service a refusé la requête.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    cliquer('#erreur-reessayer');
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des prix indicatifs…');
    charger([prix(5)]);

    expect(elements(racine, '.prix-marche__carte')).toHaveLength(1);
    expect(element(racine, 'form').querySelector('.message--erreur')).toBeNull();
  });

  describe('formulaire de dépôt', () => {
    beforeEach(() => {
      ouvrir();
      charger([prix(5)]);
    });

    it('refuse l’envoi d’une saisie vide sans aucune requête', () => {
      soumettre();

      expect(http.match(() => true)).toHaveLength(0);
      expect(texteDe(element(racine, '#produit-erreur'))).toBe('Ce champ est obligatoire.');
      expect(texteDe(element(racine, '#unite-erreur'))).toBe('Ce champ est obligatoire.');
      expect(texteDe(element(racine, '#prixMoyen-erreur'))).toBe('Ce champ est obligatoire.');
      expect(element(racine, '#produit').getAttribute('aria-invalid')).toBe('true');
      expect(racine.querySelector('#marcheReference-erreur')).toBeNull();
    });

    it('aligne la borne de prix sur le DTO : jamais de prix nul ni négatif envoyé', () => {
      saisir(racine, '#produit', 'Tomate locale');
      saisir(racine, '#unite', 'kg');
      saisir(racine, '#prixMoyen', '0');
      fixture.detectChanges();

      soumettre();

      expect(http.match(() => true)).toHaveLength(0);
      expect(texteDe(element(racine, '#prixMoyen-erreur'))).toBe(
        'Ce prix doit être supérieur à 0.',
      );
    });

    it('refuse un prix au-dessus de la précision stockée, sans requête', () => {
      saisir(racine, '#produit', 'Tomate locale');
      saisir(racine, '#unite', 'kg');
      saisir(racine, '#prixMoyen', '100000000000');
      fixture.detectChanges();

      soumettre();

      expect(http.match(() => true)).toHaveLength(0);
      expect(texteDe(element(racine, '#prixMoyen-erreur'))).toBe(
        'Ce prix dépasse la valeur maximale autorisée.',
      );
    });

    it('repousse une saisie plus longue que la colonne, sans requête', () => {
      saisir(racine, '#produit', 'A'.repeat(151));
      saisir(racine, '#unite', 'kg');
      saisir(racine, '#prixMoyen', '450');
      fixture.detectChanges();

      soumettre();

      expect(http.match(() => true)).toHaveLength(0);
      expect(texteDe(element(racine, '#produit-erreur'))).toBe('Ce champ est trop long.');
    });

    it('envoie un POST avec le contrat du DTO, marché vide envoyé comme null', () => {
      saisirPrixCompletes();
      soumettre();

      const requete = http.expectOne(PRIX);
      expect(requete.request.method).toBe('POST');
      expect(requete.request.body).toEqual({
        produit: 'Tomate locale',
        unite: 'kg',
        prixMoyen: 450,
        marcheReference: null,
      });

      requete.flush(prix(8, { produit: 'Tomate locale', unite: 'kg', prixMoyen: 450 }), {
        status: 201,
        statusText: 'Created',
      });
      fixture.detectChanges();
    });

    it('nettoie les blancs de la saisie avant l’envoi', () => {
      saisir(racine, '#produit', '  Mande rouge  ');
      saisir(racine, '#unite', '  sac  ');
      saisir(racine, '#prixMoyen', '15000');
      saisir(racine, '#marcheReference', '   ');
      fixture.detectChanges();

      soumettre();

      const requete = http.expectOne(PRIX);
      expect(requete.request.body).toEqual({
        produit: 'Mande rouge',
        unite: 'sac',
        prixMoyen: 15000,
        marcheReference: null,
      });
      requete.flush(prix(9, { produit: 'Mande rouge' }));
      fixture.detectChanges();
    });

    it('ajoute la réponse du serveur, annonce le dépôt et rend le focus sur la liste', () => {
      saisirPrixCompletes();
      soumettre();
      http.expectOne(PRIX).flush(prix(8, { produit: 'Tomate locale', unite: 'kg', prixMoyen: 450 }));
      fixture.detectChanges();

      const succes = element(racine, '.message--succes');
      expect(succes.getAttribute('role')).toBe('status');
      expect(texteDe(element(racine, '.message--succes p'))).toBe(
        '« Tomate locale » a été ajouté aux prix indicatifs.',
      );
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(2);
      expect(texteDe(elements<HTMLElement>(racine, '.prix-marche__produit')[1])).toBe(
        'Tomate locale',
      );
      // Le formulaire est vidé : la saisie précédente ne se représente pas deux fois.
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('');
      expect(texteDe(element(racine, '#formulaire-titre'))).toBe('Nouveau prix indicatif');
      expect(document.activeElement?.getAttribute('id')).toBe('bouton-actualiser');
    });

    it('un seul POST pour deux envois : le bouton se verrouille pendant l’appel', () => {
      saisirPrixCompletes();

      const formulaire = element<HTMLFormElement>(racine, 'form');
      formulaire.dispatchEvent(new Event('submit'));
      formulaire.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const demandes = http.match((requete) => requete.method === 'POST');
      expect(demandes).toHaveLength(1);

      const bouton = element<HTMLButtonElement>(racine, '#formulaire-soumettre');
      expect(bouton.disabled).toBe(true);
      expect(bouton.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(bouton)).toBe('…');
      expect(element<HTMLButtonElement>(racine, '#modifier-5').disabled).toBe(true);
      expect(element<HTMLButtonElement>(racine, '#supprimer-5').disabled).toBe(true);
      expect(element<HTMLButtonElement>(racine, '#bouton-actualiser').disabled).toBe(true);

      demandes[0].flush(prix(8, { produit: 'Tomate locale' }));
      fixture.detectChanges();
    });

    it('un 400 global du backend est repris dans le formulaire, saisie conservée', () => {
      saisirPrixCompletes();
      soumettre();
      http.expectOne(PRIX).flush(
        { statut: 400, message: 'Le prix moyen dépasse la précision autorisée.', timestamp: 'x' },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.prix-marche__formulaire .message--erreur'))).toBe(
        'Le prix moyen dépasse la précision autorisée.',
      );
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('Tomate locale');
      expect(racine.querySelector('.message--succes')).toBeNull();
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(1);
    });

    it('un 403 sur le dépôt reste un refus : message, session et saisie conservés', () => {
      const jeton = fabriquerJeton(dansUneHeure());
      localStorage.setItem(CLE_JETON, jeton);
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));

      saisirPrixCompletes();
      soumettre();
      http.expectOne(PRIX).flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
          timestamp: 'x',
        },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.prix-marche__formulaire .message--erreur'))).toContain(
        'Accès refusé',
      );
      expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
      expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('Tomate locale');
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(1);
    });
  });

  describe('modification d’une ligne', () => {
    beforeEach(() => {
      ouvrir();
      charger([prix(5), prix(6, { produit: 'Oignon' })]);
    });

    it('charge la ligne dans le formulaire et marque la carte concernée', () => {
      cliquer('#modifier-5');

      expect(texteDe(element(racine, '#formulaire-titre'))).toBe('Modifier un prix indicatif');
      expect(texteDe(element(racine, '.prix-marche__aide'))).toContain('Ligne n° 5');
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('Mande de 1er choix');
      expect(element<HTMLInputElement>(racine, '#unite').value).toBe('sac');
      expect(element<HTMLInputElement>(racine, '#prixMoyen').value).toBe('12500');
      expect(element<HTMLInputElement>(racine, '#marcheReference').value).toBe(
        'Marché de Thiaroye',
      );
      expect(texteDe(element(racine, '#formulaire-soumettre'))).toBe(
        'Enregistrer les modifications',
      );
      expect(
        element(racine, '.prix-marche__carte').classList.contains('prix-marche__carte--en-cours'),
      ).toBe(true);
      expect(document.activeElement?.getAttribute('id')).toBe('produit');
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('une ligne sans marché de référence se charge sans « null » dans le champ', () => {
      cliquer('#bouton-actualiser');
      http.expectOne(PRIX).flush([prix(5, { marcheReference: null })]);
      fixture.detectChanges();

      cliquer('#modifier-5');

      expect(element<HTMLInputElement>(racine, '#marcheReference').value).toBe('');
      expect(texteDe(racine)).not.toContain('null');
    });

    it('PUT /{id} avec un corps réduit au contrat, sans id ni date de mise à jour', () => {
      cliquer('#modifier-5');
      saisir(racine, '#prixMoyen', '13000');
      soumettre();

      const requete = http.expectOne(`${PRIX}/5`);
      expect(requete.request.method).toBe('PUT');
      expect(requete.request.params.keys().length).toBe(0);
      expect(Object.keys(requete.request.body).sort()).toEqual([
        'marcheReference',
        'prixMoyen',
        'produit',
        'unite',
      ]);
      expect(requete.request.body).toEqual({
        produit: 'Mande de 1er choix',
        unite: 'sac',
        prixMoyen: 13000,
        marcheReference: 'Marché de Thiaroye',
      });

      requete.flush(prix(5, { prixMoyen: 13000, dateMiseAJour: '2026-09-29T10:15:00' }));
      fixture.detectChanges();
    });

    it('remplace la ligne par la réponse du serveur puis revient en mode création', () => {
      cliquer('#modifier-5');
      saisir(racine, '#produit', 'Mande première qualité');
      soumettre();
      http.expectOne(`${PRIX}/5`).flush(prix(5, { produit: 'Mande première qualité' }));
      fixture.detectChanges();

      expect(texteDe(elements<HTMLElement>(racine, '.prix-marche__produit')[0])).toBe(
        'Mande première qualité',
      );
      expect(texteDe(element(racine, '.message--succes p'))).toBe(
        '« Mande première qualité » a été mis à jour.',
      );
      expect(racine.querySelector('#formulaire-annuler')).toBeNull();
      expect(racine.querySelector('.prix-marche__carte--en-cours')).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('bouton-actualiser');
    });

    it('Annuler abandonne l’édition sans requête et laisse la ligne intacte', () => {
      cliquer('#modifier-5');
      saisir(racine, '#produit', 'Produit abandonné');
      cliquer('#formulaire-annuler');

      expect(http.match(() => true)).toHaveLength(0);
      expect(texteDe(element(racine, '#formulaire-titre'))).toBe('Nouveau prix indicatif');
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('');
      expect(racine.querySelector('.prix-marche__carte--en-cours')).toBeNull();
      expect(texteDe(elements<HTMLElement>(racine, '.prix-marche__produit')[0])).toBe(
        'Mande de 1er choix',
      );
    });

    it('une 404 sur une ligne retirée entre-temps reprend le message du serveur', () => {
      cliquer('#modifier-5');
      soumettre();
      http.expectOne(`${PRIX}/5`).flush(
        { statut: 404, message: "PrixMarche introuvable avec l'id : 5", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.prix-marche__formulaire .message--erreur'))).toContain(
        "PrixMarche introuvable avec l'id : 5",
      );
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('Mande de 1er choix');
      expect(texteDe(element(racine, '#formulaire-titre'))).toBe('Modifier un prix indicatif');
    });
  });

  describe('suppression confirmée', () => {
    beforeEach(() => {
      ouvrir();
      charger([prix(5), prix(6, { produit: 'Oignon' })]);
    });

    it('ne retire jamais sans confirmation : la modale s’ouvre, aucun DELETE', () => {
      ouvrirModale();

      const modale = element(racine, '.prix-marche__modale');
      expect(modale.getAttribute('role')).toBe('dialog');
      expect(modale.getAttribute('aria-modal')).toBe('true');
      expect(modale.getAttribute('aria-labelledby')).toBe('suppression-titre');
      expect(texteDe(element(racine, '#suppression-titre'))).toBe(
        'Voulez-vous vraiment retirer ce prix indicatif ?',
      );
      expect(texteDe(modale)).toContain('Mande de 1er choix');
      expect(texteDe(modale)).toContain('12 500 FCFA / sac');
      expect(texteDe(modale)).toContain('Cette action est définitive');
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('déplace le focus sur Annuler, jamais sur le bouton destructif', () => {
      ouvrirModale();

      const actif = document.activeElement as HTMLElement;
      expect(actif.getAttribute('id')).toBe('suppression-annuler');
      expect(element(racine, '.prix-marche__modale').contains(actif)).toBe(true);
    });

    it('Annuler ferme la modale et rend le focus au bouton déclencheur', () => {
      ouvrirModale();
      cliquer('#suppression-annuler');

      expect(racine.querySelector('.prix-marche__modale')).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('supprimer-5');
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(2);
    });

    it('Escape et un clic sur le fond ferment la modale sans rien retirer', () => {
      ouvrirModale();
      escape();
      expect(racine.querySelector('.prix-marche__modale')).toBeNull();

      ouvrirModale();
      element(racine, '.prix-marche__fond').click();
      fixture.detectChanges();

      expect(racine.querySelector('.prix-marche__modale')).toBeNull();
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('un clic dans la modale ne la ferme pas', () => {
      ouvrirModale();
      element(racine, '.prix-marche__modale').click();
      fixture.detectChanges();

      expect(element(racine, '.prix-marche__modale')).toBeTruthy();
      expect(http.match((requete) => requete.method === 'DELETE')).toHaveLength(0);
    });

    it('Tab et Shift+Tab restent piégés dans la modale ouverte', () => {
      ouvrirModale();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-annuler');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-confirmer');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-annuler');

      presserTab(true);
      expect(document.activeElement?.getAttribute('id')).toBe('suppression-confirmer');

      expect(element(racine, '.prix-marche__modale').contains(document.activeElement)).toBe(true);
    });

    it('confirmer envoie DELETE /{id}, sans corps ni paramètre', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');

      const requete = http.expectOne(`${PRIX}/5`);
      expect(requete.request.method).toBe('DELETE');
      expect(requete.request.params.keys().length).toBe(0);

      requete.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
    });

    it('retire la ligne du serveur, l’annonce et rend le focus sur la liste', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${PRIX}/5`).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(elements<HTMLElement>(racine, '.prix-marche__produit').map(texteDe)).toEqual([
        'Oignon',
      ]);
      expect(texteDe(element(racine, '.message--succes p'))).toBe(
        '« Mande de 1er choix » a été retiré des prix indicatifs.',
      );
      expect(racine.querySelector('.prix-marche__modale')).toBeNull();
      // Le bouton déclencheur a disparu avec sa carte : le focus reprend une cible stable.
      expect(document.activeElement?.getAttribute('id')).toBe('bouton-actualiser');
    });

    it('un seul DELETE pour deux clics : la modale se verrouille pendant l’appel', () => {
      ouvrirModale();
      const confirmer = element<HTMLButtonElement>(racine, '#suppression-confirmer');

      confirmer.click();
      confirmer.click();
      fixture.detectChanges();

      const demandes = http.match((requete) => requete.method === 'DELETE');
      expect(demandes).toHaveLength(1);
      expect(confirmer.disabled).toBe(true);
      expect(confirmer.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(confirmer)).toBe('…');
      expect(element<HTMLButtonElement>(racine, '#suppression-annuler').disabled).toBe(true);
      expect(element<HTMLButtonElement>(racine, '#bouton-actualiser').disabled).toBe(true);
      expect(element<HTMLButtonElement>(racine, '#modifier-5').disabled).toBe(true);

      demandes[0].flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
    });

    it('une ligne en cours de modification se retire et quitte le formulaire', () => {
      cliquer('#modifier-5');
      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${PRIX}/5`).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      expect(racine.querySelector('#formulaire-annuler')).toBeNull();
      expect(racine.querySelector('.prix-marche__carte--en-cours')).toBeNull();
      expect(element<HTMLInputElement>(racine, '#produit').value).toBe('');
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(1);
    });

    it('un 404 dans la modale : message du serveur, modale ouverte, ligne conservée', () => {
      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${PRIX}/5`).flush(
        { statut: 404, message: "PrixMarche introuvable avec l'id : 5", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.prix-marche__modale .message--erreur'))).toContain(
        "PrixMarche introuvable avec l'id : 5",
      );
      expect(element(racine, '.prix-marche__modale').getAttribute('aria-modal')).toBe('true');
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(2);
      expect(racine.querySelector('.message--succes')).toBeNull();
    });

    it('un 403 sur le retrait : refus affiché, session conservée, aucune ligne perdue', () => {
      const jeton = fabriquerJeton(dansUneHeure());
      localStorage.setItem(CLE_JETON, jeton);
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));

      ouvrirModale();
      cliquer('#suppression-confirmer');
      http.expectOne(`${PRIX}/5`).flush(
        {
          statut: 403,
          message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
          timestamp: 'x',
        },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.prix-marche__modale .message--erreur'))).toContain(
        'Accès refusé',
      );
      expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
      expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
      expect(elements(racine, '.prix-marche__carte')).toHaveLength(2);
    });

    it('Actualiser reste bloqué pendant une modale ouverte puis un retrait', () => {
      ouvrirModale();
      const actualiser = element<HTMLButtonElement>(racine, '#bouton-actualiser');

      cliquer('#suppression-confirmer');
      expect(actualiser.disabled).toBe(true);

      http.expectOne(`${PRIX}/5`).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
      expect(actualiser.disabled).toBe(false);
    });
  });

  it('n’appelle aucun endpoint personnel : les quatre opérations passent par /api/prix-marche', () => {
    ouvrir();

    for (const interdit of ['/producteurs/moi', '/acheteurs/moi', 'mes-recoltes']) {
      expect(http.match((requete) => (requete.url ?? '').includes(interdit))).toHaveLength(0);
    }
    listeEnAttente().flush([]);
  });
});
