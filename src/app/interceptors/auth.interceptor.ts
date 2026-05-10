import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {catchError, finalize, Observable, of, shareReplay, switchMap, throwError} from 'rxjs';
import {AuthService} from "../service/auth.service";
import {Router} from "@angular/router";

/**
 * JWT sur les requêtes métier ; sur 401 une seule vague de refresh partagée (shareReplay),
 * puis rejoue chaque requête avec le nouveau bearer. Les appels /auth/* (sauf logout) ne passent pas
 * par ce flux pour éviter toute boucle avec /auth/refresh-token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  /** Refresh HTTP unique tant que des abonnés sont actifs (file d’attente implicite). */
  private refreshInFlight$: Observable<string> | null = null;

  constructor(private authService: AuthService, private router: Router) {}

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
      catchError(error => {
        // 403 = droits métier / tenant : ne pas tenter un refresh ni vider la session (sinon déconnexion intempestive).
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handleAuthError(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private isAuthEndpoint(url: string): boolean {
    const isAuth = url.includes('/api/rest/auth/');
    const isLogout = url.endsWith('/auth/logout');
    return isAuth && !isLogout;
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
