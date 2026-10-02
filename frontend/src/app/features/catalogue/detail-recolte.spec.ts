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

  /**
   * Le parent qui porte la colonne de page : la `<section>` tant que le plafond §20 n'est pas
   * en place, son `.conteneur` dès qu'il existe. Les tests de structure ne regardent que cette
   * relation, jamais le nom du parent — ils survivent donc à l'enveloppement du gabarit.
   */
  function colonne(): HTMLElement {
    const section = element<HTMLElement>(racine, 'section.detail-recolte');
    const premier = section.firstElementChild;
    if (premier && premier.classList.contains('conteneur')) {
      return premier as HTMLElement;
    }
    return section;
  }

  function dansLaColonne(selecteur: string): void {
    expect(element(racine, selecteur).parentElement).toBe(colonne());
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

  it('pose le statut sur la photo, dans la puce de « Récolte du moment »', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

    const puce = element<HTMLElement>(racine, '.detail-recolte__visuel .recolte__statut');
    expect(texteDe(puce)).toBe('Disponible');
    expect(puce.classList.contains('recolte__statut--epuise')).toBe(false);
    // Un seul indicateur de statut à l’écran : la puce remplace le badge du titre.
    expect(racine.querySelector('.detail-recolte__entete .badge')).toBeNull();
  });

  it('fonce la puce posée sur la photo d’une récolte épuisée', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: '/media/mangue-kent.jpg', statut: 'EPUISEE' }));

    const puce = element<HTMLElement>(racine, '.recolte__statut');
    expect(texteDe(puce)).toBe('Épuisée');
    expect(puce.classList.contains('recolte__statut--epuise')).toBe(true);
  });

  it('rend le statut au badge du titre quand aucune photo n’est affichée', () => {
    ouvrir('7');
    repondre(recolte({ imageUrl: null }));

    expect(racine.querySelector('.recolte__statut')).toBeNull();
    expect(texteDe(element(racine, '.detail-recolte__entete .badge'))).toBe('Disponible');

    ouvrir('7');
    repondre(recolte({ imageUrl: null, statut: 'EPUISEE' }));

    expect(texteDe(element(racine, '.detail-recolte__entete .badge'))).toBe('Épuisée');
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
    expect(notice?.message).toBe('Mangue Kent ajouté au panier');
    expect(racine.querySelector('.message--succes')).toBeNull();
    const lignes = panier().lignes();
    expect(lignes).toHaveLength(1);
    expect(lignes[0].recolteId).toBe(7);
    expect(lignes[0].quantite).toBe(1);
  });

  it('marque l’ajout d’une récolte épuisée comme impossible, bouton restant focusable', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte({ statut: 'EPUISEE', quantiteDisponible: 0 }));

    expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');
    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    expect(bouton.getAttribute('aria-disabled')).toBe('true');
    expect(bouton.disabled).toBe(false);
    expect(bouton.getAttribute('aria-describedby')).toBe('detail-motif');

    const motif = element(racine, '.detail-recolte__motif');
    expect(motif.getAttribute('role')).toBe('status');
    expect(texteDe(motif)).toContain('Épuisée');
    expect(panier().lignes()).toHaveLength(0);
  });

  it('n’ajoute rien quand on clique le bouton marqué aria-disabled', () => {
    ouvrir('7', 'ACHETEUR');
    repondre(recolte({ statut: 'EPUISEE', quantiteDisponible: 0 }));
    const appelee = vi.spyOn(TestBed.inject(ToastService), 'afficher');

    const bouton = element<HTMLButtonElement>(racine, '#detail-ajouter');
    bouton.click();
    fixture.detectChanges();
    bouton.click();
    fixture.detectChanges();

    expect(appelee).not.toHaveBeenCalled();
    expect(panier().lignes()).toHaveLength(0);
    expect(TestBed.inject(ToastService).notice()).toBeNull();
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

    expect(appelee).toHaveBeenCalledWith('Mangue Kent ajouté au panier', 'succes');
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

  describe('structure de page', () => {
    it('rend un titre h1 unique et le « Producteur » en h2', () => {
      ouvrir('7');
      repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

      expect(racine.querySelectorAll('h1')).toHaveLength(1);
      expect(texteDe(element(racine, 'h1'))).toBe('Mangue Kent');
      expect(element(racine, 'h1').closest('.detail-recolte__entete')).not.toBeNull();
      expect(racine.querySelectorAll('h2')).toHaveLength(1);
    });

    it('rend le chargement et « Récolte introuvable » sous le parent de colonne', () => {
      ouvrir('7');
      dansLaColonne('.detail-recolte__etat');

      repondreErreur(404, 'Recolte introuvable.');
      dansLaColonne('.detail-recolte__etat');
      expect(texteDe(element(racine, '.detail-recolte__etat'))).toContain('Récolte introuvable');
    });

    it('rend l’erreur serveur, puis la fiche, sous le même parent de colonne', () => {
      ouvrir('7');
      repondreErreur(500, 'Le service est temporairement indisponible.');
      dansLaColonne('.message--erreur');

      element<HTMLButtonElement>(racine, '.message--erreur button').click();
      const requete = attendre();
      repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }), requete);

      dansLaColonne('.detail-recolte__retour');
      dansLaColonne('.detail-recolte__fiche');
    });

    it('sépare la fiche en un bloc visuel et un bloc d’informations', () => {
      ouvrir('7');
      repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

      const fiche = element(racine, '.detail-recolte__fiche');
      const visuel = element(racine, '.detail-recolte__visuel');
      const infos = element(racine, '.detail-recolte__infos');
      expect(visuel.parentElement).toBe(fiche);
      expect(infos.parentElement).toBe(fiche);
      expect(fiche.children).toHaveLength(2);
      expect(visuel.querySelector('img.detail-recolte__image')).not.toBeNull();
      expect(visuel.querySelector('.recolte__statut')).not.toBeNull();
      expect(infos.querySelector('h1')).not.toBeNull();
      expect(infos.querySelector('.detail-recolte__mesures')).not.toBeNull();
    });

    it('laisse les informations seules dans la fiche sans photo', () => {
      ouvrir('7');
      repondre(recolte({ imageUrl: null }));

      expect(racine.querySelector('.detail-recolte__visuel')).toBeNull();
      const fiche = element(racine, '.detail-recolte__fiche');
      expect(fiche.children).toHaveLength(1);
      expect(fiche.firstElementChild).toBe(element(racine, '.detail-recolte__infos'));
      expect(texteDe(element(racine, '.detail-recolte__entete .badge'))).toBe('Disponible');
    });

    it('place toute la page dans un .conteneur unique (§20)', () => {
      ouvrir('7');
      repondre(recolte({ imageUrl: '/media/mangue-kent.jpg' }));

      const section = element<HTMLElement>(racine, 'section.detail-recolte');
      expect(section.querySelectorAll('.conteneur')).toHaveLength(1);
      const conteneur = element<HTMLElement>(section, '.conteneur');
      expect(conteneur.parentElement).toBe(section);
      expect(conteneur.querySelector('.detail-recolte__retour')).not.toBeNull();
      expect(conteneur.querySelector('h1')).not.toBeNull();
      expect(conteneur.querySelector('.detail-recolte__fiche')).not.toBeNull();

      // Les états passent par le même parent : vérifié sur une seconde monture, en chargement.
      ouvrir('7');
      const colonneEtat = element<HTMLElement>(racine, 'section.detail-recolte .conteneur');
      expect(element(racine, '.detail-recolte__etat').parentElement).toBe(colonneEtat);

      repondreErreur(404, 'Recolte introuvable.');
      expect(element(racine, '.detail-recolte__etat').parentElement).toBe(colonneEtat);
    });
  });
});
