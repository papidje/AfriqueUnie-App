import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import {catchError, finalize, Observable, of, shareReplay, switchMap, throwError} from 'rxjs';
import { AuthService } from '../service/auth.service';
import { ActiveSchoolService } from '../service/active-school.service';
import { Router } from '@angular/router';

/**
 * JWT sur les requêtes métier ; sur 401 une seule vague de refresh partagée (shareReplay),
 * puis rejoue chaque requête avec le nouveau bearer. Les appels /auth/* (sauf logout) ne passent pas
 * par ce flux pour éviter toute boucle avec /auth/refresh-token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  /** Refresh HTTP unique tant que des abonnés sont actifs (file d’attente implicite). */
  private refreshInFlight$: Observable<string> | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private readonly activeSchool: ActiveSchoolService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isAuthEndpoint(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    let authReq = req;

    if (token) {
      authReq = this.addTokenHeader(req, token);
    }

    return next.handle(authReq).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 403 && this.isAccountDisabledBody(error)) {
          if (!this.isInAppNotificationReadRequest(req.url)) {
            this.triggerAccountDisabledUi();
          }
          return throwError(() => error);
        }
        // 403 métier : pas de refresh token ; 401 → tentative refresh ci-dessous.
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handleAuthError(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private triggerAccountDisabledUi(): void {
    if (this.authService.beginAccountDisabledFlow()) {
      this.activeSchool.applyAccountDisabledPortalState();
      void this.router.navigate(['/acces-indisponible'], { queryParams: { raison: 'compte' } });
    }
  }

  private isAccountDisabledBody(error: HttpErrorResponse): boolean {
    const body = error.error;
    return (
      body !== null &&
      typeof body === 'object' &&
      (body as { accountDisabled?: unknown }).accountDisabled === true
    );
  }

  /**
   * GET liste / compteur notifications : le composant gère les erreurs sans redirection globale « compte ».
   */
  private isInAppNotificationReadRequest(url: string): boolean {
    const path = url.split('?')[0];
    const suffix = '/notifications';
    const idx = path.lastIndexOf(suffix);
    if (idx < 0) {
      return false;
    }
    const after = path.slice(idx + suffix.length);
    return after === '' || after === '/' || after === '/unread-count';
  }

  /** Requêtes auth sans en-tête Bearer (login, refresh, …), sauf logout et switch-school. */
  private isAuthEndpoint(url: string): boolean {
    const isAuth = url.includes('/auth/');
    const isLogout = url.includes('/auth/logout');
    const isSwitchSchool = url.includes('/auth/switch-school');
    return isAuth && !isLogout && !isSwitchSchool;
  }

  private addTokenHeader(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  private handleAuthError(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService.getRefreshToken()) {
      this.authService.clearTokens();
      this.router.navigate(['/login']);
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    return this.refreshSessionJwt().pipe(
      switchMap((newJwt) => next.handle(this.addTokenHeader(request, newJwt))),
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 403 && this.isAccountDisabledBody(err)) {
          if (!this.isInAppNotificationReadRequest(request.url)) {
            this.triggerAccountDisabledUi();
          }
          return throwError(() => err);
        }
        this.authService.clearTokens();
        this.router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }

  /**
   * Une seule requête refresh pour N appels 401 parallèles ; finalize réinitialise pour le prochain cycle.
   */
  private refreshSessionJwt(): Observable<string> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.authService.refreshToken().pipe(
        switchMap((res: { bearer?: string }) => {
          const bearer = res?.bearer ?? this.authService.getToken();
          return bearer ? of(bearer) : throwError(() => new HttpErrorResponse({ status: 401 }));
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        finalize(() => {
          this.refreshInFlight$ = null;
        })
      );
    }
    return this.refreshInFlight$;
  }
}
