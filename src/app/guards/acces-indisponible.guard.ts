import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActiveSchoolService } from '../service/active-school.service';
import { AuthService } from '../service/auth.service';
import { AuthUtilsService } from '../service/auth-utils.service';

/**
 * La route {@code /acces-indisponible} n’est pertinente que pour les profils « annuaire écoles »
 * sans aucun établissement accessible (ou compte désactivé côté API). Les autres utilisateurs sont renvoyés vers les notifications.
 * Pas de boucle avec {@link PortalSchoolAccessGuard} : {@code /notifications} est autorisée sans passer par ce garde ;
 * un clic depuis cette page vers les notifications ne doit pas être bloqué.
 */
@Injectable({ providedIn: 'root' })
export class AccesIndisponibleGuard implements CanActivate {
  constructor(
    private readonly router: Router,
    private readonly authUtils: AuthUtilsService,
    private readonly activeSchool: ActiveSchoolService,
    private readonly authService: AuthService
  ) {}

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    if (!this.authUtils.isAuthenticated()) {
      return this.router.parseUrl('/login');
    }
    if (!this.activeSchool.shouldLoadSchoolsForPicker()) {
      return this.router.parseUrl('/notifications');
    }
    return this.activeSchool.ensureInitialSchoolsSnapshot$().pipe(
      map(() => {
        const noSchoolAccess =
          this.activeSchool.isPortalAccessBlocked() || this.authService.isAccountDisabledSession();
        if (!noSchoolAccess) {
          return this.router.parseUrl('/notifications');
        }
        return true;
      })
    );
  }
}
