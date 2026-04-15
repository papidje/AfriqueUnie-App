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
    name: ['', [Validators.required, Validators.maxLength(50)]]
  });

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
              return this.schoolClassService.listForActiveSchoolYear(id).pipe(
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
        this.classes = ctx.classes;
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
    return Array.from(byCode.values()).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'fr'));
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
          return this.schoolClassService.listForActiveSchoolYear(id).pipe(
            catchError(() => {
              this.snackBar.open('Impossible de recharger les classes.', 'Fermer', { duration: 5000 });
              return of<SchoolClassDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.classes = list;
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
            level: { id: levelId }
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
}
