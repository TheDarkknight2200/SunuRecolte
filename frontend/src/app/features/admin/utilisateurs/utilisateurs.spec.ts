import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { UtilisateurResponse } from '../../../core/modeles/domaine.modeles';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { AuthService, CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { Utilisateurs } from './utilisateurs';

const API = 'http://localhost:8080/api';
const UTILISATEURS = `${API}/utilisateurs`;

function compte(id: number, surcharge: Partial<UtilisateurResponse> = {}): UtilisateurResponse {
  return {
    id,
    nom: 'Fall',
    prenom: 'Moussa',
    email: `moussa.fall${id}@example.sn`,
    telephone: '771112233',
    role: 'PRODUCTEUR',
    dateCreation: '2026-05-12T08:30:00',
    actif: true,
    ...surcharge,
  };
}

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

describe('Utilisateurs (administration)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Utilisateurs>;
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
    fixture = TestBed.createComponent(Utilisateurs);
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function listeEnAttente() {
    return http.expectOne(UTILISATEURS);
  }

  function charger(comptes: UtilisateurResponse[]): void {
    listeEnAttente().flush(comptes);
    fixture.detectChanges();
  }

  function cliquer(selecteur: string): void {
    element<HTMLButtonElement>(racine, selecteur).click();
    fixture.detectChanges();
  }

  /** Ouvre la modale du premier compte de la liste. */
  function ouvrirModale(): void {
    element<HTMLButtonElement>(racine, '.utilisateurs__ligne button').click();
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

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('demande GET /api/utilisateurs sans aucun paramètre, la liste venant du serveur', () => {
    ouvrir();

    const requete = listeEnAttente();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.urlWithParams).toBe(UTILISATEURS);
    expect(requete.request.params.keys().length).toBe(0);
    requete.flush([]);
  });

  it('affiche l’état de chargement, jamais l’état vide pendant la requête', () => {
    ouvrir();

    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des comptes…');
    expect(element(racine, '.etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Aucun compte inscrit');
    expect(racine.querySelector('.utilisateurs__liste')).toBeNull();

    charger([]);
  });

  it('rend les sept informations du contrat UtilisateurResponse', () => {
    ouvrir();
    charger([compte(9, { role: 'ACHETEUR', telephone: '780004455' })]);

    const carte = element<HTMLElement>(racine, '.utilisateurs__ligne');
    expect(texteDe(element(racine, 'h1'))).toBe('Utilisateurs');
    expect(texteDe(element(racine, '.cellule-double__titre'))).toBe('Moussa Fall');
    expect(texteDe(carte)).toContain('moussa.fall9@example.sn');
    expect(texteDe(carte)).toContain('780004455');
    expect(texteDe(carte)).toContain('Acheteur');
    // En tableau dense, le libellé de la date est porté par l'en-tête de colonne (§10.6).
    expect(texteDe(element(racine, '.utilisateurs__liste thead'))).toContain('Compte créé le');
    expect(texteDe(carte)).toContain('12/05/2026 à 08:30');
    expect(texteDe(carte)).toContain('Actif');
    expect(texteDe(carte)).not.toContain('null');
    expect(texteDe(carte)).not.toContain('undefined');
  });

  it('n’affiche jamais de mot de passe, de hash ni de jeton', () => {
    ouvrir();
    charger([compte(9)]);

    const texte = texteDe(racine);
    for (const interdit of ['motDePasse', 'password', 'bcrypt', '$2a$', 'entete.', 'Bearer']) {
      expect(texte.toLowerCase()).not.toContain(interdit.toLowerCase());
    }
  });

  it('propose les notifications, seules données transverses de l’ADMIN, depuis l’écran', () => {
    ouvrir();
    charger([compte(9)]);

    const lien = element<HTMLAnchorElement>(racine, '#lien-notifications-utilisateurs');
    expect(lien.getAttribute('href')).toBe('/notifications');
    expect(texteDe(lien)).toBe('Notifications');
  });

  it('distingue l’état du compte par un libellé, la couleur restant un renfort', () => {
    ouvrir();
    charger([compte(9), compte(4, { actif: false })]);

    const [actif, inactif] = elements<HTMLElement>(racine, '.utilisateurs__ligne');
    const badgeActif = elements<HTMLElement>(actif, '.badge')[0];
    const badgeInactif = elements<HTMLElement>(inactif, '.badge')[0];

    expect(texteDe(badgeActif)).toBe('Actif');
    expect(badgeActif.classList.contains('badge--succes')).toBe(true);
    expect(texteDe(badgeInactif)).toBe('Inactif');
    expect(badgeInactif.classList.contains('badge--erreur')).toBe(true);
  });

  it('ne propose aucune saisie : seul l’état du compte se modifie ici', () => {
    ouvrir();
    charger([compte(9), compte(4)]);

    expect(racine.querySelector('input, textarea, select, form')).toBeNull();
    expect(elements(racine, '.utilisateurs__ligne button')).toHaveLength(2);
  });

  it('invite à attendre une inscription quand la liste est vide', () => {
    ouvrir();
    charger([]);

    expect(texteDe(element(racine, '.etat'))).toContain('Aucun compte inscrit.');
    expect(racine.querySelector('.utilisateurs__liste')).toBeNull();
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
    expect(texteDe(racine)).not.toContain('Aucun compte inscrit');
  });

  it('Réessayer relance la liste et remplace le message par les comptes', () => {
    ouvrir();
    listeEnAttente().flush(
      { statut: 500, message: 'Le service a refusé la requête.', timestamp: 'x' },
      { status: 500, statusText: 'Erreur' },
    );
    fixture.detectChanges();

    cliquer('#erreur-reessayer');
    expect(texteDe(element(racine, '.etat'))).toContain('Chargement des comptes…');
    charger([compte(9)]);

    expect(elements(racine, '.utilisateurs__ligne')).toHaveLength(1);
    expect(racine.querySelector('.message--erreur')).toBeNull();
  });

  it('un 403 reste un refus : ni déconnexion ni purge du jeton', () => {
    localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));
    ouvrir();

    listeEnAttente().flush(
      {
        statut: 403,
        message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
        timestamp: 'x',
      },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    expect(texteDe(element(racine, '.message--erreur'))).toContain('Accès refusé');
    expect(auth.estConnecte()).toBe(true);
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
  });

  describe('changement d’état', () => {
    beforeEach(() => {
      ouvrir();
      charger([compte(9, { prenom: 'Moussa' }), compte(4, { prenom: 'Awa', actif: false })]);
    });

    it('ne modifie jamais sans confirmation : la modale s’ouvre, aucune requête PATCH', () => {
      ouvrirModale();

      const modale = element(racine, '.modale');
      expect(modale.getAttribute('role')).toBe('dialog');
      expect(modale.getAttribute('aria-modal')).toBe('true');
      expect(modale.getAttribute('aria-labelledby')).toBe('changement-titre');
      expect(texteDe(element(racine, '#changement-titre'))).toBe('Désactiver ce compte ?');
      expect(texteDe(modale)).toContain('Moussa Fall');
      expect(texteDe(modale)).toContain('moussa.fall9@example.sn');
      expect(texteDe(modale)).toContain('son jeton en cours sera refusé dès la requête suivante');
      expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
    });

    it('propose le chemin inverse sur un compte déjà inactif', () => {
      const boutons = elements<HTMLButtonElement>(racine, '.utilisateurs__ligne button');
      expect(texteDe(boutons[0])).toBe('Désactiver Moussa Fall');
      expect(texteDe(boutons[1])).toBe('Réactiver Awa Fall');

      boutons[1].click();
      fixture.detectChanges();

      expect(texteDe(element(racine, '#changement-titre'))).toBe('Réactiver ce compte ?');
      expect(texteDe(element(racine, '.modale'))).toContain(
        'Il redeviendra utilisable immédiatement',
      );
    });

    it('déplace le focus sur Annuler, jamais sur le bouton destructif', () => {
      ouvrirModale();

      const actif = document.activeElement as HTMLElement;
      expect(actif.getAttribute('id')).toBe('changement-annuler');
      expect(element(racine, '.modale').contains(actif)).toBe(true);
    });

    it('Annuler ferme la modale et rend le focus au bouton déclencheur', () => {
      ouvrirModale();
      cliquer('#changement-annuler');

      expect(racine.querySelector('.modale')).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('changer-actif-9');
      expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
      expect(elements(racine, '.utilisateurs__ligne')).toHaveLength(2);
    });

    it('Escape ferme la modale sans rien modifier', () => {
      ouvrirModale();
      escape();

      expect(racine.querySelector('.modale')).toBeNull();
      expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
      expect(document.activeElement?.getAttribute('id')).toBe('changer-actif-9');
    });

    it('Escape ferme la modale même quand le focus est sorti dans l’arrière-plan', () => {
      ouvrirModale();
      element<HTMLButtonElement>(racine, '#bouton-actualiser').focus();
      expect(element(racine, '.modale').contains(document.activeElement)).toBe(false);

      escape();

      expect(racine.querySelector('.modale')).toBeNull();
      expect(document.activeElement?.getAttribute('id')).toBe('changer-actif-9');
    });

    it('Tab et Shift+Tab restent piégés dans la modale ouverte', () => {
      ouvrirModale();
      expect(document.activeElement?.getAttribute('id')).toBe('changement-annuler');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('changement-confirmer');

      presserTab();
      expect(document.activeElement?.getAttribute('id')).toBe('changement-annuler');

      presserTab(true);
      expect(document.activeElement?.getAttribute('id')).toBe('changement-confirmer');

      expect(element(racine, '.modale').contains(document.activeElement)).toBe(true);
      expect(http.match((requete) => requete.method === 'PATCH')).toHaveLength(0);
    });

    it('confirmer envoie PATCH /{id}/actif avec un corps réduit à `actif`', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');

      const requete = http.expectOne(`${UTILISATEURS}/9/actif`);
      expect(requete.request.method).toBe('PATCH');
      expect(requete.request.params.keys().length).toBe(0);
      expect(requete.request.body).toEqual({ actif: false });

      requete.flush(compte(9, { actif: false }));
      fixture.detectChanges();

      expect(texteDe(elements<HTMLElement>(racine, '.utilisateurs__ligne')[0])).toContain('Inactif');
      expect(racine.querySelector('.modale')).toBeNull();
    });

    it('la ligne affichée vient de la réponse du serveur, pas d’un état écrit ici', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');

      // Le serveur rend un compte dont le nom a été corrigé entre-temps : c'est lui qui a raison.
      http
        .expectOne(`${UTILISATEURS}/9/actif`)
        .flush(compte(9, { actif: false, nom: 'Ndiaye', email: 'change@example.sn' }));
      fixture.detectChanges();

      const carte = elements<HTMLElement>(racine, '.utilisateurs__ligne')[0];
      expect(texteDe(element(carte, '.cellule-double__titre'))).toBe('Moussa Ndiaye');
      expect(texteDe(carte)).toContain('change@example.sn');
    });

    it('annonce le résultat avec le libellé rendu par le serveur', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(compte(9, { actif: false }));
      fixture.detectChanges();

      const succes = element<HTMLElement>(racine, '.message--succes');
      expect(succes.getAttribute('role')).toBe('status');
      expect(texteDe(element(racine, '.message--succes p'))).toBe(
        'Le compte de Moussa Fall est désactivé.',
      );
      expect(texteDe(racine)).toContain('2 comptes sur la plateforme');
    });

    it('rend le focus au bouton déclencheur après la confirmation', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(compte(9, { actif: false }));
      fixture.detectChanges();

      const actif = document.activeElement as HTMLButtonElement;
      expect(actif.getAttribute('id')).toBe('changer-actif-9');
      // Un contrôle désactivé refuse le focus : la cible doit être de nouveau utilisable.
      expect(actif.disabled).toBe(false);
      expect(racine.querySelector('.modale')).toBeNull();
    });

    it('rend le focus au bouton déclencheur même sans rafraîchissement du test', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');

      // Le composant est seul responsable de la séquence : rien ne doit être attendu du caller.
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(compte(9, { actif: false }));

      expect(document.activeElement?.getAttribute('id')).toBe('changer-actif-9');
      fixture.detectChanges();
    });

    it('un seul PATCH pour deux clics : la modale se verrouille pendant l’envoi', () => {
      ouvrirModale();
      const confirmer = element<HTMLButtonElement>(racine, '#changement-confirmer');

      confirmer.click();
      confirmer.click();
      fixture.detectChanges();

      const demandes = http.match((requete) => requete.method === 'PATCH');
      expect(demandes).toHaveLength(1);
      expect(confirmer.disabled).toBe(true);
      expect(confirmer.getAttribute('aria-busy')).toBe('true');
      expect(texteDe(confirmer)).toBe('…');
      expect(element<HTMLButtonElement>(racine, '#changement-annuler').disabled).toBe(true);
      expect(element<HTMLButtonElement>(racine, '#bouton-actualiser').disabled).toBe(true);

      demandes[0].flush(compte(9, { actif: false }));
      fixture.detectChanges();
    });

    it('tous les boutons de la liste sont neutralisés pendant un appel', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');
      http.match((requete) => requete.method === 'PATCH');

      expect(
        elements<HTMLButtonElement>(racine, '.utilisateurs__ligne button').map((b) => b.disabled),
      ).toEqual([true, true]);
    });

    it('400 sur son propre compte : message dans la modale, liste inchangée', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(
        {
          statut: 400,
          message: "Vous ne pouvez pas modifier l'état de votre propre compte.",
          timestamp: 'x',
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.modale .message--erreur'))).toContain(
        "Vous ne pouvez pas modifier l'état de votre propre compte.",
      );
      expect(element(racine, '.modale').getAttribute('aria-modal')).toBe('true');
      expect(document.activeElement?.getAttribute('id')).toBe('changement-annuler');
      expect(texteDe(elements<HTMLElement>(racine, '.utilisateurs__ligne')[0])).toContain('Actif');
      expect(racine.querySelector('.message--succes')).toBeNull();
    });

    it('403 : refus affiché, session conservée, aucun compte basculé', () => {
      const jeton = fabriquerJeton(dansUneHeure());
      localStorage.setItem(CLE_JETON, jeton);
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION_ADMIN));

      ouvrirModale();
      cliquer('#changement-confirmer');
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(
        { statut: 403, message: 'Accès refusé.', timestamp: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.modale .message--erreur'))).toContain(
        'Accès refusé',
      );
      expect(localStorage.getItem(CLE_JETON)).toBe(jeton);
      expect(localStorage.getItem(CLE_UTILISATEUR)).not.toBeNull();
      expect(texteDe(elements<HTMLElement>(racine, '.utilisateurs__ligne')[0])).toContain('Actif');
    });

    it('404 sur un compte retiré entre-temps : le message du backend est repris', () => {
      ouvrirModale();
      cliquer('#changement-confirmer');
      http.expectOne(`${UTILISATEURS}/9/actif`).flush(
        { statut: 404, message: "Utilisateur introuvable avec l'id : 9", timestamp: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(texteDe(element(racine, '.modale .message--erreur'))).toContain(
        "Utilisateur introuvable avec l'id : 9",
      );
      expect(elements(racine, '.utilisateurs__ligne')).toHaveLength(2);
    });

    it('Actualiser pendant une modale ouverte est bloqué, la liste est laissée telle quelle', () => {
      ouvrirModale();
      const actualiser = element<HTMLButtonElement>(racine, '#bouton-actualiser');
      expect(actualiser.disabled).toBe(false);

      cliquer('#changement-confirmer');
      expect(actualiser.disabled).toBe(true);

      http.expectOne(`${UTILISATEURS}/9/actif`).flush(compte(9, { actif: false }));
      fixture.detectChanges();
      expect(actualiser.disabled).toBe(false);
    });
  });
});
