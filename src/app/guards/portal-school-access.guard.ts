import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActiveSchoolService } from '../service/active-school.service';
import { AuthUtilsService } from '../service/auth-utils.service';

/**
 * Profils avec annuaire d’établissements : sans accès à un établissement → redirection vers {@code /acces-indisponible},
 * avec exceptions pour les notifications et la page d’explication elle-même.
 */
@Injectable({ providedIn: 'root' })
export class PortalSchoolAccessGuard implements CanActivateChild {
  constructor(
    private readonly router: Router,
    private readonly authUtils: AuthUtilsService,
    private readonly activeSchool: ActiveSchoolService
  ) {}

  canActivateChild(
    _childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    if (!this.authUtils.isAuthenticated()) {
      return of(true);
    }
    const path = this.normalizePath(state.url);
    /**
     * Centre de notifications : accessible même sans {@code school_id} valide dans le JWT ou avec annuaire vide.
     * Ne pas enchaîner {@link ActiveSchoolService.ensureInitialSchoolsSnapshot$} ici : sinon un GET /schools vide
     * déclenche une redirection globale depuis l’alignement JWT et casse la navigation depuis {@code /acces-indisponible}.
     */
    if (this.isNotificationsPath(path)) {
      return of(true);
    }
    if (!this.activeSchool.shouldLoadSchoolsForPicker()) {
      return of(true);
    }
    return this.activeSchool.ensureInitialSchoolsSnapshot$().pipe(
      map(() => this.resolveUrl(state.url))
    );
  }

  private resolveUrl(fullUrl: string): boolean | UrlTree {
    const url = this.normalizePath(fullUrl);
    if (!this.activeSchool.isPortalAccessBlocked()) {
      return true;
    }
    if (this.isAllowedWhenBlocked(url)) {
      return true;
    }
    return this.router.parseUrl('/acces-indisponible');
  }

  private normalizePath(fullUrl: string): string {
    let path = fullUrl.split('?')[0].split('#')[0];
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  /** Quand aucun établissement accessible : page dédiée + centre de notifications. */
  private isAllowedWhenBlocked(url: string): boolean {
    const path = url.startsWith('/') ? url : `/${url}`;
    if (path === '/acces-indisponible' || path.startsWith('/acces-indisponible/')) {
      return true;
    }
    return this.isNotificationsPath(path);
  }

  private isNotificationsPath(normalizedPath: string): boolean {
    const path = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    return path === '/notifications' || path.startsWith('/notifications/');
  }
}
