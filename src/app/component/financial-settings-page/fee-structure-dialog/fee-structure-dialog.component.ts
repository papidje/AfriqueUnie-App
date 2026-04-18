import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeeStructureDto } from '../../../models/fee-structure.models';

export interface FeeStructureDialogData {
  schoolYearId: number;
  schoolYearLabel: string;
  classLevelId: number;
  classLevelCode: string;
  classLevelName: string;
  existing?: FeeStructureDto;
}

export interface FeeStructureDialogResult {
  classLevelId: number;
  schoolYearId: number;
  registrationFee: number;
  reRegistrationFee: number;
  monthlyTuitionFee: number;
  suppliesFee: number;
  suppliesColumnEnabled: boolean;
  currency: string;
  id?: number;
}

@Component({
  selector: 'app-fee-structure-dialog',
  templateUrl: './fee-structure-dialog.component.html',
  styleUrls: ['./fee-structure-dialog.component.scss']
})
export class FeeStructureDialogComponent implements OnInit, OnDestroy {
  readonly isEdit = !!this.data.existing;

  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.group({
    registrationFee: [this.toDisplay(this.data.existing?.registrationFee ?? 0), Validators.required],
    reRegistrationFee: [this.toDisplay(this.data.existing?.reRegistrationFee ?? 0), Validators.required],
    monthlyTuitionFee: [this.toDisplay(this.data.existing?.monthlyTuitionFee ?? 0), Validators.required],
    suppliesFee: [this.toDisplay(this.data.existing?.suppliesFee ?? 0), Validators.required],
    suppliesColumnEnabled: [!!this.data.existing?.suppliesColumnEnabled],
    currency: [this.data.existing?.currency || 'GNF', [Validators.required, Validators.maxLength(10)]]
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: FeeStructureDialogData,
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<FeeStructureDialogComponent>
  ) {}

  ngOnInit(): void {
    const col = this.form.get('suppliesColumnEnabled');
    const fee = this.form.get('suppliesFee');
    const syncSuppliesFeeState = (enabled: boolean | null | undefined): void => {
      if (!fee) {
        return;
      }
      if (!enabled) {
        fee.setValue(this.toDisplay(0), { emitEvent: false });
        fee.disable({ emitEvent: false });
      } else {
        fee.enable({ emitEvent: false });
      }
    };
    syncSuppliesFeeState(!!col?.value);
    col?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((on) => syncSuppliesFeeState(!!on));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAmountInput(controlName: 'registrationFee' | 'reRegistrationFee' | 'monthlyTuitionFee' | 'suppliesFee'): void {
    const ctrl = this.form.get(controlName);
    const formatted = this.toDisplay(this.toNumber(ctrl?.value));
    ctrl?.setValue(formatted, { emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const suppliesOn = !!v.suppliesColumnEnabled;
    const payload: FeeStructureDialogResult = {
      id: this.data.existing?.id,
      classLevelId: this.data.classLevelId,
      schoolYearId: this.data.schoolYearId,
      registrationFee: this.toNumber(v.registrationFee),
      reRegistrationFee: this.toNumber(v.reRegistrationFee),
      monthlyTuitionFee: this.toNumber(v.monthlyTuitionFee),
      suppliesFee: suppliesOn ? this.toNumber(v.suppliesFee) : 0,
      suppliesColumnEnabled: suppliesOn,
      currency: (v.currency || 'GNF').trim().toUpperCase()
    };
    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private toNumber(value: unknown): number {
    const raw = String(value ?? '').replace(/[^\d]/g, '');
    if (!raw) {
      return 0;
    }
    return Number(raw);
  }

  private toDisplay(value: number): string {
    const amount = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
  }
}
