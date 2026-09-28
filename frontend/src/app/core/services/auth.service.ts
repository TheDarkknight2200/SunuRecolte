import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  ConnexionRequest,
  InscriptionRequest,
  SessionUtilisateur,
} from '../modeles/auth.modeles';
import { Role } from '../modeles/referentiels';

/** Clés de stockage local — voir FRONTEND_DESIGN.md §19. */
export const CLE_JETON = 'sunurecolte.jeton';
export const CLE_UTILISATEUR = 'sunurecolte.utilisateur';

/**
 * Seul point d'accès au jeton et à la session côté frontend.
 * Aucun composant ne lit le stockage local directement ; l'intercepteur
 * passe par ce service.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly etatJeton = signal<string | null>(lireStockage(CLE_JETON));
  private readonly etatSession = signal<SessionUtilisateur | null>(lireSessionStockee());

  /** Identité affichée (jamais une autorisation : le rôle est relu en base par le backend). */
  readonly session = this.etatSession.asReadonly();
  readonly estConnecte = computed(() => this.etatSession() !== null);
  readonly role = computed<Role | null>(() => this.etatSession()?.role ?? null);

  /** POST /api/auth/inscription — connecte l'utilisateur à l'issue de la création du compte. */
  inscription(requete: InscriptionRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/inscription`, requete)
      .pipe(tap((reponse) => this.enregistrerSession(reponse)));
  }

  /** POST /api/auth/connexion */
  connexion(requete: ConnexionRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/connexion`, requete)
      .pipe(tap((reponse) => this.enregistrerSession(reponse)));
  }

  /** Déconnexion locale : le backend étant sans état, aucun appel n'est nécessaire. */
  deconnexion(): void {
    this.purgerSession();
  }

  jeton(): string | null {
    return this.etatJeton();
  }

  /**
   * Session locale utilisable ? Un jeton expiré localement est purgé avant navigation.
   * Ce contrôle n'est qu'un confort d'usage : l'autorisation réelle est rendue par l'API.
   */
  sessionValide(): boolean {
    const jeton = this.etatJeton();
    if (!jeton) {
      return false;
    }
    if (jetonEstExpire(jeton)) {
      this.purgerSession();
      return false;
    }
    return true;
  }

  purgerSession(): void {
    try {
      localStorage.removeItem(CLE_JETON);
      localStorage.removeItem(CLE_UTILISATEUR);
    } catch {
      // Stockage indisponible : l'état en mémoire est purgé juste après.
    }
    this.etatJeton.set(null);
    this.etatSession.set(null);
  }

  private enregistrerSession(reponse: AuthResponse): void {
    const session: SessionUtilisateur = {
      utilisateurId: reponse.utilisateurId,
      nom: reponse.nom,
      prenom: reponse.prenom,
      email: reponse.email,
      role: reponse.role,
    };
    try {
      localStorage.setItem(CLE_JETON, reponse.token);
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(session));
    } catch {
      // Stockage indisponible : la session reste utilisable en mémoire.
    }
    this.etatJeton.set(reponse.token);
    this.etatSession.set(session);
  }
}

function lireStockage(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function lireSessionStockee(): SessionUtilisateur | null {
  const brut = lireStockage(CLE_UTILISATEUR);
  if (!brut) {
    return null;
  }
  try {
    const valeur = JSON.parse(brut) as unknown;
    return typeof valeur === 'object' && valeur !== null ? (valeur as SessionUtilisateur) : null;
  } catch {
    return null;
  }
}

/**
 * Lit la date d'expiration du jeton sans le divulguer. Un jeton illisible
 * est considéré comme non expiré : c'est le backend qui tranchera (401).
 */
function jetonEstExpire(jeton: string): boolean {
  const charge = lireCharge(jeton);
  const expiration = charge?.['exp'];
  return typeof expiration === 'number' && expiration * 1000 <= Date.now();
}

function lireCharge(jeton: string): Record<string, unknown> | null {
  const parties = jeton.split('.');
  if (parties.length !== 3) {
    return null;
  }
  try {
    const base64 = parties[1].replace(/-/g, '+').replace(/_/g, '/');
    const charge = JSON.parse(atob(base64)) as unknown;
    return typeof charge === 'object' && charge !== null
      ? (charge as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
