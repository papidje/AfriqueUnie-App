import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { ClassLevelService } from '../../service/class-level.service';
import { SchoolClassService } from '../../service/school-class.service';
import { SchoolYearService } from '../../service/school-year.service';
import { ClassLevel, SchoolClassDto, SchoolYearDto } from '../../models/academic.models';

export interface ClassLevelGroupOption {
  groupCode: string;
  groupLabel: string;
  levels: ClassLevel[];
}

interface SchoolClassesContext {
  schoolId: number | null;
  year: SchoolYearDto | null;
  classes: SchoolClassDto[];
}

@Component({
  selector: 'app-school-classes-page',
  templateUrl: './school-classes-page.component.html',
  styleUrls: ['./school-classes-page.component.scss']
})
export class SchoolClassesPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private redirectedForMissingYear = false;

  classes: SchoolClassDto[] = [];
  levelGroups: ClassLevelGroupOption[] = [];
  activeYear: SchoolYearDto | null = null;
  schoolId: number | null = null;
  loadingLevels = true;
  loadingClasses = false;
  saving = false;

  readonly form = this.fb.group({
    levelId: [null as number | null, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(50)]],
    capacity: [40, [Validators.required, Validators.min(1), Validators.max(200)]]
  });

  readonly overviewColumns = ['name', 'level', 'enrollment', 'subjectCount', 'actions'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly activeSchool: ActiveSchoolService,
    private readonly classLevelService: ClassLevelService,
    private readonly schoolYearService: SchoolYearService,
    private readonly schoolClassService: SchoolClassService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.classLevelService.getAll().subscribe({
      next: (levels) => {
        this.levelGroups = this.buildLevelGroups(levels);
        this.loadingLevels = false;
      },
      error: () => {
        this.loadingLevels = false;
        this.snackBar.open('Impossible de charger les niveaux (référentiel).', 'Fermer', { duration: 5000 });
      }
    });

    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        tap((id) => {
          this.redirectedForMissingYear = false;
          this.schoolId = id;
          if (id != null) {
            this.loadingClasses = true;
          } else {
            this.loadingClasses = false;
            this.activeYear = null;
            this.classes = [];
          }
        }),
        switchMap((id) => {
          if (id == null) {
            return of<SchoolClassesContext>({ schoolId: null, year: null, classes: [] });
          }
          return this.schoolYearService.getActiveForSchool(id).pipe(
            switchMap((year) => {
              if (!year) {
                return of<SchoolClassesContext>({ schoolId: id, year: null, classes: [] });
              }
              return this.schoolClassService.listOverviewForActiveSchoolYear(id).pipe(
                map((classes) => ({ schoolId: id, year, classes })),
                catchError(() => {
                  this.snackBar.open('Impossible de charger les classes.', 'Fermer', { duration: 5000 });
                  return of<SchoolClassesContext>({ schoolId: id, year, classes: [] });
                })
              );
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((ctx) => {
        this.schoolId = ctx.schoolId;
        this.activeYear = ctx.year;
        this.classes = this.sortClasses(ctx.classes);
        this.loadingClasses = false;
        if (ctx.schoolId != null && ctx.year == null && !this.redirectedForMissingYear) {
          this.redirectedForMissingYear = true;
          void this.router.navigate(['/annee-scolaire/nouvelle'], {
            queryParams: { schoolId: ctx.schoolId, returnUrl: '/classes' }
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildLevelGroups(levels: ClassLevel[]): ClassLevelGroupOption[] {
    const byCode = new Map<string, { groupLabel: string; levels: ClassLevel[] }>();
    for (const level of levels) {
      const code = level.group?.code ?? '_';
      const groupLabel = level.group?.name ?? 'Autres';
      if (!byCode.has(code)) {
        byCode.set(code, { groupLabel, levels: [] });
      }
      byCode.get(code)!.levels.push(level);
    }

    // Ordre métier attendu : Maternelle → Primaire → Collège → Lycée
    const orderByGroupCode: Record<string, number> = {
      MAT: 1,
      PRI: 2,
      COL: 3,
      LYC: 4
    };

    return Array.from(byCode.entries())
      .map(([groupCode, value]) => ({
        groupCode,
        groupLabel: value.groupLabel,
        levels: value.levels.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      }))
      .sort((a, b) => {
        const ao = orderByGroupCode[a.groupCode] ?? Number.MAX_SAFE_INTEGER;
        const bo = orderByGroupCode[b.groupCode] ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.groupLabel.localeCompare(b.groupLabel, 'fr');
      });
  }

  /** Recharge la liste après création (même établissement). */
  refreshList(): void {
    const id = this.schoolId;
    if (id == null) {
      return;
    }
    this.loadingClasses = true;
    this.schoolYearService
      .getActiveForSchool(id)
      .pipe(
        switchMap((year) => {
          this.activeYear = year;
          if (!year) {
            return of<SchoolClassDto[]>([]);
          }
          return this.schoolClassService.listOverviewForActiveSchoolYear(id).pipe(
            catchError(() => {
              this.snackBar.open('Impossible de recharger les classes.', 'Fermer', { duration: 5000 });
              return of<SchoolClassDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.classes = this.sortClasses(list);
        this.loadingClasses = false;
      });
  }

  submitOpenClass(): void {
    if (this.form.invalid || this.schoolId == null) {
      this.form.markAllAsTouched();
      return;
    }
    const name = (this.form.value.name ?? '').trim();
    const levelId = this.form.value.levelId;
    const capacity = Number(this.form.value.capacity);
    if (!name || levelId == null) {
      return;
    }

    this.saving = true;
    this.schoolYearService.getActiveForSchool(this.schoolId).subscribe({
      next: (year) => {
        if (!year) {
          this.saving = false;
          this.snackBar.open('Aucune année active — configuration requise.', 'Fermer', { duration: 4000 });
          if (this.schoolId != null) {
            void this.router.navigate(['/annee-scolaire/nouvelle'], {
              queryParams: { schoolId: this.schoolId, returnUrl: '/classes' }
            });
          }
          return;
        }
        this.schoolClassService
          .create({
            name,
            year: { id: year.id },
            level: { id: levelId },
            capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 40
          })
          .subscribe({
            next: () => {
              this.saving = false;
              this.snackBar.open('Classe ouverte avec succès.', 'Fermer', { duration: 3500 });
              this.form.patchValue({ name: '' });
              this.refreshList();
            },
            error: () => {
              this.saving = false;
              this.snackBar.open('Création impossible (nom ou niveau déjà utilisé ?).', 'Fermer', {
                duration: 5000
              });
            }
          });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Erreur lors de la lecture de l’année active.', 'Fermer', { duration: 5000 });
      }
    });
  }

  canUseForm(): boolean {
    return this.schoolId != null && this.activeYear != null && !this.loadingLevels;
  }

  private readonly enrollmentPieCircumference = 2 * Math.PI * 14;

  /** Taux de remplissage (0–1) pour le graphique inscription / capacité. */
  enrollmentRatio(row: SchoolClassDto): number {
    const cap = row.capacity ?? 40;
    if (cap <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, (row.enrolledStudentCount ?? 0) / cap));
  }

  enrollmentDash(row: SchoolClassDto): string {
    const len = this.enrollmentRatio(row) * this.enrollmentPieCircumference;
    return `${len} ${this.enrollmentPieCircumference}`;
  }

  /** Vert clair → vert foncé selon le taux de remplissage. */
  enrollmentStrokeColor(row: SchoolClassDto): string {
    return this.greenForFillRatio(this.enrollmentRatio(row));
  }

  enrollmentTooltip(row: SchoolClassDto): string {
    const n = row.enrolledStudentCount ?? 0;
    const cap = row.capacity ?? 40;
    const pct = Math.round(this.enrollmentRatio(row) * 100);
    return `${n} / ${cap} inscrits — ${pct} % de remplissage`;
  }

  private greenForFillRatio(t: number): string {
    const from = { r: 200, g: 230, b: 200 };
    const to = { r: 27, g: 94, b: 32 };
    const l = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${l(from.r, to.r)}, ${l(from.g, to.g)}, ${l(from.b, to.b)})`;
  }

  private sortClasses(list: SchoolClassDto[]): SchoolClassDto[] {
    return (list ?? [])
      .slice()
      .sort((a, b) => {
        const ag = a.level?.group?.id ?? Number.MAX_SAFE_INTEGER;
        const bg = b.level?.group?.id ?? Number.MAX_SAFE_INTEGER;
        if (ag !== bg) return ag - bg;

        const al = a.level?.id ?? Number.MAX_SAFE_INTEGER;
        const bl = b.level?.id ?? Number.MAX_SAFE_INTEGER;
        if (al !== bl) return al - bl;

        return (a.id ?? 0) - (b.id ?? 0);
      });
  }
}
