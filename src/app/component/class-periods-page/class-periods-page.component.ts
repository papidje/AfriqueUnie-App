import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil, finalize, switchMap } from 'rxjs/operators';
import { SchoolClassService } from '../../service/school-class.service';
import { EvaluationApiService } from '../../service/evaluation-api.service';
import { SchoolClassDto, SchoolClassPeriodType } from '../../models/academic.models';
import { GradingPeriodSummary } from '../../models/evaluation.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { AppRoles } from '../../core/app-roles';

interface ClassPeriodsLoad {
  sc: SchoolClassDto | null;
  periods: GradingPeriodSummary[];
  evals: unknown[];
}

@Component({
  selector: 'app-class-periods-page',
  templateUrl: './class-periods-page.component.html',
  styleUrls: ['./class-periods-page.component.scss']
})
export class ClassPeriodsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  classId: number | null = null;
  loading = true;
  savingSchedule = false;
  savingType = false;
  schoolClass: SchoolClassDto | null = null;
  periods: GradingPeriodSummary[] = [];
  hasAnyEvaluation = false;

  readonly displayedColumns: string[] = ['name', 'start', 'end', 'lock'];

  readonly canEditSettings = this.authUtils.hasAnyRole([
    AppRoles.ADMIN_ECOLE,
    AppRoles.DIRECTOR,
    AppRoles.STAFF
  ]);

  readonly typeForm = this.fb.group({
    periodType: this.fb.control<SchoolClassPeriodType>('TRIMESTER', { validators: [Validators.required] })
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly schoolClassService: SchoolClassService,
    private readonly evaluationApi: EvaluationApiService,
    private readonly snackBar: MatSnackBar,
    private readonly authUtils: AuthUtilsService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = Number(params.get('classId'));
          this.classId = Number.isFinite(id) && id > 0 ? id : null;
          if (this.classId == null) {
            this.loading = false;
            return of<ClassPeriodsLoad | null>(null);
          }
          this.loading = true;
          return forkJoin({
            sc: this.schoolClassService.getById(this.classId).pipe(
              catchError(() => of<SchoolClassDto | null>(null))
            ),
            periods: this.evaluationApi.listGradingPeriods(this.classId).pipe(
              catchError(() => of<GradingPeriodSummary[]>([]))
            ),
            evals: this.evaluationApi.listForClass(this.classId).pipe(catchError(() => of([])))
          }).pipe(
            finalize(() => {
              this.loading = false;
            })
          );
        })
      )
      .subscribe((res) => {
        if (res == null) {
          return;
        }
        this.schoolClass = res.sc;
        this.periods = (res.periods ?? []).map((p) => ({
          ...p,
          locked: p.locked === true
        }));
        this.hasAnyEvaluation = (res.evals as unknown[]).length > 0;
        const pt = res.sc?.periodType;
        this.typeForm.patchValue({
          periodType: pt === 'SEMESTER' || pt === 'TRIMESTER' ? pt : 'TRIMESTER'
        });
        this.applyTypeLock();
        if (res.sc == null && this.classId != null) {
          this.snackBar.open('Classe introuvable ou accès refusé.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private applyTypeLock(): void {
    if (!this.canEditSettings) {
      this.typeForm.disable({ emitEvent: false });
      return;
    }
    if (this.hasAnyEvaluation) {
      this.typeForm.disable({ emitEvent: false });
    } else {
      this.typeForm.enable({ emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  periodRowLocked(p: GradingPeriodSummary): boolean {
    return p.locked === true || !this.canEditSettings;
  }

  saveType(): void {
    if (this.classId == null || this.typeForm.disabled || this.typeForm.invalid) {
      return;
    }
    this.savingType = true;
    const periodType = this.typeForm.get('periodType')?.value as SchoolClassPeriodType;
    this.schoolClassService
      .updatePeriodType(this.classId, periodType)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.savingType = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Type de période mis à jour. Les périodes ont été recalculées.', 'Fermer', {
            duration: 5000
          });
          this.reload();
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.message || 'Modification impossible (conflit ou règles non respectées).',
            'Fermer',
            { duration: 6000 }
          )
      });
  }

  saveSchedule(): void {
    if (this.classId == null || !this.canEditSettings) {
      return;
    }
    const body = this.periods.map((p) => ({
      id: p.id,
      name: p.name,
      startDate: this.toYmd(p.startDate),
      endDate: this.toYmd(p.endDate)
    }));
    this.savingSchedule = true;
    this.schoolClassService
      .updateGradingPeriodsSchedule(this.classId, body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.savingSchedule = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Périodes de notation enregistrées.', 'Fermer', { duration: 4000 });
          this.reload();
        },
        error: (err) =>
          this.snackBar.open(err?.error?.message || 'Enregistrement impossible.', 'Fermer', { duration: 7000 })
      });
  }

  onStartChange(p: GradingPeriodSummary, value: string): void {
    p.startDate = value;
  }

  onEndChange(p: GradingPeriodSummary, value: string): void {
    p.endDate = value;
  }

  onNameChange(p: GradingPeriodSummary, value: string): void {
    p.name = value;
  }

  toDateInputValue(iso: string): string {
    if (!iso) {
      return '';
    }
    return iso.length >= 10 ? iso.slice(0, 10) : iso;
  }

  private toYmd(iso: string): string {
    return this.toDateInputValue(iso);
  }

  private reload(): void {
    if (this.classId == null) {
      return;
    }
    this.loading = true;
    forkJoin({
      sc: this.schoolClassService.getById(this.classId).pipe(catchError(() => of(null))),
      periods: this.evaluationApi.listGradingPeriods(this.classId).pipe(
        catchError(() => of<GradingPeriodSummary[]>([]))
      ),
      evals: this.evaluationApi.listForClass(this.classId).pipe(catchError(() => of([])))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((res) => {
        this.schoolClass = res.sc;
        this.periods = (res.periods ?? []).map((p) => ({ ...p, locked: p.locked === true }));
        this.hasAnyEvaluation = (res.evals as unknown[]).length > 0;
        const pt = res.sc?.periodType;
        this.typeForm.patchValue({
          periodType: pt === 'SEMESTER' || pt === 'TRIMESTER' ? pt : 'TRIMESTER'
        });
        this.applyTypeLock();
      });
  }
}
