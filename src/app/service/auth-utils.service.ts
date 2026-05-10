import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AppRoles } from '../core/app-roles';

@Injectable({
  providedIn: 'root'
})
export class AuthUtilsService {
  private decodedToken: any | null = null;
  /** Dernière valeur de `localStorage` jwt déjà décodée ; invalide le cache si la chaîne change (nouvel utilisateur / logout). */
  private cachedJwtRaw: string | null | undefined = undefined;

  constructor() {
    this.syncFromStorage();
  }

  /**
   * Re-décode le JWT si le contenu localStorage a changé depuis la dernière lecture.
   * Sans cela, après logout + login d’un autre compte, `decodedToken` restait celui de l’utilisateur précédent.
   */
  private syncFromStorage(): void {
    const raw = localStorage.getItem('jwt');
    if (raw === this.cachedJwtRaw) {
      return;
    }
    this.cachedJwtRaw = raw === null ? null : raw;
    if (!raw) {
      this.decodedToken = null;
      return;
    }
    try {
      this.decodedToken = jwtDecode(raw);
    } catch {
      console.warn('Token invalide ou expiré');
      this.decodedToken = null;
    }
  }

  /** Retourne le token brut */
  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  /** Supprime les tokens */
  clearTokens(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh');
    this.decodedToken = null;
    this.cachedJwtRaw = undefined;
  }

  /** Retourne les rôles sous forme de tableau de strings */
  getRoles(): string[] {
    this.syncFromStorage();
    const fromToken = (this.decodedToken?.roles || []).map((r: any) => r.authority);
    if (fromToken.length > 0) {
      return fromToken;
    }
    const storedRole = localStorage.getItem('role');
    return storedRole ? [storedRole] : [];
  }

  /** Vérifie si l’utilisateur possède un rôle donné */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some((r) => userRoles.includes(r));
  }

  /** Vérifie la présence d’un token valide */
  isAuthenticated(): boolean {
    this.syncFromStorage();
    if (!this.decodedToken) return false;

    const now = Date.now() / 1000;
    return !!(this.decodedToken.exp && this.decodedToken.exp > now);
  }

  /** Vérifie si le token a expiré */
  isTokenExpired(): boolean {
    this.syncFromStorage();
    const now = Date.now() / 1000;
    return !this.decodedToken?.exp || this.decodedToken.exp < now;
  }

  /** Retourne les infos de l’utilisateur (email, name, etc.) */
  getUserInfo(): any {
    this.syncFromStorage();
    if (!this.decodedToken) return null;

    return {
      email: this.decodedToken.email,
      username: this.decodedToken.username,
      fullname: this.decodedToken.name,
      roles: this.getRoles(),
      tenantId: this.getTenantId(),
    };
  }

  getTenantId(): number | null {
    this.syncFromStorage();
    const fromToken = this.decodedToken?.tenant_id;
    if (fromToken !== undefined && fromToken !== null) {
      return Number(fromToken);
    }
    const stored = localStorage.getItem('tenantId');
    return stored ? Number(stored) : null;
  }

  /** École explicitement rattachée au compte (si présente dans le JWT). */
  getUserSchoolId(): number | null {
    this.syncFromStorage();
    const fromToken = this.decodedToken?.school_id ?? this.decodedToken?.schoolId;
    if (fromToken !== undefined && fromToken !== null) {
      const n = Number(fromToken);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /** Vérifie si l’utilisateur est super admin */
  isSuperAdmin(): boolean {
    return this.hasRole(AppRoles.SUPER_ADMIN);
  }
}
