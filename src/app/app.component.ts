import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { AuthService } from './service/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { AuthUtilsService } from './service/auth-utils.service';
import { ActiveSchoolService } from './service/active-school.service';
import { ThemeService } from './service/theme.service';
import { InAppNotificationApiService } from './service/in-app-notification-api.service';
import { Subject, interval, merge, of } from 'rxjs';
import { catchError, filter, switchMap, take, takeUntil } from 'rxjs/operators';
import {
  AppRoles,
  ROLES_CLASSES_NAV,
  ROLES_COMMUNICATION_NAV,
  ROLES_FINANCIAL_NAV,
  ROLES_STUDENTS_NAV,
  SCHOOL_PORTAL_ROLES
} from "./core/app-roles";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('userMenuTrigger') userMenuTrigger?: MatMenuTrigger;

  private readonly destroy$ = new Subject<void>();

  currentYear = new Date().getFullYear();
  sidebarExpanded = false;
  showLayout = true;
  unreadBadgeCount = 0;

  /** Exposés au template : mêmes chaînes que JWT / Spring */
  readonly AppRoles = AppRoles;
  readonly navStudentsRoles = ROLES_STUDENTS_NAV;
  readonly navClassesRoles = ROLES_CLASSES_NAV;
  readonly navParentsRoles = ROLES_STUDENTS_NAV;
  readonly navFinancialRoles = ROLES_FINANCIAL_NAV;
  readonly navCommunicationRoles = ROLES_COMMUNICATION_NAV;

  constructor(
    readonly authService: AuthService,
    private router: Router,
    private authUtils: AuthUtilsService,
    readonly activeSchool: ActiveSchoolService,
    private readonly themeService: ThemeService,
    private readonly inAppNotifications: InAppNotificationApiService
  ) {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects.split('?')[0];
        const authPages = ['/login', '/register', '/register-school', '/activate', '/resetPwd', '/newPwd'];
        this.showLayout = !authPages.some((p) => url === p || url.startsWith(p + '/'));
        if (this.showLayout && this.authUtils.isAuthenticated()) {
          if (!this.isSchoolDirectoryDeferredRoute(url)) {
            this.activeSchool.refreshSchools();
            this.activeSchool.ensureBackgroundSchoolListPolling();
          } else {
            this.activeSchool.stopBackgroundSchoolListPolling();
          }
          this.refreshUnreadBadgeCount();
        } else {
          this.activeSchool.stopBackgroundSchoolListPolling();
          this.unreadBadgeCount = 0;
        }
      });
  }

  ngOnInit(): void {
    this.themeService.init();
    merge(this.inAppNotifications.unreadBump$, interval(60000))
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.authUtils.isAuthenticated()),
        switchMap(() =>
          this.inAppNotifications.getUnreadCount().pipe(catchError(() => of(0)))
        )
      )
      .subscribe((n) => (this.unreadBadgeCount = n));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sur ces routes le portail est réduit (pas d’école active) : ne pas relancer GET /schools ni le polling annuaire ;
   * le badge utilise uniquement les endpoints notifications.
   */
  private isSchoolDirectoryDeferredRoute(url: string): boolean {
    return (
      url === '/notifications' ||
      url === '/acces-indisponible' ||
      url.startsWith('/notifications/') ||
      url.startsWith('/acces-indisponible/')
    );
  }

  private refreshUnreadBadgeCount(): void {
    if (!this.authUtils.isAuthenticated()) {
      this.unreadBadgeCount = 0;
      return;
    }
    this.inAppNotifications
      .getUnreadCount()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (n) => (this.unreadBadgeCount = n),
        error: () => (this.unreadBadgeCount = 0)
      });
  }

  /** Identité affichée dans le menu compte (header). */
  get identity(): { displayName: string; roleLabel: string } {
    return this.authService.getIdentitySnapshot();
  }

  /** Initiales pour l’avatar (première lettre prénom + première lettre nom si disponible). */
  get userInitials(): string {
    const raw = this.identity.displayName.trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return (a + b).toUpperCase();
  }

  logoutFromMenu(): void {
    this.userMenuTrigger?.closeMenu();
    this.authService.logout().subscribe({
      next: () => {
        this.unreadBadgeCount = 0;
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

  /** Aligné sur `/dashboard` : app école uniquement (pas le super-admin). */
  hasDashboardAccess(): boolean {
    return this.authUtils.hasAnyRole([...SCHOOL_PORTAL_ROLES]);
  }

  /** Lien Finance : rôles financiers, jamais les enseignants. */
  showFinanceNav(): boolean {
    return this.hasAnyRole(this.navFinancialRoles) && !this.hasRole(AppRoles.TEACHER);
  }

  /** Bloc administration (staff / école) : jamais les enseignants. */
  showAdministrationNav(): boolean {
    return (this.hasRole(AppRoles.ADMIN_ECOLE) || this.hasRole(AppRoles.DIRECTOR))
      && !this.hasRole(AppRoles.TEACHER);
  }

  get headerTitle(): string {
    return this.authService.getHeaderDisplayTitle();
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    // Force Angular Material layout recalculation immediately and after transition.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
  }
}
