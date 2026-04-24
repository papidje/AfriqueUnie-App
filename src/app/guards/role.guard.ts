import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, CanActivateChild, Router } from '@angular/router';
import {AuthUtilsService} from "../service/auth-utils.service";
import { AppRoles } from '../core/app-roles';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {

  constructor(private router: Router, private authUtils: AuthUtilsService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const token = localStorage.getItem('jwt');
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const allowedRoles = route.data['roles'] as string[] | undefined;
      if (!allowedRoles?.length) {
        return true;
      }
      const userRoles = this.authUtils.getRoles();
      const hasAccess = allowedRoles.some(role => userRoles.includes(role));
      if (!hasAccess) {
        if (userRoles.includes(AppRoles.SUPER_ADMIN)) {
          this.router.navigate(['/super-admin/dashboard']);
        } else {
          this.router.navigate(['/dashboard'], { queryParams: { accessDenied: '1' } });
        }
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erreur de décodage du token', err);
      this.router.navigate(['/login']);
      return false;
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot): boolean {
    return this.canActivate(route);
  }
}
