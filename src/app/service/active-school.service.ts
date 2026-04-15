import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { SchoolService } from '../modules/admin/school/school.service';
import { School } from '../modules/admin/school/school-list/school-list.component';
import { AuthUtilsService } from './auth-utils.service';
import { AppRoles } from '../core/app-roles';
import { ACTIVE_SCHOOL_ID_SESSION_KEY } from '../core/storage-keys';

export interface ActiveSchoolHeaderVm {
  showPicker: boolean;
  schools: School[];
  selectedId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ActiveSchoolService {
  private readonly schools$ = new BehaviorSubject<School[]>([]);
  private readonly selectedId$ = new BehaviorSubject<number | null>(null);

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

  /** Établissement courant (session / premier établissement du tenant pour l’admin). */
  readonly activeSchoolId$: Observable<number | null> = this.selectedId$.asObservable().pipe(
    distinctUntilChanged()
  );

  constructor(
    private readonly schoolService: SchoolService,
    private readonly authUtils: AuthUtilsService
  ) {}

  /** Admin d’école : chargement des établissements du tenant pour le sélecteur. */
  shouldLoadSchoolsForPicker(): boolean {
    return (
      this.authUtils.isAuthenticated() &&
      !this.authUtils.isSuperAdmin() &&
      this.authUtils.hasRole(AppRoles.ADMIN_ECOLE)
    );
  }

  refreshSchools(): void {
    if (!this.shouldLoadSchoolsForPicker()) {
      this.schools$.next([]);
      this.selectedId$.next(null);
      return;
    }
    this.schoolService.getAll().subscribe({
      next: (schools) => {
        this.schools$.next(schools);
        this.applySelectionForList(schools);
      },
      error: () => {
        this.schools$.next([]);
        this.selectedId$.next(null);
      }
    });
  }

  private applySelectionForList(schools: School[]): void {
    if (!schools.length) {
      this.persistAndEmit(null);
      return;
    }
    const stored = this.readStoredId();
    const valid = stored != null && schools.some((s) => s.id === stored);
    const id = valid ? stored! : schools[0].id;
    this.persistAndEmit(id);
  }

  setActiveSchoolId(id: number): void {
    const schools = this.schools$.value;
    if (!schools.some((s) => s.id === id)) {
      return;
    }
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

  clear(): void {
    sessionStorage.removeItem(ACTIVE_SCHOOL_ID_SESSION_KEY);
    this.schools$.next([]);
    this.selectedId$.next(null);
  }
}
