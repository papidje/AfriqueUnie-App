import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, of, tap, catchError} from "rxjs";
import {jwtDecode} from "jwt-decode";
import {AppRoles} from "../core/app-roles";
import {ACTIVE_SCHOOL_ID_SESSION_KEY} from "../core/storage-keys";
import { API_BASE_URL } from '../core/api-base';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = API_BASE_URL;
  private readonly ROLE_KEY = 'role';
  private readonly TENANT_KEY = 'tenantId';
  private readonly HEADER_TITLE_KEY = 'headerTitle';
  private readonly superAdminHeaderTitle = 'Gestion des écoles';

  constructor(private http: HttpClient) { }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh');
  }

  saveTokens(jwt: string, refresh: string): void {
    localStorage.setItem('jwt', jwt);
    localStorage.setItem('refresh', refresh);
    this.saveClaims(jwt);
  }

  clearTokens(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh');
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.TENANT_KEY);
    localStorage.removeItem(this.HEADER_TITLE_KEY);
    sessionStorage.removeItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
  }

  /** Titre barre d’app : super admin = libellé global, sinon nom école / tenant depuis le JWT. */
  getHeaderDisplayTitle(): string {
    const role = localStorage.getItem(this.ROLE_KEY);
    if (role === AppRoles.SUPER_ADMIN) {
      return this.superAdminHeaderTitle;
    }
    return localStorage.getItem(this.HEADER_TITLE_KEY) || 'Mon organisation';
  }

  refreshToken(): Observable<any> {
    const refresh = this.getRefreshToken();
    return this.http.post(`${this.apiUrl}/auth/refresh-token`, { refresh: refresh }).pipe(
      tap((response: any) => {
        this.saveTokens(response.bearer, response.refresh);
      })
    );
  }

  login(credentials: {userName: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  activate(data: {email: string, activationCode: string, newPassword: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/activate`, data);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {});
  }

  resetPassword(data: {email: string}): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, data);
  }

  newPassword(data: {email: string, code: string, password: string}): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/new-password`, data);
  }

  registerSchoolAdmin(data: {
    username: string;
    fullname: string;
    email: string;
    tenantName: string;
    schoolName: string;
    tenantAddress: string;
    tenantLogo: string;
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
   * STAFF / TEACHER / DIRECTOR / ACCOUNTANT doivent embarquer `school_id` pour initialiser l’école active
   * dans les pages métiers (classes, élèves, finance, ...).
   */
  private tokenHasRequiredSchoolClaim(token: string): boolean {
    try {
      const decoded = jwtDecode<any>(token);
      const rolesRaw = decoded?.roles;
      const roles: string[] = Array.isArray(rolesRaw)
        ? rolesRaw
            .map((r: any) => (typeof r === 'string' ? r : r?.authority))
            .filter((r: string | undefined): r is string => !!r)
        : [];
      const needsSchoolClaim =
        roles.includes(AppRoles.STAFF) ||
        roles.includes(AppRoles.TEACHER) ||
        roles.includes(AppRoles.DIRECTOR) ||
        roles.includes(AppRoles.ACCOUNTANT);
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

  private saveClaims(jwt: string): void {
    try {
      const decoded = jwtDecode<any>(jwt);
      const roles = (decoded?.roles || []) as Array<{ authority?: string }>;
      const firstRole = roles[0]?.authority;
      if (firstRole) {
        localStorage.setItem(this.ROLE_KEY, firstRole);
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
