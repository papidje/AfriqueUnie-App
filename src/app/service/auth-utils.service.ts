import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AppRoles } from '../core/app-roles';

@Injectable({
  providedIn: 'root'
})
export class AuthUtilsService {
  private decodedToken: any | null = null;

  constructor() {
    this.loadToken();
  }

  /** Charge et décode le token au démarrage du service */
  private loadToken(): void {
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        this.decodedToken = jwtDecode(token);
      } catch (e) {
        console.warn('Token invalide ou expiré');
        this.decodedToken = null;
      }
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
  }

  /** Retourne les rôles sous forme de tableau de strings */
  getRoles(): string[] {
    if (!this.decodedToken) this.loadToken();
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
    return roles.some((role) => userRoles.includes(role));
  }

  /** Vérifie la présence d’un token valide */
  isAuthenticated(): boolean {
    if (!this.decodedToken) this.loadToken();
    if (!this.decodedToken) return false;

    const now = Date.now() / 1000;
    return this.decodedToken.exp && this.decodedToken.exp > now;
  }

  /** Vérifie si le token a expiré */
  isTokenExpired(): boolean {
    if (!this.decodedToken) this.loadToken();
    const now = Date.now() / 1000;
    return !this.decodedToken?.exp || this.decodedToken.exp < now;
  }

  /** Retourne les infos de l’utilisateur (email, name, etc.) */
  getUserInfo(): any {
    if (!this.decodedToken) this.loadToken();
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
    if (!this.decodedToken) this.loadToken();
    const fromToken = this.decodedToken?.tenant_id;
    if (fromToken !== undefined && fromToken !== null) {
      return Number(fromToken);
    }
    const stored = localStorage.getItem('tenantId');
    return stored ? Number(stored) : null;
  }

  /** École explicitement rattachée au compte (si présente dans le JWT). */
  getUserSchoolId(): number | null {
    if (!this.decodedToken) this.loadToken();
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
