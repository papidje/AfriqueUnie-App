import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CommunicationApiService,
  CommunicationBatchSettingsUpdate
} from '../../service/communication-api.service';

@Component({
  selector: 'app-communication-batch-settings-dialog',
  templateUrl: './communication-batch-settings-dialog.component.html',
  styleUrls: ['./communication-batch-settings-dialog.component.scss']
})
export class CommunicationBatchSettingsDialogComponent implements OnInit {
  loading = true;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    evaluationReminderDaysBefore: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
    evaluationReminderEnabled: true,
    paymentReminderEnabled: true,
    timetableChangeEnabled: true,
    batchChunkSize: [50, [Validators.required, Validators.min(10), Validators.max(500)]],
    emailEnabled: true,
    smsEnabled: false
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CommunicationBatchSettingsDialogComponent, boolean>,
    private readonly api: CommunicationApiService,
    private readonly snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.api.getSettings().subscribe({
      next: (s) => {
        this.form.patchValue({
          evaluationReminderDaysBefore: s.evaluationReminderDaysBefore,
          evaluationReminderEnabled: s.evaluationReminderEnabled,
          paymentReminderEnabled: s.paymentReminderEnabled,
          timetableChangeEnabled: s.timetableChangeEnabled,
          batchChunkSize: s.batchChunkSize,
          emailEnabled: s.emailEnabled,
          smsEnabled: s.smsEnabled
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Impossible de charger la configuration.', 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    const v = this.form.getRawValue();
    const body: CommunicationBatchSettingsUpdate = {
      evaluationReminderDaysBefore: v.evaluationReminderDaysBefore,
      evaluationReminderEnabled: v.evaluationReminderEnabled,
      paymentReminderEnabled: v.paymentReminderEnabled,
      timetableChangeEnabled: v.timetableChangeEnabled,
      batchChunkSize: v.batchChunkSize,
      emailEnabled: v.emailEnabled,
      smsEnabled: v.smsEnabled
    };
    this.saving = true;
    this.api.updateSettings(body).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Configuration enregistrée.', 'OK', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'Erreur lors de l’enregistrement.';
        this.snack.open(msg, 'Fermer', { duration: 6000 });
      }
    });
  }
}
