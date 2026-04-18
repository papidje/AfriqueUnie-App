import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import {
  PaymentReceiptPromptDialogComponent,
  PaymentReceiptPromptData
} from './payment-receipt-prompt-dialog.component';
import {
  CreateStudentPaymentPayload,
  MonthlyTuitionStatusDto,
  StudentPaymentInfoDto
} from '../../../models/finance.models';
import { FinanceApiService } from '../../../service/finance-api.service';

interface DebtItem {
  id: string;
  title: string;
  amount: number;
  checked: boolean;
  kind: 'insReins' | 'supplies' | 'month';
  monthCode?: string;
}

@Component({
  selector: 'app-student-payment',
  templateUrl: './student-payment.component.html',
  styleUrls: ['./student-payment.component.scss']
})
export class StudentPaymentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /**
   * `amount` : le montant saisi pilote les coches (ordre des dettes) et l’API `totalDeclaredAmount`.
   * `checkbox` : les coches pilotent le montant (somme) et l’API « legacy » (lignes sélectionnées).
   */
  private paymentInputSource: 'amount' | 'checkbox' = 'amount';

  loading = true;
  submitting = false;
  studentId: number | null = null;
  info: StudentPaymentInfoDto | null = null;
  debts: DebtItem[] = [];
  /** Somme des reliquats (dettes listées) ; plafond du champ montant. */
  maxRemaining = 0;

  readonly form = this.fb.group({
    paymentMode: ['ESPECES', Validators.required],
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
      .get('amountToCollect')
      ?.valueChanges.pipe(
        debounceTime(200),
        distinctUntilChanged((a, b) => Number(a) === Number(b)),
        takeUntil(this.destroy$)
      )
      .subscribe((v) => {
        this.paymentInputSource = 'amount';
        const n = Number(v);
        if (this.maxRemaining > 0 && Number.isFinite(n) && n > this.maxRemaining) {
          this.form.patchValue({ amountToCollect: this.maxRemaining }, { emitEvent: false });
          this.applyAutoChecksFromAmount(this.maxRemaining);
        } else {
          this.applyAutoChecksFromAmount(v);
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDebt(item: DebtItem, checked: boolean): void {
    this.paymentInputSource = 'checkbox';
    this.debts = this.debts.map((d) => (d.id === item.id ? { ...d, checked } : d));
    const sum = this.selectedTotal();
    this.form.patchValue({ amountToCollect: sum }, { emitEvent: false });
    this.cdr.markForCheck();
  }

  selectedTotal(): number {
    return this.debts.filter((d) => d.checked).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  }

  /** Coche uniquement les lignes entièrement couvertes par le montant saisi, dans l’ordre des dettes. */
  applyAutoChecksFromAmount(raw: number | string | null | undefined): void {
    let M = typeof raw === 'string' ? Number(String(raw).replace(',', '.')) : Number(raw);
    if (!Number.isFinite(M) || M < 0) {
      M = 0;
    }
    if (this.maxRemaining > 0) {
      M = Math.min(M, this.maxRemaining);
    }
    let R = M;
    this.debts = this.debts.map((d) => {
      const line = Math.max(0, Number(d.amount) || 0);
      const checked = line > 0 && R >= line;
      if (checked) {
        R -= line;
      }
      return { ...d, checked };
    });
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
    let payload: CreateStudentPaymentPayload;

    if (this.paymentInputSource === 'amount') {
      payload = {
        paymentMode: mode,
        currency: 'GNF',
        totalDeclaredAmount: amountNum,
        payInsReins: false,
        insReinsAmount: 0,
        paySupplies: false,
        months: []
      };
    } else {
      const selected = this.debts.filter((d) => d.checked);
      if (selected.length === 0) {
        this.snackBar.open('Sélectionnez au moins une dette.', 'Fermer', { duration: 3500 });
        return;
      }
      const insReins = selected.find((d) => d.kind === 'insReins');
      const months = selected.filter((d) => d.kind === 'month' && d.monthCode).map((d) => d.monthCode!);
      payload = {
        paymentMode: mode,
        currency: 'GNF',
        payInsReins: !!insReins,
        insReinsAmount: insReins?.amount ?? 0,
        paySupplies: selected.some((d) => d.kind === 'supplies'),
        months
      };
    }

    this.submitting = true;
    this.financeApi.createPayment(this.studentId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.submitting = false;
          const focusSchoolClassId = res.schoolClassId ?? this.info?.schoolClassId;
          const data: PaymentReceiptPromptData = {
            studentName: this.info?.studentName ?? '',
            reference: res.receiptReference,
            totalCollected: res.totalCollected
          };
          const ref = this.dialog.open(PaymentReceiptPromptDialogComponent, {
            width: '380px',
            disableClose: false,
            data
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

  trackDebtById(_index: number, debt: DebtItem): string {
    return debt.id;
  }

  private loadInfo(studentId: number): void {
    this.loading = true;
    this.financeApi.getPaymentInfo(studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.info = info;
          this.debts = this.buildDebts(info);
          this.maxRemaining = this.computeTotalRemaining(info);
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
          this.paymentInputSource = 'amount';
          const cur = Number(this.form.get('amountToCollect')?.value);
          if (Number.isFinite(cur) && cur > this.maxRemaining) {
            this.form.patchValue({ amountToCollect: this.maxRemaining }, { emitEvent: false });
          }
          this.applyAutoChecksFromAmount(this.form.get('amountToCollect')?.value);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err?.error?.message || 'Impossible de charger les informations de paiement.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private buildDebts(info: StudentPaymentInfoDto): DebtItem[] {
    const rows: DebtItem[] = [];
    if (info.insReinsRemaining > 0) {
      rows.push({
        id: 'ins-reins',
        title: info.insReinsType === 'REINSCRIPTION' ? 'Réinscription' : 'Inscription',
        amount: info.insReinsRemaining,
        checked: false,
        kind: 'insReins'
      });
    }
    const suppliesColumnOn = info.suppliesColumnEnabled !== false;
    const suppliesDue =
      suppliesColumnOn && !info.suppliesPaid && Number(info.suppliesExpected || 0) > 0;
    if (suppliesDue) {
      rows.push({
        id: 'supplies',
        title: 'Fournitures',
        amount: Number(info.suppliesExpected || 0),
        checked: false,
        kind: 'supplies'
      });
    }
    info.monthlyTuition
      .filter((m) => this.monthRemaining(m) > 0)
      .forEach((m) => {
        const rem = this.monthRemaining(m);
        rows.push({
          id: `month-${m.monthCode}`,
          title: m.monthLabel,
          amount: rem,
          checked: false,
          kind: 'month',
          monthCode: m.monthCode
        });
      });
    return rows;
  }

  private monthRemaining(month: MonthlyTuitionStatusDto): number {
    return Math.max(0, Number(month.dueAmount || 0) - Number(month.paidAmount || 0));
  }

  private computeTotalRemaining(info: StudentPaymentInfoDto): number {
    let s = Math.max(0, Number(info.insReinsRemaining || 0));
    if (info.suppliesColumnEnabled !== false && !info.suppliesPaid) {
      s += Number(info.suppliesExpected || 0);
    }
    for (const m of info.monthlyTuition) {
      s += this.monthRemaining(m);
    }
    return Math.max(0, s);
  }

}

