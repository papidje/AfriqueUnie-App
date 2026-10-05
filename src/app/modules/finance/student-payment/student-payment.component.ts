import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

function recordedByNotBlank(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const s = `${control.value ?? ''}`.trim();
    return s.length ? null : { blank: true };
  };
}
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PaymentReceiptPrintDialogComponent } from '../../../shared/component/payment-receipt-print-dialog/payment-receipt-print-dialog.component';
import { PaymentReceiptPrintData } from '../../../shared/component/payment-receipt-print-dialog/payment-receipt-print-dialog.models';
import {
  CreateStudentPaymentPayload,
  MonthlyTuitionStatusDto,
  StudentPaymentInfoDto
} from '../../../models/finance.models';
import { FinanceApiService } from '../../../service/finance-api.service';

interface ProgressSegment {
  id: string;
  label: string;
  fullLabel: string;
  due: number;
  paid: number;
  kind: 'insReins' | 'supplies' | 'month';
  /** Cumul dû jusqu’à la fin de ce segment (inclus). */
  endCumulative: number;
}

@Component({
  selector: 'app-student-payment',
  templateUrl: './student-payment.component.html',
  styleUrls: ['./student-payment.component.scss']
})
export class StudentPaymentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = true;
  submitting = false;
  savingPercent = false;
  studentId: number | null = null;
  info: StudentPaymentInfoDto | null = null;

  /** Segments proportionnels (inscription, fournitures, mois). */
  segments: ProgressSegment[] = [];
  /** Total dû (payé + reliquat). */
  totalDue = 0;
  /** Déjà encaissé. */
  paidTotal = 0;
  /** Reliquat = totalDue - paidTotal. */
  maxRemaining = 0;
  /** Montant typique d’une mensualité (affichage sous la barre). */
  monthlyUnitAmount = 0;
  /** Montant inscription / réinscription dû (affichage sous Ins.). */
  inscriptionDueAmount = 0;

  /** Brouillon local du % (avant enregistrement API). */
  draftPayablePercent = 100;

  readonly form = this.fb.group({
    paymentMode: ['ESPECES', Validators.required],
    recordedBy: ['', [Validators.required, Validators.maxLength(200), recordedByNotBlank()]],
    paymentReference: [''],
    amountToCollect: [0, [Validators.required, Validators.min(0.01)]]
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly financeApi: FinanceApiService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get showPaymentReference(): boolean {
    return this.form.value.paymentMode !== 'ESPECES';
  }

  get amountToCollect(): number {
    const n = Number(this.form.value.amountToCollect);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }
    return this.maxRemaining > 0 ? Math.min(n, this.maxRemaining) : 0;
  }

  /** % de la barre déjà payé (vert). */
  get paidPct(): number {
    if (this.totalDue <= 0) {
      return 0;
    }
    return (this.paidTotal / this.totalDue) * 100;
  }

  /** % de la barre couvert par le montant à encaisser (bleu). */
  get pendingPct(): number {
    if (this.totalDue <= 0) {
      return 0;
    }
    return (this.amountToCollect / this.totalDue) * 100;
  }

  /** Zone interactive (reliquat) en % de la barre. */
  get remainingTrackPct(): number {
    return Math.max(0, 100 - this.paidPct);
  }

  get inscriptionLabel(): string {
    return this.info?.insReinsType === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('studentId'));
    if (!id) {
      this.snackBar.open('Élève invalide.', 'Fermer', { duration: 4000 });
      void this.router.navigate(['/finance']);
      return;
    }
    this.studentId = id;
    this.loadInfo(id);

    this.form
      .get('paymentMode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((mode) => this.syncPaymentReferenceValidators(mode));
    this.syncPaymentReferenceValidators(this.form.value.paymentMode);

    this.form
      .get('amountToCollect')
      ?.valueChanges.pipe(
        debounceTime(120),
        distinctUntilChanged((a, b) => Number(a) === Number(b)),
        takeUntil(this.destroy$)
      )
      .subscribe((v) => {
        const n = Number(v);
        if (this.maxRemaining > 0 && Number.isFinite(n) && n > this.maxRemaining) {
          this.form.patchValue({ amountToCollect: this.maxRemaining }, { emitEvent: false });
        }
        this.cdr.markForCheck();
      });
  }

  private syncPaymentReferenceValidators(mode: string | null | undefined): void {
    const ctrl = this.form.get('paymentReference');
    if (!ctrl) {
      return;
    }
    if (mode && mode !== 'ESPECES') {
      ctrl.setValidators([Validators.required, Validators.maxLength(100), recordedByNotBlank()]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue('', { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSliderInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const amount = Number.isFinite(raw) ? Math.max(0, Math.min(this.maxRemaining, Math.round(raw))) : 0;
    this.form.patchValue({ amountToCollect: amount }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  /** Aimantation légère aux bornes de segments au relâchement. */
  onSliderRelease(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(raw) || this.maxRemaining <= 0) {
      return;
    }
    const amount = Math.max(0, Math.min(this.maxRemaining, Math.round(raw)));
    const boundaries = this.segments
      .map((s) => s.endCumulative)
      .filter((c) => c >= this.paidTotal && c <= this.totalDue);
    const threshold = Math.max(500, Math.round(this.maxRemaining * 0.015));
    let best = amount;
    let bestDist = threshold + 1;
    for (const b of boundaries) {
      const candidate = Math.round(b - this.paidTotal);
      const dist = Math.abs(candidate - amount);
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        best = Math.max(0, Math.min(this.maxRemaining, candidate));
      }
    }
    for (const edge of [0, this.maxRemaining]) {
      const dist = Math.abs(edge - amount);
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        best = edge;
      }
    }
    if (best !== amount) {
      this.form.patchValue({ amountToCollect: best }, { emitEvent: false });
      (event.target as HTMLInputElement).value = String(best);
      this.cdr.markForCheck();
    }
  }

  trackSegmentById(_index: number, seg: ProgressSegment): string {
    return seg.id;
  }

  submitPayment(): void {
    if (this.form.invalid || !this.studentId) {
      this.form.markAllAsTouched();
      return;
    }
    const amountNum = Number(this.form.value.amountToCollect);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.snackBar.open('Indiquez un montant à encaisser supérieur à 0.', 'Fermer', { duration: 3500 });
      return;
    }

    const mode = this.form.value.paymentMode as CreateStudentPaymentPayload['paymentMode'];
    const author = String(this.form.value.recordedBy ?? '').trim();
    if (!author) {
      this.snackBar.open('Indiquez l’auteur du paiement.', 'Fermer', { duration: 3500 });
      this.form.get('recordedBy')?.markAsTouched();
      return;
    }

    const paymentReference =
      mode !== 'ESPECES' ? String(this.form.value.paymentReference ?? '').trim() : null;
    if (mode !== 'ESPECES' && !paymentReference) {
      this.snackBar.open('Indiquez la référence de paiement.', 'Fermer', { duration: 3500 });
      this.form.get('paymentReference')?.markAsTouched();
      return;
    }

    const payload: CreateStudentPaymentPayload = {
      paymentMode: mode,
      currency: 'GNF',
      recordedBy: author,
      paymentReference,
      totalDeclaredAmount: amountNum,
      payInsReins: false,
      insReinsAmount: 0,
      paySupplies: false,
      months: []
    };

    this.submitting = true;
    this.financeApi.createPayment(this.studentId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.submitting = false;
          const studentId = this.studentId;
          if (studentId == null) {
            return;
          }
          const focusSchoolClassId = res.schoolClassId ?? this.info?.schoolClassId;
          const printData: PaymentReceiptPrintData = {
            studentId,
            studentName: this.info?.studentName ?? '',
            matricule: this.info?.matricule ?? '',
            reference: res.receiptReference,
            recordedBy: res.recordedBy,
            paymentReference: res.paymentReference,
            paymentMode: res.paymentMode,
            currency: 'GNF',
            paymentDate: new Date().toISOString(),
            lines: (res.lines ?? []).map((l) => ({
              paymentType: l.paymentType,
              amount: Number(l.amount) || 0,
              tuitionMonthLabel: l.tuitionMonthLabel ?? null
            })),
            totalCollected: res.totalCollected,
            duplicate: false
          };
          const ref = this.dialog.open(PaymentReceiptPrintDialogComponent, {
            width: '440px',
            maxWidth: '95vw',
            disableClose: false,
            data: printData
          });
          ref.afterClosed().subscribe(() => {
            const cid = Number(focusSchoolClassId);
            if (focusSchoolClassId != null && Number.isFinite(cid) && cid > 0) {
              void this.router.navigate(['/finance'], { queryParams: { classId: cid } });
            } else {
              void this.router.navigate(['/finance']);
            }
          });
        },
        error: (err) => {
          this.submitting = false;
          this.snackBar.open(err?.error?.message || 'Impossible d’enregistrer ce paiement.', 'Fermer', { duration: 5000 });
        }
      });
  }

  asMoney(value: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  get tuitionPercentLocked(): boolean {
    return !!this.info?.tuitionPercentLocked;
  }

  get tuitionPercentTooltip(): string {
    return (
      `Scolarité à ${this.draftPayablePercent} % ` +
      `(verrouillé après un premier encaissement de scolarité). ` +
      `Barème : ${this.asMoney(this.tuitionCatalogExpected)} GNF → dû : ` +
      `${this.asMoney(this.tuitionPayablePreview)} GNF.`
    );
  }

  get tuitionCatalogExpected(): number {
    return Number(this.info?.tuitionCatalogExpected ?? 0);
  }

  get tuitionPayablePreview(): number {
    const catalog = this.tuitionCatalogExpected;
    const p = Math.max(0, Math.min(100, Math.round(Number(this.draftPayablePercent) || 0)));
    if (p >= 100) {
      return catalog;
    }
    if (p <= 0) {
      return 0;
    }
    return Math.round(catalog * (p / 100));
  }

  onPayablePercentInput(event: Event): void {
    if (this.tuitionPercentLocked) {
      return;
    }
    const n = Number((event.target as HTMLInputElement).value);
    this.draftPayablePercent = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 100;
  }

  saveTuitionPercent(): void {
    if (this.studentId == null || this.tuitionPercentLocked) {
      return;
    }
    const percent = Math.max(0, Math.min(100, Math.round(Number(this.draftPayablePercent) || 0)));
    this.savingPercent = true;
    this.financeApi.updateTuitionPayablePercent(this.studentId, percent).subscribe({
      next: () => {
        this.savingPercent = false;
        this.snackBar.open('Pourcentage de scolarité enregistré.', 'Fermer', { duration: 3000 });
        this.loadInfo(this.studentId!);
      },
      error: (err) => {
        this.savingPercent = false;
        this.snackBar.open(err?.error?.message || 'Impossible de modifier le pourcentage.', 'Fermer', {
          duration: 5000
        });
      }
    });
  }

  private loadInfo(studentId: number): void {
    this.loading = true;
    this.financeApi.getPaymentInfo(studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.info = info;
          this.draftPayablePercent =
            info.tuitionPayablePercent != null && Number.isFinite(Number(info.tuitionPayablePercent))
              ? Math.round(Number(info.tuitionPayablePercent))
              : 100;
          this.applyProgressModel(info);
          const amtCtrl = this.form.get('amountToCollect');
          if (this.maxRemaining > 0) {
            amtCtrl?.setValidators([
              Validators.required,
              Validators.min(0.01),
              Validators.max(this.maxRemaining)
            ]);
          } else {
            amtCtrl?.setValidators([Validators.required, Validators.min(0)]);
          }
          amtCtrl?.updateValueAndValidity({ emitEvent: false });
          const cur = Number(this.form.get('amountToCollect')?.value);
          if (!Number.isFinite(cur) || cur < 0 || cur > this.maxRemaining) {
            this.form.patchValue({ amountToCollect: 0 }, { emitEvent: false });
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err?.error?.message || 'Impossible de charger les informations de paiement.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private applyProgressModel(info: StudentPaymentInfoDto): void {
    const rows: ProgressSegment[] = [];
    let cumulative = 0;

    const insDue = Math.max(0, Number(info.insReinsExpected || 0));
    const insPaid = Math.max(0, Math.min(insDue, Number(info.insReinsPaid || 0)));
    this.inscriptionDueAmount = insDue;
    if (insDue > 0) {
      cumulative += insDue;
      const full = info.insReinsType === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription';
      rows.push({
        id: 'ins-reins',
        label: info.insReinsType === 'REINSCRIPTION' ? 'Réins.' : 'Ins.',
        fullLabel: full,
        due: insDue,
        paid: insPaid,
        kind: 'insReins',
        endCumulative: cumulative
      });
    }

    const suppliesOn = info.suppliesColumnEnabled !== false;
    const suppliesDue = suppliesOn ? Math.max(0, Number(info.suppliesExpected || 0)) : 0;
    if (suppliesDue > 0) {
      const suppliesPaid = info.suppliesPaid ? suppliesDue : 0;
      cumulative += suppliesDue;
      rows.push({
        id: 'supplies',
        label: 'Four.',
        fullLabel: 'Fournitures',
        due: suppliesDue,
        paid: suppliesPaid,
        kind: 'supplies',
        endCumulative: cumulative
      });
    }

    const monthAmounts: number[] = [];
    for (const m of info.monthlyTuition ?? []) {
      const due = Math.max(0, Number(m.dueAmount || 0));
      if (due <= 0) {
        continue;
      }
      const paid = Math.max(0, Math.min(due, Number(m.paidAmount || 0)));
      cumulative += due;
      monthAmounts.push(due);
      rows.push({
        id: `month-${m.monthCode}`,
        label: this.abbreviateMonth(m),
        fullLabel: m.monthLabel || m.monthCode,
        due,
        paid,
        kind: 'month',
        endCumulative: cumulative
      });
    }

    this.segments = rows;
    this.totalDue = cumulative;
    this.paidTotal = rows.reduce((s, r) => s + r.paid, 0);
    this.maxRemaining = Math.max(0, this.totalDue - this.paidTotal);
    this.monthlyUnitAmount =
      monthAmounts.length > 0
        ? Math.round(monthAmounts.reduce((a, b) => a + b, 0) / monthAmounts.length)
        : 0;
  }

  private abbreviateMonth(m: MonthlyTuitionStatusDto): string {
    const code = (m.monthCode || '').toUpperCase();
    const byCode: Record<string, string> = {
      OCT: 'Oct',
      NOV: 'Nov',
      DEC: 'Déc',
      JAN: 'Jan',
      FEB: 'Fév',
      MAR: 'Mar',
      APR: 'Avr',
      MAY: 'Mai',
      JUN: 'Juin'
    };
    if (byCode[code]) {
      return byCode[code];
    }
    const label = (m.monthLabel || '').trim();
    if (label.length <= 4) {
      return label;
    }
    return label.slice(0, 3);
  }
}
