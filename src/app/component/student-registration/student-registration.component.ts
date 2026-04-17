import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolYearService } from '../../service/school-year.service';
import { SchoolClassService } from '../../service/school-class.service';
import { FeeStructureService } from '../../service/fee-structure.service';
import { ParentApiService } from '../../service/parent-api.service';
import { StudentRegistrationService } from '../../service/student-registration.service';
import { SchoolClassDto, SchoolYearDto } from '../../models/academic.models';
import { FeeStructureDto } from '../../models/fee-structure.models';
import { PrintReceiptDialogComponent } from './print-receipt-dialog/print-receipt-dialog.component';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type Civility = 'MONSIEUR' | 'MADAME';

@Component({
  selector: 'app-student-registration',
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.scss']
})
export class StudentRegistrationComponent implements OnInit, OnDestroy {
  loading = false;
  submitting = false;
  private readonly destroy$ = new Subject<void>();

  schoolId: number | null = null;
  schoolName: string | null = null;
  activeYear: SchoolYearDto | null = null;

  classes: SchoolClassDto[] = [];
  feeStructures: FeeStructureDto[] = [];

  readonly stepStudent = this.fb.group({
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    birthDate: ['', Validators.required],
    civility: ['MONSIEUR' as Civility, Validators.required],
    classId: [null as number | null, Validators.required]
  });

  readonly stepParents = this.fb.group({
    fatherLastName: ['', Validators.required],
    fatherFirstName: ['', Validators.required],
    fatherPhone: ['', Validators.required],
    fatherEmail: [''],
    fatherProfession: [''],
    fatherAddress: [''],

    motherLastName: ['', Validators.required],
    motherFirstName: ['', Validators.required],
    motherPhone: ['', Validators.required],
    motherEmail: [''],
    motherProfession: [''],
    motherAddress: [''],
  });

  readonly stepEmergency = this.fb.group({
    emergencyContactName: ['', Validators.required],
    emergencyContactPhone: ['', Validators.required]
  });

  readonly stepPayment = this.fb.group({
    amountPaid: [0, [Validators.required, Validators.min(0)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly schoolClassService: SchoolClassService,
    private readonly feeStructureService: FeeStructureService,
    private readonly parentApi: ParentApiService,
    private readonly registrationService: StudentRegistrationService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.schoolId = this.activeSchool.getActiveSchoolId();
    if (!this.schoolId) {
      return;
    }
    this.activeSchool.headerVm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      if (vm.selectedId == null) {
        this.schoolName = null;
        return;
      }
      const selected = (vm.schools ?? []).find((s: any) => s.id === vm.selectedId);
      this.schoolName = selected?.name ?? null;
    });
    this.reloadContext();

    this.stepStudent.controls.classId.valueChanges.subscribe(() => {
      const expected = this.expectedRegistrationFee;
      if (expected != null && (this.stepPayment.controls.amountPaid.value ?? 0) === 0) {
        this.stepPayment.controls.amountPaid.setValue(expected);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedClass(): SchoolClassDto | null {
    const id = this.stepStudent.controls.classId.value;
    if (!id) return null;
    return this.classes.find((c) => c.id === id) ?? null;
  }

  get expectedRegistrationFee(): number | null {
    const clazz = this.selectedClass;
    const year = this.activeYear;
    const levelId = clazz?.level?.id;
    const levelCode = clazz?.level?.code;
    if (!year?.id || !levelId) {
      // Fallback : si level.id n’est pas disponible, on tente via le code.
      if (!year?.id || !levelCode) {
        return null;
      }
    }
    const fs =
      this.feeStructures.find((s) => s.schoolYearId === year.id && levelId != null && s.classLevelId === levelId) ??
      this.feeStructures.find((s) => s.schoolYearId === year.id && levelCode != null && s.classLevelCode === levelCode) ??
      null;
    return fs ? (fs.registrationFee ?? 0) : null;
  }

  get expectedCurrency(): string {
    const clazz = this.selectedClass;
    const year = this.activeYear;
    const levelId = clazz?.level?.id;
    const levelCode = clazz?.level?.code;
    if (!year?.id || !levelId) {
      // Fallback via code
      if (year?.id && levelCode) {
        const fsByCode = this.feeStructures.find((s) => s.schoolYearId === year.id && s.classLevelCode === levelCode) ?? null;
        return fsByCode?.currency || 'GNF';
      }
      return 'GNF';
    }
    const fs =
      this.feeStructures.find((s) => s.schoolYearId === year.id && s.classLevelId === levelId) ??
      this.feeStructures.find((s) => s.schoolYearId === year.id && s.classLevelCode === levelCode) ??
      null;
    return fs?.currency || 'GNF';
  }

  money(value: number | null | undefined): string {
    if (value == null) return '--';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.expectedCurrency,
      maximumFractionDigits: 0
    }).format(value);
  }

  lookupFather(): void {
    const phone = this.stepParents.controls.fatherPhone.value || '';
    this.parentApi.findByPhone(phone).subscribe({
      next: (p) => {
        if (!p) return;
        this.stepParents.patchValue({
          fatherLastName: p.lastName,
          fatherFirstName: p.firstName,
          fatherEmail: p.email || '',
          fatherProfession: p.profession || '',
          fatherAddress: p.address || ''
        });
      }
    });
  }

  lookupMother(): void {
    const phone = this.stepParents.controls.motherPhone.value || '';
    this.parentApi.findByPhone(phone).subscribe({
      next: (p) => {
        if (!p) return;
        this.stepParents.patchValue({
          motherLastName: p.lastName,
          motherFirstName: p.firstName,
          motherEmail: p.email || '',
          motherProfession: p.profession || '',
          motherAddress: p.address || ''
        });
      }
    });
  }

  submit(): void {
    if (!this.schoolId) return;
    if (this.stepStudent.invalid || this.stepParents.invalid || this.stepEmergency.invalid || this.stepPayment.invalid) {
      this.stepStudent.markAllAsTouched();
      this.stepParents.markAllAsTouched();
      this.stepEmergency.markAllAsTouched();
      this.stepPayment.markAllAsTouched();
      return;
    }
    const s = this.stepStudent.getRawValue();
    const p = this.stepParents.getRawValue();
    const e = this.stepEmergency.getRawValue();
    const pay = this.stepPayment.getRawValue();

    const selectedClassLabel = this.selectedClass
      ? this.selectedClass.name + (this.selectedClass.level ? ` — ${this.selectedClass.level.code} ${this.selectedClass.level.name}` : '')
      : '—';

    const studentName = `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim();
    const amountPaid = Number(pay.amountPaid ?? 0);
    const expected = this.expectedRegistrationFee;
    const remaining = expected != null ? Math.max(expected - amountPaid, 0) : 0;
    const currency = this.expectedCurrency;
    const dateLabel = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date());

    this.submitting = true;
    this.registrationService
      .registerStudent({
        classId: s.classId!,
        currency: this.expectedCurrency,
        amountPaid: Number(pay.amountPaid ?? 0),
        student: {
          civility: s.civility as Civility,
          firstName: (s.firstName || '').trim(),
          lastName: (s.lastName || '').trim(),
          birthDate: s.birthDate!,
          emergencyContactName: (e.emergencyContactName || '').trim(),
          emergencyContactPhone: (e.emergencyContactPhone || '').trim()
        },
        father: {
          lastName: (p.fatherLastName || '').trim(),
          firstName: (p.fatherFirstName || '').trim(),
          phone: (p.fatherPhone || '').trim(),
          email: (p.fatherEmail || '').trim() || null,
          profession: (p.fatherProfession || '').trim() || null,
          address: (p.fatherAddress || '').trim() || null
        },
        mother: {
          lastName: (p.motherLastName || '').trim(),
          firstName: (p.motherFirstName || '').trim(),
          phone: (p.motherPhone || '').trim(),
          email: (p.motherEmail || '').trim() || null,
          profession: (p.motherProfession || '').trim() || null,
          address: (p.motherAddress || '').trim() || null
        }
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.snackBar.open('Élève inscrit avec succès.', 'Fermer', { duration: 3500 });

          const dialogRef = this.dialog.open(PrintReceiptDialogComponent, {
            width: '640px',
            disableClose: false,
            data: {
              schoolName: this.schoolName ?? '—',
              studentName: studentName || '—',
              classLabel: selectedClassLabel,
              dateLabel,
              currency,
              amountPaid,
              remainingToPay: remaining
            }
          });

          dialogRef.afterClosed().subscribe(() => {
            void this.router.navigate(['/students'], {
              queryParams: { classId: s.classId }
            });
          });
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message || 'Inscription impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
  }

  private reloadContext(): void {
    if (!this.schoolId) return;
    this.loading = true;
    this.schoolYearService.getActiveForSchool(this.schoolId).subscribe({
      next: (year) => {
        this.activeYear = year;
        if (!year) {
          this.loading = false;
          this.classes = [];
          this.feeStructures = [];
          return;
        }
        this.schoolClassService.listForActiveSchoolYear(this.schoolId!).subscribe({
          next: (classes) => {
            this.classes = classes || [];
            this.feeStructureService.listBySchoolYear(year.id).subscribe({
              next: (fees) => {
                this.feeStructures = fees || [];
                this.loading = false;
              },
              error: () => {
                this.loading = false;
                this.snackBar.open('Impossible de charger les frais.', 'Fermer', { duration: 5000 });
              }
            });
          },
          error: () => {
            this.loading = false;
            this.snackBar.open('Impossible de charger les classes.', 'Fermer', { duration: 5000 });
          }
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open("Impossible de charger l'année active.", 'Fermer', { duration: 5000 });
      }
    });
  }
}

