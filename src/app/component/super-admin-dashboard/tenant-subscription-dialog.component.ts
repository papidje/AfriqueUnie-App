import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface TenantSubscriptionDialogData {
  tenantName: string;
  studentCount: number;
  /** Date ISO yyyy-MM-dd déjà connue, si présente. */
  currentEndsOn: string | null;
}

export interface TenantSubscriptionDialogResult {
  subscriptionEndsOn: string;
}

@Component({
  selector: 'app-tenant-subscription-dialog',
  templateUrl: './tenant-subscription-dialog.component.html',
  styleUrls: ['./tenant-subscription-dialog.component.scss']
})
export class TenantSubscriptionDialogComponent {
  readonly minDate = new Date();

  readonly form = this.fb.group({
    subscriptionEndsOn: [null as Date | null, Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<
      TenantSubscriptionDialogComponent,
      TenantSubscriptionDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) readonly data: TenantSubscriptionDialogData
  ) {
    if (data.currentEndsOn) {
      const parsed = new Date(data.currentEndsOn + 'T12:00:00');
      if (!Number.isNaN(parsed.getTime()) && parsed >= this.startOfToday()) {
        this.form.patchValue({ subscriptionEndsOn: parsed });
      }
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const d = this.form.value.subscriptionEndsOn;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      return;
    }
    this.dialogRef.close({ subscriptionEndsOn: this.toIsoDate(d) });
  }

  private startOfToday(): Date {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
