import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolYearService } from '../../service/school-year.service';

function dateOrderValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(start) < new Date(end) ? null : { dateOrder: true };
}

@Component({
  selector: 'app-school-year-create-page',
  templateUrl: './school-year-create-page.component.html',
  styleUrls: ['./school-year-create-page.component.scss']
})
export class SchoolYearCreatePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private lastResolvedSchoolId: number | null = null;

  schoolId: number | null = null;
  returnUrl = '/dashboard';
  submitting = false;

  readonly form = this.fb.group(
    {
      label: ['', [Validators.required, Validators.maxLength(20)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      active: [true]
    },
    { validators: dateOrderValidator }
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const rawSchool = params.get('schoolId');
      const parsed = rawSchool != null ? Number(rawSchool) : NaN;
      const fromQuery = Number.isFinite(parsed) ? parsed : null;
      this.returnUrl = params.get('returnUrl')?.trim() || '/dashboard';
      if (this.returnUrl.startsWith('http')) {
        this.returnUrl = '/dashboard';
      }
      const nextId = fromQuery ?? this.activeSchool.getActiveSchoolId();
      const changed = nextId !== this.lastResolvedSchoolId;
      this.schoolId = nextId;
      this.lastResolvedSchoolId = nextId;
      if (changed && nextId != null) {
        this.applyDefaultDatesAndLabel();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Propose libellé + dates type septembre → juin (France / Afrique francophone). */
  applyDefaultDatesAndLabel(): void {
    const now = new Date();
    const y = now.getFullYear();
    const month = now.getMonth();
    const startYear = month >= 8 ? y : y - 1;
    const start = `${startYear}-09-01`;
    const end = `${startYear + 1}-06-30`;
    const label = `${startYear}-${startYear + 1}`;
    this.form.patchValue({ startDate: start, endDate: end, label });
  }

  suggestLabelFromDates(): void {
    const s = this.form.value.startDate;
    const e = this.form.value.endDate;
    if (!s || !e) {
      return;
    }
    const ys = new Date(s).getFullYear();
    const ye = new Date(e).getFullYear();
    const label = ys === ye ? `${ys}-${ys + 1}` : `${ys}-${ye}`;
    this.form.patchValue({ label });
  }

  cancel(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }

  get labelCharCount(): number {
    const v = this.form.get('label')?.value;
    return typeof v === 'string' ? v.length : 0;
  }

  submit(): void {
    if (this.schoolId == null) {
      this.snackBar.open('Établissement inconnu : sélectionnez une école dans l’en-tête.', 'Fermer', {
        duration: 5000
      });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting = true;
    this.schoolYearService
      .create({
        school: { id: this.schoolId },
        label: (v.label ?? '').trim(),
        startDate: v.startDate!,
        endDate: v.endDate!,
        active: !!v.active
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.snackBar.open('Année scolaire enregistrée.', 'Fermer', { duration: 3500 });
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (err) => {
          this.submitting = false;
          const msg =
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Enregistrement impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
  }
}
