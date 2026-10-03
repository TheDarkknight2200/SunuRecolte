import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { vi } from 'vitest';
import { SessionUtilisateur } from '../../../core/modeles/auth.modeles';
import { ProducteurResponse } from '../../../core/modeles/domaine.modeles';
import { routes } from '../../../app.routes';
import { authGuard } from '../../../core/guards/auth.guard';
import { roleGuard } from '../../../core/guards/role.guard';
import { authInterceptor } from '../../../core/intercepteurs/auth.interceptor';
import { CLE_JETON, CLE_UTILISATEUR } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProfilProducteur } from './profil-producteur';

const API = 'http://localhost:8080/api';
const MOI = `${API}/producteurs/moi`;

const PROFIL: ProducteurResponse = {
  id: 4,
  utilisateurId: 9,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  telephone: '770000000',
  localisationExploitation: 'Rufisque',
  filiere: 'MARAICHAGE',
  description: null,
};

/** Les sept valeurs envoyées telles quelles au serveur, saisie inchangée. */
const CORPS_ATTENDU = {
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa.diop@example.sn',
  telephone: '770000000',
  localisationExploitation: 'Rufisque',
  filiere: 'MARAICHAGE',
  description: null,
};

const SESSION: SessionUtilisateur = {
  utilisateurId: 9,
  nom: 'Diop',
  prenom: 'Awa',
  email: 'awa.diop@example.sn',
  role: 'PRODUCTEUR',
};

/** Jeton factice : seule la charge utile (exp) est lue, jamais un jeton réel. */
function fabriquerJeton(expirationSecondes: number): string {
  const base64 = btoa(JSON.stringify({ sub: '9', exp: expirationSecondes }))
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

function valeurDe(selecteur: string): string {
  return element<HTMLInputElement | HTMLTextAreaElement>(racine, selecteur).value;
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

let http: HttpTestingController;
let fixture: ComponentFixture<ProfilProducteur>;
let racine: HTMLElement;

/** Ouvre l'écran : le premier appel est le GET /moi, aucune donnée n'est encore rendue. */
function ouvrir(): void {
  localStorage.clear();
  localStorage.setItem(CLE_JETON, fabriquerJeton(dansUneHeure()));
  localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(SESSION));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([], withDisabledInitialNavigation()),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  fixture = TestBed.createComponent(ProfilProducteur);
  fixture.detectChanges();
  racine = fixture.nativeElement as HTMLElement;
}

function chargerProfil(profil: ProducteurResponse = PROFIL): void {
  http.expectOne(MOI).flush(profil);
  fixture.detectChanges();
}

/** La notice globale émise par l'écran : le succès d'enregistrement n'a plus de bannière. */
function notice(): ReturnType<ToastService['notice']> {
  return TestBed.inject(ToastService).notice();
}

/** GET et PUT partagent l'URL « /moi » : seule la méthode distingue les deux. */
function demandeModification(): TestRequest {
  const demandes = http.match((requete) => requete.method === 'PUT');
  expect(demandes).toHaveLength(1);
  const demande = demandes[0];
  if (!demande) {
    throw new Error('Aucune demande PUT émise.');
  }
  return demande;
}

function aucuneModification(): void {
  expect(http.match((requete) => requete.method === 'PUT')).toHaveLength(0);
}

function bouton(): HTMLButtonElement {
  return element<HTMLButtonElement>(racine, '#profil-soumettre');
}

function soumettre(): void {
  element<HTMLFormElement>(racine, 'form').dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function taper(selecteur: string, valeurSaisie: string): void {
  const champ = element<HTMLInputElement | HTMLTextAreaElement>(racine, selecteur);
  champ.value = valeurSaisie;
  champ.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

/** Sélectionne une option par son libellé affiché (les valeurs sont gérées par ngValue). */
function choisirFiliere(libelle: string): void {
  const selecteur = element<HTMLSelectElement>(racine, '#filiere');
  const index = Array.from(selecteur.options).findIndex((option) => option.text === libelle);
  selecteur.selectedIndex = index;
  selecteur.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function filiereSelectionnee(): string {
  const selecteur = element<HTMLSelectElement>(racine, '#filiere');
  return selecteur.options[selecteur.selectedIndex]?.text ?? '';
}

function sessionLue(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(CLE_UTILISATEUR) ?? '{}') as Record<string, unknown>;
}

describe('ProfilProducteur — profil du producteur connecté', () => {
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('charge le profil par GET /api/producteurs/moi sans aucun paramètre client', () => {
    ouvrir();

    const demande = http.expectOne(MOI);
    expect(demande.request.method).toBe('GET');
    expect(demande.request.urlWithParams).toBe(MOI);
    expect(demande.request.params.keys()).toEqual([]);

    demande.flush(PROFIL);
    fixture.detectChanges();
    expect(valeurDe('#prenom')).toBe('Awa');
  });

  it('annonce le chargement et ne rend pas un formulaire vide en attendant', () => {
    ouvrir();

    const etat = element(racine, '.etat');
    expect(etat.getAttribute('aria-busy')).toBe('true');
    expect(texteDe(element(racine, '.etat__texte'))).toBe('Chargement de votre profil…');
    expect(racine.querySelector('form')).toBeNull();

    chargerProfil();
    expect(racine.querySelector('.etat')).toBeNull();
    expect(racine.querySelector('form')).not.toBeNull();
  });

  it('rend les sept champs modifiables : quatre pour le compte, trois pour l’exploitation', () => {
    ouvrir();
    chargerProfil();

    for (const id of ['#prenom', '#nom', '#email', '#telephone', '#localisationExploitation']) {
      expect(element(racine, id).tagName).toBe('INPUT');
    }
    expect(element(racine, '#filiere').tagName).toBe('SELECT');
    expect(element(racine, '#description').tagName).toBe('TEXTAREA');
    expect(racine.querySelectorAll('input, select, textarea').length).toBe(7);

    const legendes = Array.from(
      racine.querySelectorAll<HTMLElement>('.profil-producteur__legende'),
    ).map(texteDe);
    expect(legendes).toEqual(['Compte', 'Exploitation']);
  });

  it('ne propose ni mot de passe, ni rôle, ni identifiant à modifier', () => {
    ouvrir();
    chargerProfil();

    expect(racine.querySelector('input[type="password"]')).toBeNull();
    expect(racine.querySelector('#role, #actif, #utilisateurId, #id')).toBeNull();
    expect(texteDe(element(racine, '.profil-producteur__note'))).toContain(
      'le mot de passe ne se modifient pas',
    );
  });

  it('préremplit les sept contrôles depuis la réponse du serveur', () => {
    ouvrir();
    chargerProfil({
      ...PROFIL,
      prenom: 'Moussa',
      nom: 'Fall',
      email: 'moussa.fall@example.sn',
      telephone: '771234567',
      localisationExploitation: 'Thiénaba',
      filiere: 'ELEVAGE',
      description: 'Bovins et volailles, retrait le mardi.',
    });

    expect(valeurDe('#prenom')).toBe('Moussa');
    expect(valeurDe('#nom')).toBe('Fall');
    expect(valeurDe('#email')).toBe('moussa.fall@example.sn');
    expect(valeurDe('#telephone')).toBe('771234567');
    expect(valeurDe('#localisationExploitation')).toBe('Thiénaba');
    expect(filiereSelectionnee()).toBe('Élevage');
    expect(valeurDe('#description')).toBe('Bovins et volailles, retrait le mardi.');
  });

  it('rend un champ facultatif absent par une saisie vide et non par « null »', () => {
    ouvrir();
    chargerProfil({ ...PROFIL, localisationExploitation: null, description: null });

    expect(valeurDe('#localisationExploitation')).toBe('');
    expect(valeurDe('#description')).toBe('');
    expect(filiereSelectionnee()).toBe('Maraîchage');
  });

  it('borne chaque champ à la longueur réelle de sa colonne, description comprise en TEXT', () => {
    ouvrir();
    chargerProfil();

    const limites: Record<string, string> = {
      '#prenom': '100',
      '#nom': '100',
      '#email': '150',
      '#telephone': '20',
      '#localisationExploitation': '255',
    };
    for (const [selecteur, limite] of Object.entries(limites)) {
      expect(element(racine, selecteur).getAttribute('maxlength')).toBe(limite);
    }
    // description est un TEXT côté schéma : aucune borne n'est inventée.
    expect(element(racine, '#description').getAttribute('maxlength')).toBeNull();
  });

  it('demande une adresse email au format attendu et un numéro joignable', () => {
    ouvrir();
    chargerProfil();

    expect(element(racine, '#email').getAttribute('type')).toBe('email');
    expect(texteDe(element(racine, '#email-aide'))).toContain('Sert à vous connecter');
    expect(element(racine, '#telephone').getAttribute('type')).toBe('tel');
  });

  it('annonce la filière comme obligatoire pour le navigateur et les lecteurs d’écran', () => {
    ouvrir();
    chargerProfil();

    const selecteur = element<HTMLSelectElement>(racine, '#filiere');
    expect(selecteur.getAttribute('required')).not.toBeNull();
    expect(selecteur.getAttribute('aria-required')).toBe('true');
    expect(texteDe(element(racine, 'label[for="filiere"]'))).toContain('Filière');
    expect(selecteur.options.length).toBe(5);
    expect(Array.from(selecteur.options).map((option) => option.text)).toEqual([
      'Choisir une filière',
      'Maraîchage',
      'Élevage',
      'Céréales',
      'Autre',
    ]);
  });

  it('envoie les sept champs à chaque PUT, même ceux qui n’ont pas changé', () => {
    ouvrir();
    chargerProfil();

    taper('#description', 'Marché de Rufisque, livraison le vendredi.');
    soumettre();

    const demande = demandeModification();
    expect(demande.request.method).toBe('PUT');
    expect(Object.keys(demande.request.body as Record<string, unknown>).sort()).toEqual([
      'description',
      'email',
      'filiere',
      'localisationExploitation',
      'nom',
      'prenom',
      'telephone',
    ]);
    expect(demande.request.body).toEqual({ ...CORPS_ATTENDU, description: 'Marché de Rufisque, livraison le vendredi.' });
    demande.flush({ ...PROFIL, description: 'Marché de Rufisque, livraison le vendredi.' });
  });

  it('ne porte aucun identifiant : ni dans l’URL, ni dans le corps de la requête', () => {
    ouvrir();
    chargerProfil({ ...PROFIL, id: 1285 });

    soumettre();

    const demande = demandeModification();
    expect(demande.request.urlWithParams).toBe(MOI);
    expect(demande.request.params.keys()).toEqual([]);
    expect(demande.request.body).toEqual(CORPS_ATTENDU);
    demande.flush({ ...PROFIL, id: 1285 });
  });

  it('envoie null et non une chaîne vide quand un champ facultatif est vidé', () => {
    ouvrir();
    chargerProfil({ ...PROFIL, localisationExploitation: 'Rufisque', description: 'Volailles' });

    taper('#localisationExploitation', '   ');
    taper('#description', '');
    soumettre();

    const demande = demandeModification();
    expect(demande.request.body).toEqual({ ...CORPS_ATTENDU, localisationExploitation: null });
    demande.flush({ ...PROFIL, localisationExploitation: null, description: null });
  });

  it('nettoie les espaces de l’identité avant l’envoi', () => {
    ouvrir();
    chargerProfil();

    taper('#prenom', '  Awa  ');
    taper('#telephone', ' 770000000 ');
    soumettre();

    const demande = demandeModification();
    expect(demande.request.body).toEqual({ ...CORPS_ATTENDU, prenom: 'Awa', telephone: '770000000' });
    demande.flush(PROFIL);
  });

  it('bloque l’envoi sans filière et ne demande aucun PUT', () => {
    ouvrir();
    chargerProfil();

    choisirFiliere('Choisir une filière');
    soumettre();

    expect(texteDe(element(racine, '#filiere-erreur'))).toBe('Ce champ est obligatoire.');
    expect(element(racine, '#filiere').getAttribute('aria-invalid')).toBe('true');
    aucuneModification();
  });

  it('bloque l’envoi d’un email vide ou mal formé avant toute requête', () => {
    ouvrir();
    chargerProfil();

    // Une adresse sans « @ » : le contrôle Angular est un confort de saisie, l'autorité
    // en la matière restant le @Email vérifié par le backend.
    taper('#email', 'awa.diop.example.sn');
    soumettre();

    expect(texteDe(element(racine, '#email-erreur'))).toBe("Format d'adresse email invalide.");
    expect(element(racine, '#email').getAttribute('aria-invalid')).toBe('true');
    aucuneModification();

    taper('#email', '');
    soumettre();
    expect(texteDe(element(racine, '#email-erreur'))).toBe('Ce champ est obligatoire.');
    aucuneModification();
  });

  it('bloque un domaine sans extension, que le backend @Email accepterait', () => {
    ouvrir();
    chargerProfil();

    // Constat QA 5.8-bis : `mariama@exemple` était passé jusqu'en base (HTTP 200).
    // Le blocage est ici purement client ; l'autorité de sécurité reste le backend.
    taper('#email', 'awa.diop@exemple');
    soumettre();

    expect(texteDe(element(racine, '#email-erreur'))).toBe(
      'Il manque l’extension du domaine, par exemple prenom@exemple.sn.',
    );
    expect(element(racine, '#email').getAttribute('aria-invalid')).toBe('true');
    aucuneModification();
  });

  it('bloque l’envoi d’un champ obligatoire vidé et nomme chaque champ fautif', () => {
    ouvrir();
    chargerProfil();

    taper('#prenom', '');
    taper('#nom', '');
    taper('#telephone', '');
    soumettre();

    for (const id of ['#prenom-erreur', '#nom-erreur', '#telephone-erreur']) {
      expect(texteDe(element(racine, id))).toBe('Ce champ est obligatoire.');
    }
    aucuneModification();
  });

  it('refuse une localisation trop longue avant l’envoi', () => {
    ouvrir();
    chargerProfil();

    taper('#localisationExploitation', 'a'.repeat(256));
    soumettre();

    expect(texteDe(element(racine, '#localisationExploitation-erreur'))).toBe(
      'Ce champ ne peut pas dépasser 255 caractères.',
    );
    aucuneModification();
  });

  it('désactive le bouton et annonce le traitement pendant l’envoi', () => {
    ouvrir();
    chargerProfil();

    soumettre();

    expect(bouton().disabled).toBe(true);
    expect(bouton().getAttribute('aria-busy')).toBe('true');
    expect(texteDe(bouton())).toBe('…');

    demandeModification().flush(PROFIL);
    fixture.detectChanges();
    expect(bouton().disabled).toBe(false);
    expect(bouton().getAttribute('aria-busy')).toBe('false');
    expect(texteDe(bouton())).toBe('Enregistrer les modifications');
  });

  it('ne laisse partir qu’une seule requête sur deux validations', () => {
    ouvrir();
    chargerProfil();

    taper('#localisationExploitation', 'Rufisque');
    soumettre();
    soumettre();

    const demandes = http.match((requete) => requete.method === 'PUT');
    expect(demandes).toHaveLength(1);
    expect(bouton().disabled).toBe(true);
    demandes[0]?.flush(PROFIL);
  });

  it('confirme à partir de la réponse du serveur et repréremplit avec elle', () => {
    ouvrir();
    chargerProfil();

    taper('#localisationExploitation', 'Rufisque');
    soumettre();

    // Le serveur normalise la saisie et complète la description : c'est sa valeur qui s'affiche.
    demandeModification().flush({
      ...PROFIL,
      localisationExploitation: 'Rufisque Centre',
      description: 'Producteur membre du GIE de Rufisque.',
    });
    fixture.detectChanges();

    expect(notice()?.type).toBe('succes');
    expect(notice()?.message).toBe('Profil mis à jour.');
    expect(racine.querySelector('.message--succes')).toBeNull();
    expect(valeurDe('#description')).toBe('Producteur membre du GIE de Rufisque.');
    expect(valeurDe('#localisationExploitation')).toBe('Rufisque Centre');
  });

  it('confie le succès à la notice : l’écran ne rend plus aucune bannière de succès', () => {
    ouvrir();
    chargerProfil();

    taper('#localisationExploitation', 'Rufisque');
    soumettre();
    const espion = vi.spyOn(TestBed.inject(ToastService), 'afficher');
    demandeModification().flush(PROFIL);
    fixture.detectChanges();

    expect(espion).toHaveBeenCalledWith('Profil mis à jour.', 'succes');
    expect(racine.querySelector('.message--succes')).toBeNull();
  });

  it('rafraîchit l’identité locale après un changement de prénom, nom et email', () => {
    ouvrir();
    chargerProfil();

    taper('#prenom', 'Moussa');
    taper('#nom', 'Fall');
    taper('#email', 'moussa.fall@example.sn');
    soumettre();

    demandeModification().flush({
      ...PROFIL,
      prenom: 'Moussa',
      nom: 'Fall',
      email: 'moussa.fall@example.sn',
    });
    fixture.detectChanges();

    expect(sessionLue()).toEqual({ ...SESSION, prenom: 'Moussa', nom: 'Fall', email: 'moussa.fall@example.sn' });
    // Le jeton n'est pas renouvelé : le changement d'e-mail ne casse pas la session en cours.
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
  });

  it('nomme le champ concerné quand le backend renvoie des erreurs par champ', () => {
    ouvrir();
    chargerProfil();

    soumettre();

    demandeModification().flush(
      {
        statut: 400,
        message: 'Données invalides',
        erreurs: { telephone: 'Le téléphone est obligatoire' },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '#telephone-erreur'))).toBe('Le téléphone est obligatoire');
    expect(element(racine, '#telephone').getAttribute('aria-invalid')).toBe('true');
    expect(racine.querySelector('.message--erreur')).toBeNull();
  });

  it('affiche le refus du backend quand l’adresse email est déjà prise', () => {
    ouvrir();
    chargerProfil();

    taper('#email', 'prise@exemple.sn');
    soumettre();

    // Conflit métier : l'API répond un 400 avec un message seul, sans carte de champs.
    demandeModification().flush(
      { statut: 400, message: 'Un compte existe déjà avec cette adresse email.', timestamp: '2026-09-29T10:00:00Z' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur p'))).toBe(
      'Un compte existe déjà avec cette adresse email.',
    );
    expect(racine.querySelector('.message--succes')).toBeNull();
    expect(notice()).toBeNull();
    // La saisie reste en place pour corriger l'adresse.
    expect(valeurDe('#email')).toBe('prise@exemple.sn');
  });

  it('affiche le message du backend quand un 400 sans détail de champ arrive', () => {
    ouvrir();
    chargerProfil();

    soumettre();

    demandeModification().flush(
      { statut: 400, message: 'La requête est invalide.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur p'))).toBe('La requête est invalide.');
  });

  it('un 403 reste un refus affiché : aucune purge de session, aucune redirection', () => {
    ouvrir();
    chargerProfil();

    soumettre();

    demandeModification().flush(
      {
        statut: 403,
        message: "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
      },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur p'))).toBe(
      "Accès refusé : vous n'avez pas les droits nécessaires pour cette ressource.",
    );
    expect(localStorage.getItem(CLE_JETON)).not.toBeNull();
    expect(sessionLue()).toEqual(SESSION);
  });

  it('conserve la saisie quand l’enregistrement échoue', () => {
    ouvrir();
    chargerProfil();

    taper('#description', 'Bovins, volailles et œufs.');
    soumettre();

    demandeModification().flush(
      { statut: 500, message: 'Une erreur inattendue est survenue.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    expect(valeurDe('#description')).toBe('Bovins, volailles et œufs.');
    expect(texteDe(element(racine, '.message--erreur p'))).toBe('Une erreur inattendue est survenue.');
    expect(bouton().disabled).toBe(false);
  });

  it('explique l’échec du chargement et recharge le profil sur demande', () => {
    ouvrir();

    http
      .expectOne(MOI)
      .flush(
        { statut: 500, message: 'Le service est momentanément indisponible.' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    fixture.detectChanges();

    expect(texteDe(element(racine, '.message--erreur p'))).toBe(
      'Le service est momentanément indisponible.',
    );
    expect(racine.querySelector('form')).toBeNull();

    element<HTMLButtonElement>(racine, '#profil-reessayer').click();
    fixture.detectChanges();
    chargerProfil();
    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(valeurDe('#prenom')).toBe('Awa');
  });

  /*
   * Filet de structure — écrit avant tout restylage. Ce que la refonte §20/§41 doit préserver :
   * un titre de page unique, un formulaire unique, et les trois états rendus dans le même parent
   * (un enveloppement qui laisserait un état hors de la colonne de page rougit ici).
   */
  describe('structure de page', () => {
    function parentDe(selecteur: string): HTMLElement {
      const parent = element(racine, selecteur).parentElement;
      if (!parent) {
        throw new Error(`Aucun parent pour ${selecteur}`);
      }
      return parent;
    }

    it('rend un seul <h1>, avant comme après le chargement du profil', () => {
      ouvrir();
      expect(racine.querySelectorAll('h1')).toHaveLength(1);

      chargerProfil();
      expect(racine.querySelectorAll('h1')).toHaveLength(1);
      expect(texteDe(element(racine, 'h1'))).toBe('Profil');
    });

    it('rend un seul <form> quand le profil est affiché', () => {
      ouvrir();
      chargerProfil();

      expect(racine.querySelectorAll('form')).toHaveLength(1);
    });

    it('rend la charge, l’erreur et le formulaire dans le même parent', () => {
      ouvrir();
      const parentCharge = parentDe('.etat');

      http
        .expectOne(MOI)
        .flush(
          { statut: 500, message: 'Le service est momentanément indisponible.' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      fixture.detectChanges();
      const parentErreur = parentDe('.message--erreur');

      element<HTMLButtonElement>(racine, '#profil-reessayer').click();
      fixture.detectChanges();
      chargerProfil();

      expect(parentDe('form')).toBe(parentCharge);
      expect(parentErreur).toBe(parentCharge);
    });

    it('place toute la colonne de page dans un .conteneur unique (§20)', () => {
      ouvrir();

      expect(racine.querySelectorAll('.conteneur')).toHaveLength(1);
      const conteneur = element<HTMLElement>(racine, '.conteneur');
      expect(conteneur.parentElement).toBe(element(racine, 'section.profil-producteur'));
      expect(conteneur.querySelector('h1')).not.toBeNull();
      expect(parentDe('.etat')).toBe(conteneur);

      chargerProfil();
      expect(parentDe('form')).toBe(conteneur);
    });
  });
});

/**
 * La protection est vérifiée sur la table réelle des routes ; `loadComponent` n'est jamais
 * invoqué dans une spec (il casse les @for d'autres fichiers).
 */
describe('routes du profil producteur', () => {
  function routeDe(path: string): (typeof routes)[number] | undefined {
    return routes.find((entree) => entree.path === path);
  }

  it('protège producteur/profil par authGuard puis roleGuard pour PRODUCTEUR', () => {
    const protegee = routeDe('producteur/profil');
    expect(protegee).toBeDefined();
    expect(protegee?.canActivate?.[0]).toBe(authGuard);
    expect(protegee?.canActivate?.[1]).toBe(roleGuard);
    expect(protegee?.data).toEqual({ roles: ['PRODUCTEUR'] });
  });

  it('porte le titre « SunuRecolte — Profil » et un chargement paresseux', () => {
    const protegee = routeDe('producteur/profil');
    expect(protegee?.title).toBe('SunuRecolte — Profil');
    expect(typeof protegee?.loadComponent).toBe('function');
    expect(protegee?.component).toBeUndefined();
  });
});
