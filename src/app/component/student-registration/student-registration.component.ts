import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolYearService } from '../../service/school-year.service';
import { SchoolClassService } from '../../service/school-class.service';
import { ParentApiService } from '../../service/parent-api.service';
import { StudentRegistrationService } from '../../service/student-registration.service';
import { StudentApiService } from '../../service/student-api.service';
import { FeeStructureService } from '../../service/fee-structure.service';
import { SchoolClassDto, SchoolYearDto } from '../../models/academic.models';
import { FeeStructureDto } from '../../models/fee-structure.models';
import { sortSchoolClassesByLevel } from '../../core/class-level-group-order';
import { studentBirthDateBounds } from '../../util/date-input-bounds.util';
import {
  FamilyPreviewResponse,
  LegalGuardianRelation,
  StudentRegistrationResponse
} from '../../models/student-registration.models';
import { prepareStudentPhotoFile } from '../../util/student-photo-upload.util';
import { tuitionTotalExpected } from './registration-payment-allocation';
import {
  compactGuineaPhone,
  emailControlError,
  guineaPhoneValidator,
  optionalEmailValidator,
  phoneControlError
} from '../../util/guinea-contact.validators';

type Civility = 'MONSIEUR' | 'MADAME';

@Component({
  selector: 'app-student-registration',
  templateUrl: './student-registration.component.html',
  styleUrls: ['./student-registration.component.scss']
})
export class StudentRegistrationComponent implements OnInit, OnDestroy {
  @ViewChild('galleryInput', { read: ElementRef }) private readonly galleryInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput', { read: ElementRef }) private readonly cameraInputRef?: ElementRef<HTMLInputElement>;

  loading = false;
  submitting = false;
  familyLoading = false;
  showStudentExtras = false;
  private readonly destroy$ = new Subject<void>();

  schoolId: number | null = null;
  schoolName: string | null = null;
  activeYear: SchoolYearDto | null = null;
  classes: SchoolClassDto[] = [];
  private preferredClassId: number | null = null;

  registrationComplete = false;
  registeredStudentId: number | null = null;
  registeredStudentSummary = '';

  pendingPhotoFile: File | null = null;
  photoPreviewUrl: string | null = null;

  familyPreview: FamilyPreviewResponse | null = null;
  feeStructure: FeeStructureDto | null = null;
  feeStructureMissing = false;

  readonly stepStudent = this.fb.group({
    civility: ['MONSIEUR' as Civility, Validators.required],
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    birthDate: ['', Validators.required],
    birthPlace: [''],
    nationality: [''],
    address: [''],
    communicationPhone: ['', guineaPhoneValidator()],
    communicationEmail: ['', optionalEmailValidator()],
    classId: [null as number | null, Validators.required],
    cardNumber: ['']
  });

  readonly stepGuardian = this.fb.group({
    relation: ['PERE' as LegalGuardianRelation, Validators.required],
    civility: ['MONSIEUR' as Civility, Validators.required],
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    phone: ['', guineaPhoneValidator()],
    email: ['', optionalEmailValidator()],
    profession: [''],
    address: ['']
  });

  readonly stepTuition = this.fb.group({
    tuitionPayablePercent: [100, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  readonly phoneControlError = phoneControlError;
  readonly emailControlError = emailControlError;

  readonly studentBirthMin = studentBirthDateBounds().min;
  readonly studentBirthMax = studentBirthDateBounds().max;

  constructor(
    private readonly fb: FormBuilder,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly schoolClassService: SchoolClassService,
    private readonly parentApi: ParentApiService,
    private readonly registrationService: StudentRegistrationService,
    private readonly studentApi: StudentApiService,
    private readonly feeStructureService: FeeStructureService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('classId');
    const fromQuery = Number(raw);
    this.preferredClassId =
      raw != null && raw !== '' && Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : null;

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
    this.stepGuardian.controls.relation.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((rel) => {
      this.syncGuardianCivilityFromRelation(rel);
    });
    this.reloadContext();
  }

  ngOnDestroy(): void {
    this.revokePhotoPreview();
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

  get tuitionPayablePercent(): number {
    const v = Number(this.stepTuition.controls.tuitionPayablePercent.value);
    if (!Number.isFinite(v)) {
      return 100;
    }
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  get tuitionCatalogAmount(): number {
    if (!this.feeStructure) {
      return 0;
    }
    return tuitionTotalExpected(this.feeStructure, 100);
  }

  get tuitionAmountToPay(): number {
    if (!this.feeStructure) {
      return 0;
    }
    return tuitionTotalExpected(this.feeStructure, this.tuitionPayablePercent);
  }

  get guardianDisplayName(): string {
    const g = this.stepGuardian.getRawValue();
    return `${(g.firstName || '').trim()} ${(g.lastName || '').trim()}`.trim() || 'Représentant';
  }

  get guardianRelationLabel(): string {
    switch (this.stepGuardian.controls.relation.value) {
      case 'MERE':
        return 'Mère';
      case 'TUTEUR':
        return 'Tuteur';
      default:
        return 'Père';
    }
  }

  lookupGuardian(): void {
    const phone = compactGuineaPhone(this.stepGuardian.controls.phone.value || '');
    if (!phone) {
      return;
    }
    this.parentApi.findByPhone(phone).subscribe({
      next: (p) => {
        if (!p) {
          return;
        }
        this.stepGuardian.patchValue({
          lastName: p.lastName,
          firstName: p.firstName,
          email: p.email || '',
          profession: p.profession || '',
          address: p.address || ''
        });
      }
    });
  }

  onTuitionPercentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const n = Number(input.value);
    this.stepTuition.patchValue({
      tuitionPayablePercent: Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 100
    });
  }

  loadTuitionStepContext(): void {
    this.loadFamilyPreview();
    this.loadFeeStructureForSelectedClass();
  }

  asMoney(value: number | null | undefined): string {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void (async () => {
      let prepared: File;
      try {
        prepared = await prepareStudentPhotoFile(file);
      } catch {
        prepared = file;
      }
      this.revokePhotoPreview();
      this.pendingPhotoFile = prepared;
      this.photoPreviewUrl = URL.createObjectURL(prepared);
    })();
    this.clearPhotoInputs();
  }

  clearPendingPhoto(): void {
    this.revokePhotoPreview();
    this.pendingPhotoFile = null;
    this.clearPhotoInputs();
  }

  submit(): void {
    if (!this.schoolId) {
      return;
    }
    if (this.stepStudent.invalid || this.stepGuardian.invalid || this.stepTuition.invalid) {
      this.stepStudent.markAllAsTouched();
      this.stepGuardian.markAllAsTouched();
      this.stepTuition.markAllAsTouched();
      return;
    }
    const s = this.stepStudent.getRawValue();
    const g = this.stepGuardian.getRawValue();

    const clazz = this.selectedClass;
    const classLabel = clazz
      ? `${clazz.name}${clazz.level ? ` — ${clazz.level.code} ${clazz.level.name}` : ''}`
      : '—';
    const studentName = `${(s.firstName || '').trim()} ${(s.lastName || '').trim()}`.trim();

    const trimOrNull = (v: string | null | undefined): string | null => {
      const t = (v || '').trim();
      return t ? t : null;
    };

    this.submitting = true;
    this.registrationService
      .registerStudent({
        classId: s.classId!,
        amountPaid: 0,
        tuitionPayablePercent: this.tuitionPayablePercent,
        student: {
          civility: s.civility as Civility,
          firstName: (s.firstName || '').trim(),
          lastName: (s.lastName || '').trim(),
          birthDate: s.birthDate!,
          birthPlace: trimOrNull(s.birthPlace),
          nationality: trimOrNull(s.nationality),
          address: trimOrNull(s.address),
          communicationPhone: trimOrNull(s.communicationPhone) ? compactGuineaPhone(s.communicationPhone!) : null,
          communicationEmail: trimOrNull(s.communicationEmail),
          cardNumber: trimOrNull(s.cardNumber)
        },
        legalGuardian: {
          relation: g.relation as LegalGuardianRelation,
          civility: g.civility as Civility,
          lastName: (g.lastName || '').trim(),
          firstName: (g.firstName || '').trim(),
          phone: trimOrNull(g.phone) ? compactGuineaPhone(g.phone!) : null,
          email: trimOrNull(g.email),
          profession: trimOrNull(g.profession),
          address: trimOrNull(g.address)
        }
      })
      .pipe(
        switchMap((resp: StudentRegistrationResponse) => {
          const id = resp?.id;
          if (id == null || !Number.isFinite(Number(id)) || !this.pendingPhotoFile) {
            return of(resp);
          }
          return this.studentApi.uploadPhoto(Number(id), this.pendingPhotoFile).pipe(
            map(() => resp),
            catchError(() => {
              this.snackBar.open(
                'Inscription enregistrée mais la photo n’a pas pu être envoyée.',
                'Fermer',
                { duration: 6000 }
              );
              return of(resp);
            })
          );
        })
      )
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
          this.clearPendingPhoto();
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

  goToStudentFiche(): void {
    if (this.registeredStudentId == null) {
      return;
    }
    void this.router.navigate(['/students', this.registeredStudentId]);
  }

  startAnotherRegistration(): void {
    this.registrationComplete = false;
    this.registeredStudentId = null;
    this.registeredStudentSummary = '';
    this.familyPreview = null;
    this.feeStructure = null;
    this.feeStructureMissing = false;
    this.showStudentExtras = false;
    this.clearPendingPhoto();
    this.stepStudent.reset({
      civility: 'MONSIEUR',
      lastName: '',
      firstName: '',
      birthDate: '',
      birthPlace: '',
      nationality: '',
      address: '',
      communicationPhone: '',
      communicationEmail: '',
      classId: this.resolvePreferredClassId(),
      cardNumber: ''
    });
    this.stepGuardian.reset({
      relation: 'PERE',
      civility: 'MONSIEUR',
      lastName: '',
      firstName: '',
      phone: '',
      email: '',
      profession: '',
      address: ''
    });
    this.stepTuition.reset({ tuitionPayablePercent: 100 });
  }

  private syncGuardianCivilityFromRelation(rel: LegalGuardianRelation | null): void {
    if (rel === 'MERE') {
      this.stepGuardian.patchValue({ civility: 'MADAME' }, { emitEvent: false });
    } else if (rel === 'PERE') {
      this.stepGuardian.patchValue({ civility: 'MONSIEUR' }, { emitEvent: false });
    }
  }

  private loadFamilyPreview(): void {
    const g = this.stepGuardian.getRawValue();
    const phone = compactGuineaPhone(g.phone || '');
    if (!phone) {
      this.familyPreview = null;
      return;
    }
    const fatherPhone = g.relation === 'PERE' ? phone : null;
    const motherPhone = g.relation === 'MERE' ? phone : null;
    if (!fatherPhone && !motherPhone) {
      // Tuteur : pas de fratrie Parent
      this.familyPreview = null;
      return;
    }
    this.familyLoading = true;
    this.registrationService.previewFamily(fatherPhone, motherPhone).subscribe({
      next: (preview) => {
        this.familyPreview = preview;
        this.familyLoading = false;
      },
      error: () => {
        this.familyLoading = false;
        this.familyPreview = null;
        this.snackBar.open('Impossible de charger la fratrie.', 'Fermer', { duration: 4000 });
      }
    });
  }

  private loadFeeStructureForSelectedClass(): void {
    const clazz = this.selectedClass;
    const yearId = this.activeYear?.id;
    const levelId = clazz?.level?.id;
    if (!yearId || levelId == null) {
      this.feeStructure = null;
      this.feeStructureMissing = true;
      return;
    }
    this.feeStructureService.listBySchoolYear(yearId).subscribe({
      next: (list) => {
        const found = (list || []).find((fs) => fs.classLevelId === levelId) ?? null;
        this.feeStructure = found;
        this.feeStructureMissing = !found;
      },
      error: () => {
        this.feeStructure = null;
        this.feeStructureMissing = true;
      }
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
            this.classes = sortSchoolClassesByLevel(classes || []);
            this.applyPreferredClass();
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

  private resolvePreferredClassId(): number | null {
    if (this.preferredClassId == null) {
      return null;
    }
    return this.classes.some((c) => c.id === this.preferredClassId) ? this.preferredClassId : null;
  }

  private applyPreferredClass(): void {
    const classId = this.resolvePreferredClassId();
    if (classId != null) {
      this.stepStudent.patchValue({ classId });
    }
  }

  private revokePhotoPreview(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = null;
    }
  }

  private clearPhotoInputs(): void {
    const gallery = this.galleryInputRef?.nativeElement;
    const camera = this.cameraInputRef?.nativeElement;
    if (gallery) {
      gallery.value = '';
    }
    if (camera) {
      camera.value = '';
    }
  }
}
