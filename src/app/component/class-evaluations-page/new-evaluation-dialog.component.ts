import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  EVALUATION_TYPE_OPTIONS,
  EvaluationType,
  GradingPeriodSummary
} from '../../models/evaluation.models';
import { ClassSubjectRow } from '../../models/subject.models';
import { ClassSubjectService } from '../../service/class-subject.service';
import { EvaluationApiService } from '../../service/evaluation-api.service';

export interface NewEvaluationDialogData {
  classId: number;
}

@Component({
  selector: 'app-new-evaluation-dialog',
  templateUrl: './new-evaluation-dialog.component.html',
  styleUrls: ['./new-evaluation-dialog.component.scss']
})
export class NewEvaluationDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly typeOptions = EVALUATION_TYPE_OPTIONS;

  loading = true;
  saving = false;
  periods: GradingPeriodSummary[] = [];
  form: FormGroup;

  constructor(
    public readonly dialogRef: MatDialogRef<NewEvaluationDialogComponent, { created: true } | null>,
    private readonly fb: FormBuilder,
    private readonly evalApi: EvaluationApiService,
    private readonly classSubjectService: ClassSubjectService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public readonly data: NewEvaluationDialogData
  ) {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group(
      {
        classSubjectId: [null, Validators.required],
        gradingPeriodId: [null, Validators.required],
        title: ['', [Validators.required, Validators.maxLength(200)]],
        type: ['INTERROGATION' as EvaluationType, Validators.required],
        examDate: [today, Validators.required],
        startTime: ['08:00', Validators.required],
        endTime: ['09:00', Validators.required],
        maxScore: [20, [Validators.required, Validators.min(0.01), Validators.max(10000)]]
      },
      { validators: [NewEvaluationDialogComponent.endAfterStart] }
    );
  }

  private static endAfterStart(group: AbstractControl): ValidationErrors | null {
    const g = group as FormGroup;
    const date = g.get('examDate')?.value as string | undefined;
    const st = g.get('startTime')?.value as string | undefined;
    const en = g.get('endTime')?.value as string | undefined;
    if (!date || !st || !en) {
      return null;
    }
    const a = combineDateAndTimeForCompare(date, st);
    const b = combineDateAndTimeForCompare(date, en);
    if (a == null || b == null) {
      return null;
    }
    return b > a ? null : { endBeforeStart: true };
  }

  ngOnInit(): void {
    forkJoin({
      periods: this.evalApi.listGradingPeriods(this.data.classId),
      subjects: this.classSubjectService.listForClass(this.data.classId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ periods, subjects }) => {
          this.periods = periods;
          this.subjects = subjects;
          this.loading = false;
          if (subjects.length === 1) {
            this.form.patchValue({ classSubjectId: subjects[0].id });
          }
          if (periods.length === 1) {
            this.form.patchValue({ gradingPeriodId: periods[0].id });
          }
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Chargement impossible.', 'Fermer', { duration: 5000 });
        }
      });
  }

  subjects: ClassSubjectRow[] = [];

  /** Coefficient matière/classe (même valeur que sur « Matières de la classe ») — utilisé pour les moyennes. */
  get selectedSubjectCoefficient(): number | null {
    const id = this.form.get('classSubjectId')?.value as number | null;
    if (id == null) {
      return null;
    }
    return this.subjects.find((s) => s.id === id)?.coefficient ?? null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (this.form.hasError('endBeforeStart')) {
      this.snackBar.open('L’heure de fin doit être après l’heure de début.', 'Fermer', { duration: 5000 });
      return;
    }
    const d = v.examDate as string;
    const startDate = toLocalDateTimeIso(d, v.startTime as string);
    const endDate = toLocalDateTimeIso(d, v.endTime as string);
    this.saving = true;
    this.evalApi
      .create(this.data.classId, {
        classSubjectId: v.classSubjectId,
        gradingPeriodId: v.gradingPeriodId,
        title: (v.title as string).trim(),
        description: null,
        type: v.type,
        maxScore: Number(v.maxScore),
        startDate,
        endDate
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.dialogRef.close({ created: true });
        },
        error: (err) => {
          this.saving = false;
          const msg = err?.error?.message || 'Création impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}

function toLocalDateTimeIso(dateYmd: string, timeHm: string): string {
  const t = timeHm.trim();
  const parts = t.split(':');
  const hh = String(Math.min(23, Math.max(0, Number(parts[0]) || 0))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, Number(parts[1] ?? 0) || 0))).padStart(2, '0');
  const ss = parts[2] != null ? String(Math.min(59, Math.max(0, Number(parts[2]) || 0))).padStart(2, '0') : '00';
  return `${dateYmd}T${hh}:${mm}:${ss}`;
}

function combineDateAndTimeForCompare(dateYmd: string, timeHm: string): number | null {
  const iso = toLocalDateTimeIso(dateYmd, timeHm);
  const t = new Date(iso);
  return isNaN(t.getTime()) ? null : t.getTime();
}
