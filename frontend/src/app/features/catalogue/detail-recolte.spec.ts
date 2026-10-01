import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { SessionUtilisateur } from '../../core/modeles/auth.modeles';
import { RecolteResponse } from '../../core/modeles/domaine.modeles';
import { Role } from '../../core/modeles/referentiels';
import { CLE_UTILISATEUR } from '../../core/services/auth.service';
import { PanierService } from '../../core/services/panier.service';
import { ToastService } from '../../core/services/toast.service';
import { DetailRecolte } from './detail-recolte';

const API = 'http://localhost:8080/api';

function recolte(surcharge: Partial<RecolteResponse> = {}): RecolteResponse {
  return {
    id: 7,
    producteurId: 3,
    nomProducteur: 'Diop',
    localisationProducteur: 'Thiès',
    produit: 'Mangue Kent',
    description: 'Calibre 14, cueilli à la commande.',
    quantiteDisponible: 500,
    quantiteMin: 20,
    quantiteMax: null,
    unite: 'kg',
    prixUnitaire: 12500,
    imageUrl: null,
    localisation: 'Marché de Thiès',
    dateDisponibilite: '2026-03-15',
    statut: 'DISPONIBLE',
    dateCreation: '2026-03-01T09:00:00',
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

function sansEspace(valeur: string): string {
  return valeur.replace(/\s/g, '');
}

function texteDe(noeud: HTMLElement): string {
  return (noeud.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function session(role: Role): SessionUtilisateur {
  return {
    utilisateurId: 9,
    nom: 'Fall',
    prenom: 'Moussa',
    email: 'moussa.fall@example.sn',
    role,
  };
}

describe('DetailRecolte', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<DetailRecolte>;
  let racine: HTMLElement;
  let parametres: Subject<ParamMap>;

  /**
   * Ouvre la fiche : le paramètre « id » de la route déclenche la requête.
   * `role` ouvre une session locale correspondante ; sans lui, la visite est anonyme.
   */
  function ouvrir(id: string | null, role?: Role): void {
    TestBed.resetTestingModule();
    localStorage.clear();
    if (role) {
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session(role)));
    }
    parametres = new Subject<ParamMap>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: parametres.asObservable() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetailRecolte);
    fixture.detectChanges();
    parametres.next(convertToParamMap(id === null ? {} : { id }));
    fixture.detectChanges();
    racine = fixture.nativeElement as HTMLElement;
  }

  function changerIdentifiant(id: string): void {
    parametres.next(convertToParamMap({ id }));
    fixture.detectChanges();
  }

  function attendre(id = 7): TestRequest {
    return http.expectOne(`${API}/recoltes/${id}`);
  }

  function repondre(corps: RecolteResponse, requete = attendre()): void {
    requete.flush(corps);
    fixture.detectChanges();
  }

  function repondreErreur(status: number, message: string, requete = attendre()): void {
    requete.flush(
      { statut: status, message, timestamp: '2026-03-01T09:00:00' },
      { status, statusText: 'Erreur' },
    );
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function panier(): PanierService {
    return TestBed.inject(PanierService);
  }

  it('demande la récolte dont l’identifiant vient de la route', () => {
    ouvrir('7');

    const requete = attendre();
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.keys().length).toBe(0);

    repondre(recolte(), requete);
  });

  it('affiche l’état de chargement avant la réponse, sans fiche partielle', () => {
    ouvrir('7');

    expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain('Chargement de la récolte…');
    expect(element(racine, '.detail-recolte__etat').getAttribute('aria-busy')).toBe('true');
    expect(texteDe(racine)).not.toContain('Récolte introuvable');
    expect(racine.querySelector('h1')).toBeNull();

    repondreErreur(404, 'Recolte introuvable.');
  });

  it('affiche les données reçues, y compris les champs nullables renseignés', () => {
    ouvrir('7');
    repondre(recolte());

    expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');
    expect(texteDe(racine)).toContain('Calibre 14, cueilli à la commande.');
    expect(sansEspace(texteDe(racine))).toContain('12500FCFA');
    expect(texteDe(racine)).toContain('500 kg');
    expect(texteDe(racine)).toContain('20 kg');
    expect(texteDe(racine)).toContain('15/03/2026');
    expect(texteDe(racine)).toContain('Marché de Thiès');
    expect(texteDe(racine)).toContain('Diop');
    expect(texteDe(racine)).toContain('Disponible');
  });

  it('passe sous silence les champs null au lieu d’inventer une valeur', () => {
    ouvrir('7');
    repondre(
      recolte({
        description: null,
        quantiteMin: null,
        quantiteMax: null,
        localisation: null,
        dateDisponibilite: null,
        localisationProducteur: null,
        statut: 'EPUISEE',
      }),
    );

    expect(texteDe(racine)).not.toContain('Commande minimale');
    expect(texteDe(racine)).not.toContain('Commande maximale');
    expect(texteDe(racine)).not.toContain('Lieu de retrait');
    expect(texteDe(racine)).not.toContain('Disponible à partir du');
    expect(texteDe(racine)).not.toContain('Exploitation');
    expect(texteDe(racine)).toContain('Épuisée');
    expect(texteDe(racine)).not.toContain('null');
    expect(texteDe(racine)).not.toContain('undefined');
  });

  it('n’affiche aucune image quand imageUrl est null', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: null }));

    expect(racine.querySelector('img')).toBeNull();
  });

  it('affiche l’image avec un texte alternatif quand imageUrl est fournie', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

    const image = element<HTMLImageElement>(racine, 'img.detail-recolte__image');
    expect(image.getAttribute('src')).toBe('/media/mangue-kent.jpg');
    expect(image.getAttribute('alt')).toBe('Mangue Kent');
  });

  it('retire une image qui ne se charge pas plutôt qu’une image cassée', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: '/media/introuvable.jpg' }));

    element(racine, 'img.detail-recolte__image').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(racine.querySelector('img')).toBeNull();
  });

  it('présente un 404 comme récolte introuvable, jamais comme erreur serveur', () => {
    ouvrir('7');
    repondreErreur(404, 'Recolte introuvable.');

    expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain('Récolte introuvable');
    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(texteDe(racine)).not.toContain('Réessayer');
    expect(element<HTMLAnchorElement>(racine, '.detail-recolte__etat a').getAttribute('href')).toBe(
      '/recoltes',
    );
  });

  it('identifie un identifiant mal formé comme introuvable, sans appel HTTP', () => {
    ouvrir('abc');

    expect(texteDe(racine)).toContain('Récolte introuvable');
    expect(element<HTMLAnchorElement>(racine, '.detail-recolte__etat a').getAttribute('href')).toBe(
      '/recoltes',
    );
  });

  it('affiche l’erreur serveur avec Réessayer et le retour au catalogue', () => {
    ouvrir('7');
    repondreErreur(500, 'Le service est temporairement indisponible.');

    expect(texteDe(element(racine, '.message--erreur'))).toContain(
      'Le service est temporairement indisponible.',
    );
    expect(texteDe(racine)).not.toContain('Récolte introuvable');

    element<HTMLButtonElement>(racine, '.message--erreur button').click();
    fixture.detectChanges();

    const requete = attendre();
    expect(requete.request.method).toBe('GET');
    expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain('Chargement de la récolte…');

    repondre(recolte(), requete);
    expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');
  });

  it('recharge la fiche quand la route change d’identifiant', () => {
    ouvrir('7');
    repondre(recolte());
    expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');

    changerIdentifiant('9');

    const requete = attendre(9);
    expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain('Chargement de la récolte…');
    expect(racine.querySelector('h1')).toBeNull();

    repondre(recolte({ id: 9, produit: 'Niébe' }), requete);
    expect(texteDe(element(racine, 'h1'))).toBe('Niébe');
  });

  it('n’offre aucune action d’achat sur une fiche publique', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

    expect(texteDe(racine)).not.toMatch(/commander|payer|acheter|panier/i);
    const libelles = Array.from(racine.querySelectorAll<HTMLElement>('button, a')).map(texteDe);
    expect(libelles).toContain('Retour au catalogue');
  });

  it('ajoute la récolte au panier pour un acheteur, dans l’unité déclarée', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte({ unite: 'kg' }));

    expect(texteDe(element(racine, '.detail-recolte__quantite'))).toContain(
      'Quantité ajoutée : 1 kg',
    );
    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    expect(bouton.disabled).toBe(false);

    bouton.click();
    fixture.detectChanges();

    const notice = TestBed.inject(ToastService).notice();
    expect(notice?.type).toBe('succes');
    expect(notice?.message).toContain('Récolte ajoutée au panier');
    expect(notice?.message).toContain('Mangue Kent');
    expect(racine.querySelector('.message--succes')).toBeNull();
    const lignes = panier().lignes();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].recolteId).toBe(7);
    expect(lignes[0].quantite).toBe(1);
  });

  it('désactive l’ajout d’une récolte épuisée sans altérer la fiche', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte({ statut: 'EPUISEE', quantiteDisponible: 0 }));

    expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');
    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-describedby')).toBe('detail-motif');
    expect(texteDe(element(racine, '.detail-recolte__motif'))).toContain('Épuisée');
    expect(panier().lignes()).toHaveLength(0);
  });

  it('refuse un ajout qui dépasserait le stock affiché et l’explique', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte({ quantiteDisponible: 0.5 }));

    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    expect(bouton.disabled).toBe(false);

    bouton.click();
    fixture.detectChanges();

    const notice = TestBed.inject(ToastService).notice();
    expect(notice?.type).toBe('erreur');
    expect(notice?.message).toContain('inférieur');
    expect(racine.querySelector('.message--succes')).toBeNull();
    expect(racine.querySelector('.message--erreur')).toBeNull();
    expect(panier().lignes()).toHaveLength(0);
  });

  it('la fiche ne rend plus de bannière d’ajout : sa notice est le seul retour', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte());
    const appelee = vi.spyOn(TestBed.inject(ToastService), 'afficher');

    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    bouton.click();
    fixture.detectChanges();

    expect(appelee).toHaveBeenCalledWith('Récolte ajoutée au panier : Mangue Kent (1 kg).', 'succes');
    expect(racine.querySelector('.detail-recolte__achat .message')).toBeNull();
  });

  it('ne montre jamais le bouton d’ajout pendant le chargement, ni à un producteur', () => {
    ouvrir('7', 'PRODUCTEUR');
    repondre(recolte());
    expect(racine.querySelector('#detail-ajouter')).toBeNull();
    expect(texteDe(racine)).not.toContain('Ajouter au panier');

    ouvrir('7', 'ACHETEUR');
    expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain(
      'Chargement de la récolte…',
    );
    expect(racine.querySelector('#detail-ajouter')).toBeNull();

    repondre(recolte());
    expect(racine.querySelector('#detail-ajouter')).not.toBeNull();
  });
});
