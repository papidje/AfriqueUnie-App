import {Component} from '@angular/core';
import {AuthService} from "./service/auth.service";
import {NavigationEnd, Router} from "@angular/router";
import {AuthUtilsService} from "./service/auth-utils.service";
import {ActiveSchoolService} from "./service/active-school.service";
import {
  ALL_APP_ROLES,
  AppRoles,
  ROLES_CLASSES_NAV,
  ROLES_FINANCIAL_NAV,
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
  sidebarExpanded = false;
  showLayout = true;

  /** Exposés au template : mêmes chaînes que JWT / Spring */
  readonly AppRoles = AppRoles;
  readonly navStudentsRoles = ROLES_STUDENTS_NAV;
  readonly navClassesRoles = ROLES_CLASSES_NAV;
  readonly navUsersRoles = ROLES_USERS_NAV;
  readonly navFinancialRoles = ROLES_FINANCIAL_NAV;

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
        if (this.showLayout) {
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

  get tenantTitle(): string {
    return this.headerTitle;
  }

  get tenantShortTitle(): string {
    const words = (this.tenantTitle || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '—';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  selectedSchoolName(vm: { schools: Array<{ id: number; name: string }>; selectedId: number | null }): string | null {
    if (vm.selectedId == null) return null;
    const selected = vm.schools.find((s) => s.id === vm.selectedId);
    return selected?.name ?? null;
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    // Force Angular Material layout recalculation immediately and after transition.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
  }
}
