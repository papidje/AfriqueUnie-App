import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { SchoolClassDto, SchoolYearDto } from '../../../models/academic.models';
import { ActiveSchoolService } from '../../../service/active-school.service';
import { SchoolClassService } from '../../../service/school-class.service';
import { SchoolYearService } from '../../../service/school-year.service';

export type ClassWorkspaceSegment = 'planning' | 'matieres' | 'periodes';

interface SchoolContext {
  schoolId: number | null;
  year: SchoolYearDto | null;
  classes: SchoolClassDto[];
}

@Component({
  selector: 'app-class-workspace-context-bar',
  templateUrl: './class-workspace-context-bar.component.html',
  styleUrls: ['./class-workspace-context-bar.component.scss']
})
export class ClassWorkspaceContextBarComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /** Page courante : segment d’URL après l’identifiant de classe. */
  @Input() workspaceSegment: ClassWorkspaceSegment = 'planning';

  /** Libellé optionnel (API planning / matières) si la classe n’est pas dans la liste. */
  @Input() classLabelHint: string | null = null;

  classId: number | null = null;
  classes: SchoolClassDto[] = [];
  schoolId: number | null = null;
  activeYear: SchoolYearDto | null = null;
  loadingContext = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly schoolClassService: SchoolClassService
  ) {}

  get selectedClass(): SchoolClassDto | null {
    if (this.classId == null) {
      return null;
    }
    return this.classes.find((c) => c.id === this.classId) ?? null;
  }

  get activeClassLabel(): string {
    const c = this.selectedClass;
    if (c) {
      const lv = c.level?.name;
      return lv ? `${c.name} — ${lv}` : c.name;
    }
    const hint = this.classLabelHint?.trim();
    if (hint) {
      return hint;
    }
    return this.classId != null ? `Classe #${this.classId}` : '';
  }

  ngOnInit(): void {
    const schoolContext$ = this.activeSchool.activeSchoolId$.pipe(
      distinctUntilChanged(),
      switchMap((sid) => {
        if (sid == null) {
          return of<SchoolContext>({ schoolId: null, year: null, classes: [] });
        }
        return this.schoolYearService.getActiveForSchool(sid).pipe(
          switchMap((year) => {
            if (!year) {
              return of<SchoolContext>({ schoolId: sid, year: null, classes: [] });
            }
            return this.schoolClassService.listForActiveSchoolYear(sid).pipe(
              map((classes) => ({ schoolId: sid, year, classes })),
              catchError(() => of<SchoolContext>({ schoolId: sid, year, classes: [] }))
            );
          })
        );
      })
    );

    combineLatest([
      this.route.paramMap.pipe(
        map((p) => {
          const id = Number(p.get('classId'));
          return Number.isFinite(id) ? id : null;
        })
      ),
      schoolContext$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([routeClassId, ctx]) => {
        this.schoolId = ctx.schoolId;
        this.activeYear = ctx.year;
        this.classes = ctx.classes;
        this.loadingContext = false;

        let targetId = routeClassId;
        if (ctx.schoolId != null && ctx.year != null && ctx.classes.length > 0) {
          const inList = routeClassId != null && ctx.classes.some((c) => c.id === routeClassId);
          if (!inList) {
            const firstId = ctx.classes[0].id;
            if (routeClassId !== firstId) {
              void this.router.navigate(['/classes', firstId, this.workspaceSegment], { replaceUrl: true });
              return;
            }
            targetId = firstId;
          }
        }

        this.classId = targetId;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClassSelected(id: number): void {
    if (id === this.classId) {
      return;
    }
    void this.router.navigate(['/classes', id, this.workspaceSegment]);
  }

  returnUrlForYearSetup(): string {
    if (this.classId != null) {
      return `/classes/${this.classId}/${this.workspaceSegment}`;
    }
    return '/classes';
  }
}
