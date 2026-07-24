import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {Observable, of, tap, catchError, throwError, finalize} from "rxjs";
import {jwtDecode} from "jwt-decode";
import {AppRoles} from "../core/app-roles";
import {ACTIVE_SCHOOL_ID_SESSION_KEY} from "../core/storage-keys";
import { API_BASE_URL } from '../core/api-base';
import { ThemeService } from './theme.service';
import { formatRoleLabel, formatRoleLabelsList } from '../core/role-labels';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = API_BASE_URL;
  private readonly ROLE_KEY = 'role';
  private readonly TENANT_KEY = 'tenantId';
  private readonly HEADER_TITLE_KEY = 'headerTitle';
  private readonly superAdminHeaderTitle = 'Gestion des écoles';

  /**
   * Réponses API {@code accountDisabled} — évite d’écraser l’état « portail bloqué » dans refreshSchools$.
   */
  private accountDisabledSession = false;

  private accountDisabledNavigated = false;

  /** Snapshot pour menu entête (JWT + rôle stocké). */
  getIdentitySnapshot(): { displayName: string; roleLabel: string } {
    const token = this.getToken();
    const fallbackRole = formatRoleLabel(localStorage.getItem(this.ROLE_KEY));
    if (!token) {
      return { displayName: 'Utilisateur', roleLabel: fallbackRole };
    }
    try {
      const decoded = jwtDecode<any>(token);
      const displayName =
        (typeof decoded?.name === 'string' && decoded.name.trim()) ||
        (typeof decoded?.fullname === 'string' && decoded.fullname.trim()) ||
        (typeof decoded?.email === 'string' && decoded.email.trim()) ||
        (typeof decoded?.username === 'string' && decoded.username.trim()) ||
        'Utilisateur';
      const roles = this.extractJwtRoleAuthorities(decoded);
      const stored = localStorage.getItem(this.ROLE_KEY);
      const roleLabel =
        roles.length > 1
          ? formatRoleLabelsList(roles)
          : formatRoleLabel(roles[0] || stored || '');
      return {
        displayName,
        roleLabel
      };
    } catch {
      return { displayName: 'Utilisateur', roleLabel: fallbackRole };
    }
  }

  constructor(
    private http: HttpClient,
    private readonly themeService: ThemeService
  ) {}

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh');
  }

  saveTokens(jwt: string, refresh: string): void {
    this.accountDisabledSession = false;
    this.accountDisabledNavigated = false;
    localStorage.setItem('jwt', jwt);
    localStorage.setItem('refresh', refresh);
    this.saveClaims(jwt);
    this.themeService.applyFromJwt();
  }

  clearTokens(): void {
    this.accountDisabledSession = false;
    this.accountDisabledNavigated = false;
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh');
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.TENANT_KEY);
    localStorage.removeItem(this.HEADER_TITLE_KEY);
    sessionStorage.removeItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
  }

  /** Masque le nom d’établissement dans la barre (ex. accès suspendu, avant synchro annuaire). */
  clearSchoolHeaderTitle(): void {
    localStorage.removeItem(this.HEADER_TITLE_KEY);
  }

  /** Restaure le libellé depuis le JWT courant après regain d’accès. */
  reapplyHeaderTitleFromJwt(): void {
    const token = this.getToken();
    if (token) {
      this.saveClaims(token);
    }
  }

  isAccountDisabledSession(): boolean {
    return this.accountDisabledSession;
  }

  /**
   * Marque la session comme désactivée ; {@code true} uniquement au premier appel (navigation shell unique).
   */
  beginAccountDisabledFlow(): boolean {
    this.accountDisabledSession = true;
    if (this.accountDisabledNavigated) {
      return false;
    }
    this.accountDisabledNavigated = true;
    return true;
  }

  /** Titre barre d’app : super admin = libellé global, sinon nom école / tenant depuis le JWT. */
  getHeaderDisplayTitle(): string {
    const role = localStorage.getItem(this.ROLE_KEY);
    if (role === AppRoles.SUPER_ADMIN) {
      return this.superAdminHeaderTitle;
    }
    return localStorage.getItem(this.HEADER_TITLE_KEY) || 'Mon organisation';
  }

  getPostLoginCommands(): string[] {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = jwtDecode<any>(token);
        const roles = this.extractJwtRoleAuthorities(decoded);
        const primary = this.pickPrimaryRoleAuthority(roles);
        if (primary === AppRoles.SUPER_ADMIN) {
          return ['/super-admin/dashboard'];
        }
        return ['/dashboard'];
      } catch {
        /* fallback below */
      }
    }
    const role = localStorage.getItem(this.ROLE_KEY);
    if (role === AppRoles.SUPER_ADMIN) {
      return ['/super-admin/dashboard'];
    }
    return ['/dashboard'];
  }

  /** JWT encore valide (exp > maintenant). */
  isAccessTokenValid(): boolean {
    const token = this.getToken();
    return !!token && this.isTokenValid(token);
  }

  refreshToken(): Observable<{ bearer: string; refresh: string }> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'No refresh token' })
      );
    }
    return this.http
      .post<{ bearer: string; refresh: string }>(`${this.apiUrl}/auth/refresh-token`, { refresh })
      .pipe(tap((response) => this.saveTokens(response.bearer, response.refresh)));
  }

  login(credentials: {userName: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  activate(data: {email: string, activationCode: string, newPassword: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/activate`, data);
  }

  /**
   * Révoque le JWT côté serveur si possible, puis efface impérativement le stockage local
   * (même en cas d’erreur réseau).
   */
  logout(): Observable<void> {
    const token = this.getToken();
    if (!token) {
      this.clearTokens();
      return of(void 0);
    }
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      catchError(() => of(void 0)),
      finalize(() => this.clearTokens())
    );
  }

  resetPassword(data: {email: string}): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, data);
  }

  newPassword(data: {email: string, code: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/new-password`, data);
  }

  registerSchoolAdmin(data: {
    username: string;
    adminFirstName: string;
    adminLastName: string;
    email: string;
    tenantName: string;
    schoolName: string;
    schoolAddress: string;
    tenantLogo: string;
    schoolContact: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register-school-admin`, data);
  }

  async initializeAuthState(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      this.clearTokens();
      return;
    }

    if (this.isTokenValid(token)) {
      this.saveClaims(token);
      if (!this.tokenHasRequiredSchoolClaim(token)) {
        await this.tryRefreshTokenSilently();
      }
      return;
    }

    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.clearTokens();
      return;
    }

    await this.tryRefreshTokenSilently();
  }

  private async tryRefreshTokenSilently(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.refreshToken().pipe(
        catchError(() => {
          this.clearTokens();
          return of(null);
        })
      ).subscribe({
        next: () => resolve(),
        error: () => resolve()
      });
    });
  }

  /**
   * STAFF / TEACHER / DIRECTOR doivent embarquer `school_id` pour initialiser l’école active
   * dans les pages métiers (classes, élèves, finance, ...).
   */
  private tokenHasRequiredSchoolClaim(token: string): boolean {
    try {
      const decoded = jwtDecode<any>(token);
      const roles = this.extractJwtRoleAuthorities(decoded);
      const needsSchoolClaim =
        roles.includes(AppRoles.STAFF) ||
        roles.includes(AppRoles.TEACHER) ||
        roles.includes(AppRoles.DIRECTOR);
      if (!needsSchoolClaim) {
        return true;
      }
      return decoded?.school_id !== undefined && decoded?.school_id !== null;
    } catch {
      return false;
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded = jwtDecode<any>(token);
      const now = Date.now() / 1000;
      return !!decoded?.exp && decoded.exp > now;
    } catch {
      return false;
    }
  }

  private extractJwtRoleAuthorities(decoded: unknown): string[] {
    if (!decoded || typeof decoded !== 'object') {
      return [];
    }
    const rolesRaw = (decoded as { roles?: unknown }).roles;
    if (!Array.isArray(rolesRaw)) {
      return [];
    }
    return rolesRaw
      .map((r: { authority?: string } | string) =>
        typeof r === 'string' ? r : (r as { authority?: string }).authority
      )
      .filter((r: string | undefined): r is string => !!r);
  }

  /** Routage / stockage local : priorité métier lorsque le JWT porte plusieurs autorités (multi-affiliation). */
  private pickPrimaryRoleAuthority(authorities: string[]): string | null {
    const order: string[] = [
      AppRoles.SUPER_ADMIN,
      AppRoles.ADMIN_ECOLE,
      AppRoles.DIRECTOR,
      AppRoles.TEACHER,
      AppRoles.STAFF
    ];
    for (const o of order) {
      if (authorities.includes(o)) {
        return o;
      }
    }
    return authorities[0] ?? null;
  }

  private saveClaims(jwt: string): void {
    try {
      const decoded = jwtDecode<any>(jwt);
      const authorities = this.extractJwtRoleAuthorities(decoded);
      const primary = this.pickPrimaryRoleAuthority(authorities);
      if (primary) {
        localStorage.setItem(this.ROLE_KEY, primary);
      }
      if (decoded?.tenant_id !== undefined && decoded?.tenant_id !== null) {
        localStorage.setItem(this.TENANT_KEY, String(decoded.tenant_id));
      } else {
        localStorage.removeItem(this.TENANT_KEY);
      }
      const ht = decoded?.header_title ?? decoded?.school_display_name;
      if (typeof ht === 'string' && ht.trim().length > 0) {
        localStorage.setItem(this.HEADER_TITLE_KEY, ht.trim());
      } else {
        localStorage.removeItem(this.HEADER_TITLE_KEY);
      }
    } catch {
      localStorage.removeItem(this.ROLE_KEY);
      localStorage.removeItem(this.TENANT_KEY);
      localStorage.removeItem(this.HEADER_TITLE_KEY);
    }
  }
}
