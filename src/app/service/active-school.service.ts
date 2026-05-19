import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable, Subscription, combineLatest, interval, of } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap, take, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api-base';
import { AppRoles } from '../core/app-roles';
import { ACTIVE_SCHOOL_ID_SESSION_KEY } from '../core/storage-keys';
import { School } from '../modules/admin/school/school-list/school-list.component';
import { SchoolService } from '../modules/admin/school/school.service';
import { AuthService } from './auth.service';
import { AuthUtilsService } from './auth-utils.service';

interface SwitchSchoolResponse {
  bearer: string;
  refresh: string;
}

export interface ActiveSchoolHeaderVm {
  /** Afficher un sélecteur (plus d’un établissement accessible). */
  showPicker: boolean;
  schools: School[];
  selectedId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ActiveSchoolService {
  private readonly schools$ = new BehaviorSubject<School[]>([]);
  private readonly selectedId$ = new BehaviorSubject<number | null>(null);
  private readonly contextRevision$ = new BehaviorSubject<number>(0);

  /** Détection suspension / retrait d’accès sans navigation (alignement JWT). */
  private schoolListPollSub?: Subscription;

  private readonly portalAccessBlockedSubject = new BehaviorSubject(false);

  /** Pour les profils « picker » : premier GET /schools terminé (succès ou erreur). */
  private readonly schoolDirectoryLoadedSubject = new BehaviorSubject(false);

  private readonly apiUrl = API_BASE_URL;

  readonly headerVm$: Observable<ActiveSchoolHeaderVm> = combineLatest([
    this.schools$,
    this.selectedId$
  ]).pipe(
    map(([schools, selectedId]) => ({
      showPicker: schools.length > 1,
      schools,
      selectedId
    }))
  );

  /** Incrémenté après un {@link switchSchool} réussi (tokens + session mis à jour). */
  readonly schoolContextRevision$: Observable<number> = this.contextRevision$.asObservable();

  /** Au moins deux établissements listés par l’API (affiliations actives ou tenant admin). */
  readonly hasMultipleSchools$: Observable<boolean> = this.schools$.pipe(
    map((schools) => schools.length > 1),
    distinctUntilChanged()
  );

  readonly activeSchoolId$: Observable<number | null> = this.selectedId$.asObservable().pipe(
    distinctUntilChanged()
  );

  readonly portalAccessBlocked$: Observable<boolean> = this.portalAccessBlockedSubject.asObservable();

  /**
   * Shell complet (sidebar + sélecteur) : faux tant que l’annuaire des établissements n’est pas prêt,
   * ou si aucun établissement accessible (ex. suspension).
   */
  readonly fullPortalChrome$: Observable<boolean> = combineLatest([
    this.portalAccessBlockedSubject,
    this.schoolDirectoryLoadedSubject
  ]).pipe(
    map(([blocked, loaded]) => this.computeFullPortalChrome(blocked, loaded)),
    distinctUntilChanged()
  );

  /**
   * Enveloppe pour le shell : évite {@code *ngIf="fullPortalChrome$ \| async as fullChrome"} car lorsque
   * {@code fullChrome === false}, la valeur est falsy et Angular ne rend pas le bloc (router-outlet inclus).
   */
  readonly portalShellVm$: Observable<{ fullChrome: boolean }> = this.fullPortalChrome$.pipe(
    map((fullChrome) => ({ fullChrome }))
  );

  constructor(
    private readonly http: HttpClient,
    private readonly schoolService: SchoolService,
    private readonly authUtils: AuthUtilsService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  isPortalAccessBlocked(): boolean {
    return this.portalAccessBlockedSubject.value;
  }

  /** Compte désactivé côté API : même rendu shell que « aucune école », sans attendre GET /schools. */
  applyAccountDisabledPortalState(): void {
    if (!this.authUtils.isAuthenticated()) {
      return;
    }
    this.portalAccessBlockedSubject.next(true);
    this.schoolDirectoryLoadedSubject.next(true);
    this.authService.clearSchoolHeaderTitle();
  }

  private computeFullPortalChrome(blocked: boolean, loaded: boolean): boolean {
    if (!this.authUtils.isAuthenticated()) {
      return true;
    }
    if (!this.shouldLoadSchoolsForPicker()) {
      return true;
    }
    // Annuaire chargé mais liste vide sans état « bloqué » (ex. erreur réseau) : pas de shell métier ni picker ambigu.
    if (loaded && !blocked && this.schools$.value.length === 0) {
      return false;
    }
    return loaded && !blocked;
  }

  /**
   * Utilisé par le garde : première requête annuaire avant navigation métier (profils picker).
   */
  ensureInitialSchoolsSnapshot$(): Observable<void> {
    if (!this.shouldLoadSchoolsForPicker()) {
      return of(undefined);
    }
    if (this.schoolDirectoryLoadedSubject.value) {
      return of(undefined);
    }
    return this.refreshSchools$().pipe(
      take(1),
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  /**
   * Charge la liste des écoles pour le sélecteur : admin tenant, ou profils avec affiliations
   * (directeur, staff, enseignant).
   */
  shouldLoadSchoolsForPicker(): boolean {
    if (!this.authUtils.isAuthenticated()) {
      return false;
    }
    if (this.authUtils.isSuperAdmin()) {
      return false;
    }
    return (
      this.authUtils.hasRole(AppRoles.ADMIN_ECOLE) ||
      this.authUtils.hasAnyRole([AppRoles.DIRECTOR, AppRoles.STAFF, AppRoles.TEACHER])
    );
  }

  /**
   * Bascule l’établissement actif côté backend (nouveau JWT avec rôle effectif + {@code school_id}),
   * puis met à jour le stockage local comme après login.
   */
  switchSchool(schoolId: number): Observable<void> {
    const url = `${this.apiUrl}/auth/switch-school`;
    return this.http.post<SwitchSchoolResponse>(url, { schoolId }).pipe(
      tap((res) => {
        this.authService.saveTokens(res.bearer, res.refresh);
        this.persistAndEmit(schoolId);
        this.contextRevision$.next(this.contextRevision$.value + 1);
      }),
      map(() => undefined)
    );
  }

  refreshSchools(): void {
    this.refreshSchools$().subscribe({
      error: () => {
        this.schools$.next([]);
        this.selectedId$.next(null);
      }
    });
  }

  /**
   * Enchaîne un poll léger (30 s) sur la liste des établissements accessibles ; si le JWT ne correspond plus
   * à cette liste, {@link refreshSchools$} réutilise déjà {@link alignJwtWithSchoolList$}.
   */
  ensureBackgroundSchoolListPolling(): void {
    if (!this.authUtils.isAuthenticated() || !this.shouldLoadSchoolsForPicker()) {
      return;
    }
    if (this.schoolListPollSub) {
      return;
    }
    this.schoolListPollSub = interval(30000)
      .pipe(
        switchMap(() => {
          if (!this.authUtils.isAuthenticated() || !this.shouldLoadSchoolsForPicker()) {
            return EMPTY;
          }
          return this.refreshSchools$();
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  stopBackgroundSchoolListPolling(): void {
    this.schoolListPollSub?.unsubscribe();
    this.schoolListPollSub = undefined;
  }

  /** Charge les établissements accessibles et met à jour la sélection (Observable pour enchaînements). */
  refreshSchools$(): Observable<School[]> {
    if (!this.shouldLoadSchoolsForPicker()) {
      this.schools$.next([]);
      const linked = this.authUtils.getUserSchoolId();
      this.persistAndEmit(linked);
      return of([]);
    }
    return this.schoolService.getAll().pipe(
      tap((schools) => {
        this.schools$.next(schools);
        if (this.shouldLoadSchoolsForPicker()) {
          const blocked = schools.length === 0;
          this.portalAccessBlockedSubject.next(blocked);
          if (blocked) {
            this.authService.clearSchoolHeaderTitle();
          } else {
            this.authService.reapplyHeaderTitleFromJwt();
          }
        } else {
          this.portalAccessBlockedSubject.next(false);
        }
        this.applySelectionForList(schools);
      }),
      switchMap((schools) => this.alignJwtWithSchoolList$(schools).pipe(map(() => schools))),
      catchError(() => {
        this.schools$.next([]);
        this.selectedId$.next(null);
        if (this.shouldLoadSchoolsForPicker() && !this.authService.isAccountDisabledSession()) {
          this.portalAccessBlockedSubject.next(false);
        }
        return of([]);
      }),
      finalize(() => {
        if (this.shouldLoadSchoolsForPicker()) {
          this.schoolDirectoryLoadedSubject.next(true);
        }
      })
    );
  }

  /**
   * Si le JWT pointe vers une école plus accessible (ex. suspension pendant la session), bascule vers une école
   * restante ou retour à l’accueil.
   */
  private alignJwtWithSchoolList$(schools: School[]): Observable<void> {
    if (!this.shouldLoadSchoolsForPicker()) {
      return of(undefined);
    }
    const jwtSchoolId = this.authUtils.getUserSchoolId();
    if (jwtSchoolId == null || !Number.isFinite(jwtSchoolId)) {
      return of(undefined);
    }
    if (schools.length === 0) {
      this.persistAndEmit(null);
      if (!this.isCurrentUrlNotificationsShell()) {
        void this.router.navigateByUrl('/acces-indisponible');
      }
      return of(undefined);
    }
    const stillOk = schools.some((s) => s.id === jwtSchoolId);
    if (stillOk) {
      return of(undefined);
    }
    return this.switchSchool(schools[0].id).pipe(
      catchError(() => {
        this.persistAndEmit(null);
        void this.router.navigateByUrl('/acces-indisponible');
        return of(undefined);
      })
    );
  }

  private applySelectionForList(schools: School[]): void {
    if (!schools.length) {
      if (this.shouldLoadSchoolsForPicker()) {
        this.persistAndEmit(null);
      } else {
        const jwtSchool = this.authUtils.getUserSchoolId();
        this.persistAndEmit(jwtSchool != null && Number.isFinite(jwtSchool) ? jwtSchool : null);
      }
      return;
    }
    const jwtSchoolId = this.authUtils.getUserSchoolId();
    const preferred =
      jwtSchoolId != null && schools.some((s) => s.id === jwtSchoolId)
        ? jwtSchoolId
        : this.readStoredId();
    const valid = preferred != null && schools.some((s) => s.id === preferred);
    const id = valid ? preferred! : schools[0].id;
    this.persistAndEmit(id);
  }

  private persistAndEmit(id: number | null): void {
    if (id == null) {
      sessionStorage.removeItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
    } else {
      sessionStorage.setItem(ACTIVE_SCHOOL_ID_SESSION_KEY, String(id));
    }
    this.selectedId$.next(id);
  }

  readStoredId(): number | null {
    const raw = sessionStorage.getItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
    if (raw == null || raw === '') {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  getActiveSchoolId(): number | null {
    return this.readStoredId();
  }

  /**
   * L’utilisateur peut consulter {@code /notifications} sans école active : ne pas lui imposer
   * une navigation vers {@code /acces-indisponible} depuis l’alignement JWT (ex. après {@code NavigationEnd}
   * qui relance {@link refreshSchools}).
   */
  private isCurrentUrlNotificationsShell(): boolean {
    let path = this.router.url.split('?')[0].split('#')[0];
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path === '/notifications' || path.startsWith('/notifications/');
  }

  clear(): void {
    this.stopBackgroundSchoolListPolling();
    this.schoolDirectoryLoadedSubject.next(false);
    this.portalAccessBlockedSubject.next(false);
    sessionStorage.removeItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
    this.schools$.next([]);
    this.selectedId$.next(null);
    this.contextRevision$.next(0);
  }
}
