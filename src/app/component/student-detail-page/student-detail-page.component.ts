import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { StudentApiService } from '../../service/student-api.service';
import { FinanceApiService } from '../../service/finance-api.service';
import { StudentDetailDto } from '../../models/student-list.models';
import { PaymentReceiptViewDto, StudentPaymentInfoDto, StudentPaymentLedgerRow } from '../../models/finance.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { AppRoles, ROLES_STUDENT_WRITE } from '../../core/app-roles';
import { ConfirmDialogComponent } from '../../shared/component/confirm-dialog/confirm-dialog.component';
import { PaymentReceiptPrintDialogComponent } from '../../shared/component/payment-receipt-print-dialog/payment-receipt-print-dialog.component';
import { PaymentReceiptPrintData } from '../../shared/component/payment-receipt-print-dialog/payment-receipt-print-dialog.models';
import { API_BASE_URL } from '../../core/api-base';
import { prepareStudentPhotoFile } from '../../util/student-photo-upload.util';

export interface StudentPaymentHistoryGroupRow {
  receiptReference: string | null;
  paymentDate: string;
  schoolYearLabel: string;
  paymentTypeLabel: string;
  paymentMode: string | null;
  amount: number;
  currency: string;
  recordedBy: string | null;
  validatedByUserName: string | null;
}

@Component({
  selector: 'app-student-detail-page',
  templateUrl: './student-detail-page.component.html',
  styleUrls: ['./student-detail-page.component.scss']
})
export class StudentDetailPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @ViewChild('galleryInput', { read: ElementRef }) private readonly galleryInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput', { read: ElementRef }) private readonly cameraInputRef?: ElementRef<HTMLInputElement>;

  loading = true;
  student: StudentDetailDto | null = null;
  paymentInfo: StudentPaymentInfoDto | null = null;
  payments: StudentPaymentLedgerRow[] = [];
  paymentGroups: StudentPaymentHistoryGroupRow[] = [];
  studentId: number | null = null;
  loadingReceiptRef: string | null = null;
  uploadingPhoto = false;
  generatingEnrollmentCertificate = false;

  editGeneral = false;
  editSchooling = false;
  editHealth = false;

  readonly canWriteStudent = this.authUtils.hasAnyRole([...ROLES_STUDENT_WRITE]);
  readonly canPrintReceiptDuplicate = this.authUtils.hasAnyRole([
    AppRoles.ADMIN_ECOLE,
    AppRoles.DIRECTOR,
    AppRoles.STAFF,
    AppRoles.ACCOUNTANT
  ]);

  /** Onglet Finances (API finance réservée hors enseignants côté navigation). */
  readonly showStudentFinanceTab = !this.authUtils.hasRole(AppRoles.TEACHER);

  readonly generalForm = this.fb.group({
    civility: ['MONSIEUR', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthDate: ['', Validators.required],
    birthPlace: [''],
    nationality: [''],
    address: [''],
    communicationPhone: [''],
    communicationEmail: ['']
  });

  readonly schoolingForm = this.fb.group({
    enrollmentStatus: ['INSCRIT', Validators.required],
    classHistory: ['']
  });

  readonly healthForm = this.fb.group({
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    bloodGroup: [''],
    allergies: [''],
    tutorName: [''],
    tutorProfession: [''],
    tutorPhone: [''],
    tutorEmail: ['']
  });

  readonly paymentColumns = [
    'paymentDate', 'schoolYearLabel', 'receiptReference', 'paymentType', 'paymentMode',
    'recordedBy', 'validatedByUserName', 'amount', 'actions'
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studentApi: StudentApiService,
    private readonly financeApi: FinanceApiService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
    private readonly authUtils: AuthUtilsService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('studentId'));
    if (!id) {
      this.snackBar.open('Identifiant élève invalide.', 'Fermer', { duration: 4000 });
      void this.router.navigate(['/students']);
      return;
    }
    this.studentId = id;
    this.load(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get photoUrl(): string | null {
    if (!this.student?.photoPath) return null;
    return `${API_BASE_URL}${this.student.photoPath}`;
  }

  get tuitionProgressPct(): number {
    if (!this.paymentInfo) return 0;
    const due = this.paymentInfo.monthlyTuition.reduce((s, m) => s + Number(m.dueAmount || 0), 0);
    const paid = this.paymentInfo.monthlyTuition.reduce((s, m) => s + Number(m.paidAmount || 0), 0);
    if (!due) return 0;
    return Math.max(0, Math.min(100, (paid / due) * 100));
  }

  get insPieStyle(): string {
    if (!this.paymentInfo) return '';
    const exp = Number(this.paymentInfo.insReinsExpected || 0);
    const paid = Math.min(exp, Number(this.paymentInfo.insReinsPaid || 0));
    const pct = exp <= 0 ? 0 : Math.round((paid / exp) * 100);
    return `background: conic-gradient(#1976d2 ${pct}%, #e0e0e0 ${pct}% 100%);`;
  }

  startEdit(section: 'general' | 'schooling' | 'health'): void {
    if (!this.canWriteStudent) return;
    if (section === 'general') this.editGeneral = true;
    if (section === 'schooling') this.editSchooling = true;
    if (section === 'health') this.editHealth = true;
  }

  saveGeneral(): void {
    if (!this.studentId || this.generalForm.invalid || !this.generalForm.dirty) return;
    this.studentApi.updateProfile(this.studentId, this.generalForm.getRawValue()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.applyStudent(s); this.editGeneral = false; this.snackBar.open('Informations générales mises à jour.', 'Fermer', { duration: 2500 }); },
      error: (err) => this.snackBar.open(err?.error?.message || 'Mise à jour impossible.', 'Fermer', { duration: 5000 })
    });
  }

  saveSchooling(): void {
    if (!this.studentId || this.schoolingForm.invalid || !this.schoolingForm.dirty) return;
    this.studentApi.updateProfile(this.studentId, this.schoolingForm.getRawValue()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.applyStudent(s); this.editSchooling = false; this.snackBar.open('Scolarité mise à jour.', 'Fermer', { duration: 2500 }); },
      error: (err) => this.snackBar.open(err?.error?.message || 'Mise à jour impossible.', 'Fermer', { duration: 5000 })
    });
  }

  saveHealth(): void {
    if (!this.studentId || this.healthForm.invalid || !this.healthForm.dirty) return;
    this.studentApi.updateProfile(this.studentId, this.healthForm.getRawValue()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.applyStudent(s); this.editHealth = false; this.snackBar.open('Santé & documents mis à jour.', 'Fermer', { duration: 2500 }); },
      error: (err) => this.snackBar.open(err?.error?.message || 'Mise à jour impossible.', 'Fermer', { duration: 5000 })
    });
  }

  onPhotoSelected(event: Event): void {
    if (!this.studentId) return;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.uploadingPhoto = true;
    const sid = this.studentId;
    void (async () => {
      let toSend: File;
      try {
        toSend = await prepareStudentPhotoFile(file);
      } catch {
        toSend = file;
      }
      this.studentApi.uploadPhoto(sid, toSend).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.uploadingPhoto = false;
          this.clearPhotoInputs();
        })
      ).subscribe({
        next: (s) => { this.applyStudent(s); this.snackBar.open('Photo mise à jour.', 'Fermer', { duration: 2500 }); },
        error: (err: { status?: number; error?: { message?: string } }) => {
          const msg =
            err?.status === 413 || err?.status === 0
              ? 'Fichier trop volumineux. Réessayez ou choisissez une autre image.'
              : (err?.error?.message || 'Upload photo impossible.');
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
    })();
  }

  private clearPhotoInputs(): void {
    for (const ref of [this.galleryInputRef, this.cameraInputRef]) {
      if (ref?.nativeElement) {
        ref.nativeElement.value = '';
      }
    }
  }

  generateEnrollmentCertificate(): void {
    if (!this.studentId) return;
    this.generatingEnrollmentCertificate = true;
    this.studentApi.generateEnrollmentCertificate(this.studentId).pipe(
      takeUntil(this.destroy$),
      finalize(() => { this.generatingEnrollmentCertificate = false; })
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Génération de l’attestation impossible.', 'Fermer', { duration: 5000 })
    });
  }

  paymentTypeLabel(type: string | null | undefined): string {
    if (!type) return '—';
    const labels: Record<string, string> = { INSCRIPTION: 'Inscription', REINSCRIPTION: 'Réinscription', SCOLARITE: 'Scolarité', FOURNITURES: 'Fournitures' };
    return labels[type] ?? type;
  }

  ledgerTypeLabel(row: StudentPaymentLedgerRow): string {
    const base = this.paymentTypeLabel(row.paymentType);
    if (row.paymentType === 'SCOLARITE' && row.tuitionMonthLabel) return `${base} [${row.tuitionMonthLabel}]`;
    return base;
  }

  paymentModeLabel(mode: string | null | undefined): string {
    if (!mode) return '—';
    const labels: Record<string, string> = { ESPECES: 'Espèces', ORANGE_MONEY: 'Orange Money', MOOV_MONEY: 'Moov Money', VIREMENT: 'Virement' };
    return labels[mode] ?? mode;
  }

  asMoney(value: number, currency: string): string {
    const cur = (currency || 'GNF').trim();
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0))} ${cur}`;
  }

  formatBirth(raw: StudentDetailDto['birthDate'] | null | undefined): string {
    if (raw == null) return '—';
    if (typeof raw === 'string') {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('fr-FR');
    }
    if (Array.isArray(raw) && raw.length >= 3) {
      const [y,m,d] = raw;
      return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('fr-FR');
    }
    return '—';
  }

  openReceiptDuplicate(row: StudentPaymentHistoryGroupRow): void {
    if (!this.canPrintReceiptDuplicate || this.studentId == null || !row.receiptReference) return;
    this.loadingReceiptRef = row.receiptReference;
    this.financeApi.getReceiptDuplicata(this.studentId, row.receiptReference).pipe(
      takeUntil(this.destroy$),
      finalize(() => { this.loadingReceiptRef = null; })
    ).subscribe({
      next: (dto) => this.openReceiptPrintDialog(dto),
      error: (err: { error?: { message?: string } }) => this.snackBar.open(err?.error?.message || 'Impossible de charger le reçu.', 'Fermer', { duration: 6000 })
    });
  }

  private openReceiptPrintDialog(dto: PaymentReceiptViewDto): void {
    if (this.studentId == null) {
      return;
    }
    const data: PaymentReceiptPrintData = {
      studentId: this.studentId,
      studentName: dto.studentName,
      matricule: dto.matricule,
      schoolYearLabel: dto.schoolYearLabel,
      reference: dto.receiptReference,
      recordedBy: dto.recordedBy,
      paymentMode: dto.paymentMode,
      currency: dto.currency,
      paymentDate: dto.paymentDate,
      lines: (dto.lines ?? []).map((l) => ({ paymentType: l.paymentType, amount: Number(l.amount) || 0, tuitionMonthLabel: l.tuitionMonthLabel ?? null })),
      totalCollected: dto.totalCollected,
      duplicate: dto.duplicate
    };
    this.dialog.open(PaymentReceiptPrintDialogComponent, { width: '440px', maxWidth: '95vw', data });
  }

  private load(studentId: number): void {
    this.loading = true;
    const finance$ = this.showStudentFinanceTab;
    forkJoin({
      student: this.studentApi.getById(studentId).pipe(catchError((err) => { this.snackBar.open(err?.error?.message || 'Élève introuvable.', 'Fermer', { duration: 5000 }); return of<StudentDetailDto | null>(null); })),
      paymentInfo: finance$
        ? this.financeApi.getPaymentInfo(studentId).pipe(catchError(() => of<StudentPaymentInfoDto | null>(null)))
        : of<StudentPaymentInfoDto | null>(null),
      payments: finance$
        ? this.financeApi.listPaymentsForStudent(studentId).pipe(catchError(() => of<StudentPaymentLedgerRow[]>([])))
        : of<StudentPaymentLedgerRow[]>([])
    }).pipe(takeUntil(this.destroy$)).subscribe(({ student, paymentInfo, payments }) => {
      this.loading = false;
      if (!student) { void this.router.navigate(['/students']); return; }
      this.applyStudent(student);
      this.paymentInfo = paymentInfo;
      this.payments = payments ?? [];
      this.paymentGroups = this.buildPaymentGroups(this.payments);
    });
  }

  private applyStudent(s: StudentDetailDto): void {
    this.student = s;
    this.generalForm.patchValue({
      civility: s.civility === 'MADAME' ? 'MADAME' : 'MONSIEUR',
      firstName: s.firstName,
      lastName: s.lastName,
      birthDate: this.toDateInputValue(s.birthDate),
      birthPlace: s.birthPlace ?? '',
      nationality: s.nationality ?? '',
      address: s.address ?? '',
      communicationPhone: s.communicationPhone ?? '',
      communicationEmail: s.communicationEmail ?? ''
    }, { emitEvent: false });
    this.schoolingForm.patchValue({
      enrollmentStatus: s.enrollmentStatus ?? 'INSCRIT',
      classHistory: s.classHistory ?? ''
    }, { emitEvent: false });
    this.healthForm.patchValue({
      emergencyContactName: s.emergencyContactName ?? '',
      emergencyContactPhone: s.emergencyContactPhone ?? '',
      bloodGroup: s.bloodGroup ?? '',
      allergies: s.allergies ?? '',
      tutorName: s.tutorName ?? '',
      tutorProfession: s.tutorProfession ?? '',
      tutorPhone: s.tutorPhone ?? '',
      tutorEmail: s.tutorEmail ?? ''
    }, { emitEvent: false });
    this.generalForm.markAsPristine();
    this.schoolingForm.markAsPristine();
    this.healthForm.markAsPristine();
  }

  private buildPaymentGroups(rows: StudentPaymentLedgerRow[]): StudentPaymentHistoryGroupRow[] {
    const sorted = [...rows].sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime() || b.id - a.id);
    const byKey = new Map<string, StudentPaymentLedgerRow[]>();
    for (const row of sorted) {
      const ref = row.receiptReference?.trim();
      const key = ref && ref.length > 0 ? ref : `legacy-${row.id}`;
      byKey.set(key, [...(byKey.get(key) ?? []), row]);
    }
    const groups: StudentPaymentHistoryGroupRow[] = [];
    for (const gRows of byKey.values()) {
      const typeParts = [...new Set(gRows.map((r) => this.ledgerTypeLabel(r)))];
      groups.push({
        receiptReference: gRows[0].receiptReference?.trim() || null,
        paymentDate: gRows[0].paymentDate,
        schoolYearLabel: gRows[0].schoolYearLabel,
        paymentTypeLabel: typeParts.join(', '),
        paymentMode: gRows[0].paymentMode,
        amount: gRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        currency: gRows[0].currency || 'GNF',
        recordedBy: gRows.map((r) => r.recordedBy?.trim()).find(Boolean) || null,
        validatedByUserName: gRows.map((r) => r.validatedByUserName?.trim()).find(Boolean) || null
      });
    }
    return groups;
  }

  private toDateInputValue(raw: StudentDetailDto['birthDate'] | null | undefined): string {
    if (raw == null) return '';
    if (typeof raw === 'string') return raw.length >= 10 ? raw.slice(0, 10) : '';
    if (Array.isArray(raw) && raw.length >= 3) return `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    return '';
  }
}
