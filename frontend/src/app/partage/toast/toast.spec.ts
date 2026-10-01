import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TiroirPanierService } from '../../core/services/tiroir-panier.service';
import { ToastService } from '../../core/services/toast.service';
import { Toast } from './toast';

describe('Toast', () => {
  let fixture: ComponentFixture<Toast>;
  let racine: HTMLElement;
  let toast: ToastService;
  let tiroir: TiroirPanierService;

  function monter(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Toast);
    racine = fixture.nativeElement as HTMLElement;
    toast = TestBed.inject(ToastService);
    tiroir = TestBed.inject(TiroirPanierService);
    fixture.detectChanges();
  }

  /** Une notice sortie du service doit être rendue puis retirée du DOM. */
  function afficher(message: string, type: 'succes' | 'erreur' | 'info' = 'info'): void {
    toast.afficher(message, type);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    tiroir.fermer();
    vi.runAllTimers();
    vi.useRealTimers();
    fixture?.destroy();
  });

  it('garde deux régions permanentes, polie pour le succès, immédiate pour l’erreur', () => {
    monter();

    const regions = Array.from(racine.querySelectorAll<HTMLElement>('.toast__region'));
    expect(regions).toHaveLength(2);
    expect(regions[0]?.getAttribute('role')).toBe('status');
    expect(regions[0]?.getAttribute('aria-live')).toBe('polite');
    expect(regions[1]?.getAttribute('role')).toBe('alert');

    // Rien n’est rendu : les deux régions sont là, vides.
    expect(racine.querySelector('.toast')).toBeNull();

    afficher('Récolte enregistrée', 'succes');
    expect(racine.querySelector('.toast__region[role="status"] .toast')?.textContent).toContain(
      'Récolte enregistrée',
    );
    expect(racine.querySelector('.toast__region[role="alert"] .toast')).toBeNull();

    afficher('Le panier est plein', 'erreur');
    expect(racine.querySelectorAll('.toast')).toHaveLength(1);
    expect(racine.querySelector('.toast__region[role="alert"] .toast')?.textContent).toContain(
      'Le panier est plein',
    );
  });

  it('rend la variante demandée et le défilement des glyphes', () => {
    monter();

    afficher('Arachides ajouté au panier', 'succes');
    expect(racine.querySelector('.toast--succes')).not.toBeNull();

    afficher('Information de service', 'info');
    expect(racine.querySelector('.toast--info')).not.toBeNull();
    expect(racine.querySelector('.toast--succes')).toBeNull();
  });

  it('n’affiche jamais deux notices en même temps', () => {
    monter();

    afficher('Première récolte ajoutée', 'succes');
    afficher('Seconde récolte ajoutée', 'succes');

    expect(racine.querySelectorAll('.toast')).toHaveLength(1);
    expect(racine.querySelector('.toast__texte')?.textContent).toBe('Seconde récolte ajoutée');
  });

  it('retire une notice de succès au bout de 2500 ms, une erreur au bout de 5000 ms', () => {
    monter();

    afficher('Mangue ajouté au panier', 'succes');
    vi.advanceTimersByTime(2499);
    fixture.detectChanges();
    expect(toast.notice()).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(toast.notice()?.message).toBe('Mangue ajouté au panier');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(toast.notice()).toBeNull();
    expect(racine.querySelector('.toast')).toBeNull();

    afficher('Stock dépassé', 'erreur');
    vi.advanceTimersByTime(4999);
    expect(toast.notice()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toast.notice()).not.toBeNull();
    vi.advanceTimersByTime(300);
    expect(toast.notice()).toBeNull();
  });

  it('met le minuteur en pause au survol et le reprend où il s’est arrêté', () => {
    monter();
    afficher('Niébe ajouté au panier', 'succes');

    racine.querySelector<HTMLElement>('.toast__zone')?.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(10_000);
    expect(toast.notice()?.message).toBe('Niébe ajouté au panier');

    // Il reste 2500 ms : la reprise ne doit pas les allonger.
    racine.querySelector<HTMLElement>('.toast__zone')?.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(2499);
    expect(toast.notice()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toast.notice()).not.toBeNull();
    vi.advanceTimersByTime(300);
    expect(toast.notice()).toBeNull();
  });

  it('met aussi le minuteur en pause pendant que la notice a le focus', () => {
    monter();
    afficher('Niébe ajouté au panier', 'succes');

    racine.querySelector<HTMLElement>('.toast__zone')?.dispatchEvent(new Event('focusin'));
    vi.advanceTimersByTime(20_000);
    expect(toast.notice()).not.toBeNull();

    racine.querySelector<HTMLElement>('.toast__zone')?.dispatchEvent(new Event('focusout'));
    vi.advanceTimersByTime(2_500 + 300);
    expect(toast.notice()).toBeNull();
  });

  it('propose un bouton de fermeture à l’erreur seule et retire la notice', () => {
    monter();

    afficher('Panier déjà au maximum', 'succes');
    expect(racine.querySelector('.toast__fermer')).toBeNull();

    afficher('Le panier n’a pas pu être enregistré', 'erreur');
    const fermer = racine.querySelector<HTMLButtonElement>('.toast__fermer');
    expect(fermer).not.toBeNull();
    expect(fermer?.getAttribute('aria-label')).toBe('Fermer la notification');

    fermer?.click();
    expect(toast.notice()).not.toBeNull();
    vi.advanceTimersByTime(300);
    expect(toast.notice()).toBeNull();
  });

  it('ne rend aucune notice pendant que le panier latéral est ouvert', () => {
    monter();
    tiroir.ouvrir();

    afficher('Carotte ajouté au panier', 'succes');
    expect(racine.querySelector('.toast')).toBeNull();

    tiroir.fermer();
    fixture.detectChanges();
    expect(racine.querySelector('.toast--succes')?.textContent).toContain(
      'Carotte ajouté au panier',
    );
  });
});
