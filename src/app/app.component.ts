import {Component} from '@angular/core';
import {AuthService} from "./service/auth.service";
import {NavigationEnd, Router} from "@angular/router";
import {AuthUtilsService} from "./service/auth-utils.service";
import {ActiveSchoolService} from "./service/active-school.service";
import {
  ALL_APP_ROLES,
  AppRoles,
  ROLES_CLASSES_NAV,
  ROLES_STUDENTS_NAV,
  ROLES_USERS_NAV
} from "./core/app-roles";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  currentYear = new Date().getFullYear();
  opened = false;
  showLayout = true;

  /** Exposés au template : mêmes chaînes que JWT / Spring */
  readonly AppRoles = AppRoles;
  readonly navStudentsRoles = ROLES_STUDENTS_NAV;
  readonly navClassesRoles = ROLES_CLASSES_NAV;
  readonly navUsersRoles = ROLES_USERS_NAV;

  constructor(
    private service: AuthService,
    private router: Router,
    private authUtils: AuthUtilsService,
    readonly activeSchool: ActiveSchoolService
  ) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects.split('?')[0];
        const authPages = ['/login', '/register', '/register-school', '/activate', '/resetPwd', '/newPwd'];
        this.showLayout = !authPages.some((p) => url === p || url.startsWith(p + '/'));
        if (this.showLayout && this.activeSchool.shouldLoadSchoolsForPicker()) {
          this.activeSchool.refreshSchools();
        }
      }
    });
  }

  logout(): void {
    this.service.logout().subscribe({
      next: () => {
        this.service.clearTokens();
        this.activeSchool.clear();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Erreur lors du logout :', err);
        this.service.clearTokens();
        this.activeSchool.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  hasRole(role: string): boolean {
    return this.authUtils.hasRole(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.authUtils.hasAnyRole(roles);
  }

  /** Mêmes rôles que l’endpoint backend /dashboard/summary */
  hasDashboardAccess(): boolean {
    return this.authUtils.hasAnyRole([...ALL_APP_ROLES]);
  }

  get headerTitle(): string {
    return this.service.getHeaderDisplayTitle();
  }
}
