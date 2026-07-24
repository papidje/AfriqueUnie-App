import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolClassService } from '../../service/school-class.service';
import { SchoolClassDto } from '../../models/academic.models';
import { HubHeaderActionService } from '../../service/hub-header-action.service';

@Component({
  selector: 'app-class-hub-shell',
  templateUrl: './class-hub-shell.component.html',
  styleUrls: ['./class-hub-shell.component.scss']
})
export class ClassHubShellComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  hubTitle = '';
  hubSubtitle = '';
  /** Segment d’URL pour ce hub (`evaluations` ou `emploi-du-temps`). */
  hubSegment = '';

  sortedClasses: SchoolClassDto[] = [];
  loadingClasses = true;
  selectedClassId: number | null = null;

  /** Action publiée par la page enfant (ex. « Nouvelle évaluation »). */
  readonly headerAction$ = this.hubHeaderAction.action$;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolClassService: SchoolClassService,
    private readonly snackBar: MatSnackBar,
    private readonly hubHeaderAction: HubHeaderActionService
  ) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data;
    this.hubTitle = (d['classHubTitle'] as string) ?? '';
    this.hubSubtitle = (d['classHubSubtitle'] as string) ?? '';
    this.hubSegment = (d['classHubSegment'] as string) ?? '';

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      )
      .subscribe(() => this.syncSelectionFromRoute());

    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        tap((id) => {
          if (id == null) {
            this.sortedClasses = [];
            this.selectedClassId = null;
            this.loadingClasses = false;
            return;
          }
          this.loadingClasses = true;
        }),
        switchMap((schoolId) => {
          if (schoolId == null) {
            return of<SchoolClassDto[]>([]);
          }
          return this.schoolClassService.listForActiveSchoolYear(schoolId).pipe(
            catchError(() => {
              this.snackBar.open('Impossible de charger les classes.', 'Fermer', { duration: 5000 });
              return of<SchoolClassDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.loadingClasses = false;
        this.sortedClasses = this.sortClasses(list);
        this.redirectOrValidateClass();
        this.syncSelectionFromRoute();
      });
  }

  ngOnDestroy(): void {
    this.hubHeaderAction.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClassTabClick(clazz: SchoolClassDto): void {
    if (!this.hubSegment || clazz.id == null) {
      return;
    }
    void this.router.navigate(['/', this.hubSegment, clazz.id]);
  }

  isTabActive(clazz: SchoolClassDto): boolean {
    return this.selectedClassId != null && clazz.id === this.selectedClassId;
  }

  /** Évite d’activer le router-outlet tant que l’URL ne correspond pas à une classe chargée. */
  get selectionReady(): boolean {
    return (
      !this.loadingClasses &&
      this.sortedClasses.length > 0 &&
      this.selectedClassId != null &&
      this.sortedClasses.some((c) => c.id === this.selectedClassId)
    );
  }

  private syncSelectionFromRoute(): void {
    const raw = this.route.firstChild?.snapshot.paramMap.get('classId');
    if (raw == null || raw === '') {
      this.selectedClassId = null;
      return;
    }
    const n = Number(raw);
    this.selectedClassId = Number.isFinite(n) && n > 0 ? n : null;
  }

  /**
   * Sans `:classId` dans l’URL : redirection vers la première classe.
   * `:classId` inconnu : correction vers une classe valide.
   */
  private redirectOrValidateClass(): void {
    if (!this.hubSegment) {
      return;
    }
    const child = this.route.firstChild;
    const raw = child?.snapshot.paramMap.get('classId');

    if (!this.sortedClasses.length) {
      return;
    }

    const firstId = this.sortedClasses[0].id;

    if (!raw || raw === '') {
      void this.router.navigate(['/', this.hubSegment, firstId], { replaceUrl: true });
      return;
    }

    const id = Number(raw);
    const ok = Number.isFinite(id) && this.sortedClasses.some((c) => c.id === id);
    if (!ok) {
      void this.router.navigate(['/', this.hubSegment, firstId], { replaceUrl: true });
    }
  }

  private sortClasses(list: SchoolClassDto[]): SchoolClassDto[] {
    const orderByGroupCode: Record<string, number> = { MAT: 1, PRI: 2, COL: 3, LYC: 4 };
    return (list ?? [])
      .slice()
      .sort((a, b) => {
        const ag = a.level?.group?.code ?? '_';
        const bg = b.level?.group?.code ?? '_';
        const ao = orderByGroupCode[ag] ?? Number.MAX_SAFE_INTEGER;
        const bo = orderByGroupCode[bg] ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) {
          return ao - bo;
        }
        const al = a.level?.id ?? 0;
        const bl = b.level?.id ?? 0;
        if (al !== bl) {
          return al - bl;
        }
        return (a.id ?? 0) - (b.id ?? 0);
      });
  }
}
