import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolYearService } from '../../service/school-year.service';
import { SchoolClassService } from '../../service/school-class.service';
import { ParentApiService } from '../../service/parent-api.service';
import { StudentRegistrationService } from '../../service/student-registration.service';
import { SchoolClassDto, SchoolYearDto } from '../../models/academic.models';
import { StudentRegistrationResponse } from '../../models/student-registration.models';

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

  /** Après inscription réussie (sans paiement à cette étape). */
  registrationComplete = false;
  registeredStudentId: number | null = null;
  registeredStudentSummary = '';

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
    motherAddress: ['']
  });

  readonly stepEmergency = this.fb.group({
    emergencyContactName: ['', Validators.required],
    emergencyContactPhone: ['', Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly schoolClassService: SchoolClassService,
    private readonly parentApi: ParentApiService,
    private readonly registrationService: StudentRegistrationService,
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
      const selected = (vm.schools ?? []).find((s: { id: number }) => s.id === vm.selectedId);
      this.schoolName = selected?.name ?? null;
    });
    this.reloadContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedClass(): SchoolClassDto | null {
    const id = this.stepStudent.controls.classId.value;
    if (!id) {
      return null;
    }
    return this.classes.find((c) => c.id === id) ?? null;
  }

  lookupFather(): void {
    const phone = this.stepParents.controls.fatherPhone.value || '';
    this.parentApi.findByPhone(phone).subscribe({
      next: (p) => {
        if (!p) {
          return;
        }
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
        if (!p) {
          return;
        }
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
    if (!this.schoolId) {
      return;
    }
    if (this.stepStudent.invalid || this.stepParents.invalid || this.stepEmergency.invalid) {
      this.stepStudent.markAllAsTouched();
      this.stepParents.markAllAsTouched();
      this.stepEmergency.markAllAsTouched();
      return;
    }
    const s = this.stepStudent.getRawValue();
    const p = this.stepParents.getRawValue();
    const e = this.stepEmergency.getRawValue();

    const clazz = this.selectedClass;
    const classLabel = clazz
      ? `${clazz.name}${clazz.level ? ` — ${clazz.level.code} ${clazz.level.name}` : ''}`
      : '—';
    const studentName = `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim();

    this.submitting = true;
    this.registrationService
      .registerStudent({
        classId: s.classId!,
        amountPaid: 0,
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
        next: (resp: StudentRegistrationResponse) => {
          this.submitting = false;
          const id = resp?.id;
          if (id == null || !Number.isFinite(Number(id))) {
            this.snackBar.open('Inscription enregistrée mais identifiant élève manquant.', 'Fermer', { duration: 6000 });
            return;
          }
          this.registeredStudentId = Number(id);
          this.registeredStudentSummary = `${studentName || 'Élève'} — ${classLabel}`;
          this.registrationComplete = true;
          this.snackBar.open('Inscription validée.', 'Fermer', { duration: 3500 });
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message || 'Inscription impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
  }

  goToEncaissement(): void {
    if (this.registeredStudentId == null) {
      return;
    }
    void this.router.navigate(['/finance', 'payment', this.registeredStudentId]);
  }

  startAnotherRegistration(): void {
    this.registrationComplete = false;
    this.registeredStudentId = null;
    this.registeredStudentSummary = '';
    this.stepStudent.reset({
      lastName: '',
      firstName: '',
      birthDate: '',
      civility: 'MONSIEUR',
      classId: null
    });
    this.stepParents.reset({
      fatherLastName: '',
      fatherFirstName: '',
      fatherPhone: '',
      fatherEmail: '',
      fatherProfession: '',
      fatherAddress: '',
      motherLastName: '',
      motherFirstName: '',
      motherPhone: '',
      motherEmail: '',
      motherProfession: '',
      motherAddress: ''
    });
    this.stepEmergency.reset({
      emergencyContactName: '',
      emergencyContactPhone: ''
    });
  }

  private reloadContext(): void {
    if (!this.schoolId) {
      return;
    }
    this.loading = true;
    this.schoolYearService.getActiveForSchool(this.schoolId).subscribe({
      next: (year) => {
        this.activeYear = year;
        if (!year) {
          this.loading = false;
          this.classes = [];
          return;
        }
        this.schoolClassService.listForActiveSchoolYear(this.schoolId!).subscribe({
          next: (classes) => {
            this.classes = classes || [];
            this.loading = false;
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
