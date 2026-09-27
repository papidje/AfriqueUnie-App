import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubjectAdditionRequestDetail } from '../../models/subject-addition-request.models';
import { SubjectAdditionRequestService } from '../../service/subject-addition-request.service';
import { SuperAdminService } from '../../service/super-admin.service';
import { formatNotificationDateTime } from '../../shared/util/display-date.util';

export interface SubjectAdditionRequestDetailDialogData {
  requestId: number;
  /** Mode super-admin : accept / refuse + API super-admin. */
  asSuperAdmin?: boolean;
}

@Component({
  selector: 'app-subject-addition-request-detail-dialog',
  templateUrl: './subject-addition-request-detail-dialog.component.html',
  styleUrls: ['./subject-addition-request-detail-dialog.component.scss']
})
export class SubjectAdditionRequestDetailDialogComponent implements OnInit {
  loading = true;
  saving = false;
  detail: SubjectAdditionRequestDetail | null = null;

  readonly commentForm = this.fb.group({
    body: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]]
  });

  readonly acceptForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.maxLength(200)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SubjectAdditionRequestDetailDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: SubjectAdditionRequestDetailDialogData,
    private readonly schoolApi: SubjectAdditionRequestService,
    private readonly superAdminApi: SuperAdminService,
    private readonly snackBar: MatSnackBar
  ) {}

  get asSuperAdmin(): boolean {
    return !!this.data.asSuperAdmin;
  }

  get isOpen(): boolean {
    return this.detail?.status === 'OPEN';
  }

  ngOnInit(): void {
    this.reload();
  }

  formatDt(value: string | null | undefined): string {
    return formatNotificationDateTime(value);
  }

  statusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'OPEN':
        return 'Ouverte';
      case 'ACCEPTED':
        return 'Acceptée';
      case 'REFUSED':
        return 'Refusée';
      default:
        return status || '—';
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }

  sendComment(): void {
    if (!this.isOpen || this.commentForm.invalid || !this.detail) {
      this.commentForm.markAllAsTouched();
      return;
    }
    const body = (this.commentForm.value.body || '').trim();
    this.saving = true;
    const req$ = this.asSuperAdmin
      ? this.superAdminApi.commentSubjectAdditionRequest(this.detail.id, body)
      : this.schoolApi.addComment(this.detail.id, body);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.commentForm.reset({ body: '' });
        this.reload(true);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.error?.detail || 'Commentaire impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  accept(): void {
    if (!this.asSuperAdmin || !this.isOpen || !this.detail || this.acceptForm.invalid) {
      this.acceptForm.markAllAsTouched();
      return;
    }
    const v = this.acceptForm.getRawValue();
    this.saving = true;
    this.superAdminApi
      .acceptSubjectAdditionRequest(this.detail.id, {
        code: (v.code || '').trim().toUpperCase(),
        name: (v.name || '').trim() || this.detail.subjectName
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Matière ajoutée au référentiel.', 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          const msg = err?.error?.message || err?.error?.detail || 'Acceptation impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 5000 });
        }
      });
  }

  refuse(): void {
    if (!this.asSuperAdmin || !this.isOpen || !this.detail) {
      return;
    }
    const comment = (this.commentForm.value.body || '').trim();
    this.saving = true;
    this.superAdminApi.refuseSubjectAdditionRequest(this.detail.id, comment || undefined).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Demande refusée.', 'Fermer', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.error?.detail || 'Refus impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  private reload(keepOpen = false): void {
    if (!keepOpen) {
      this.loading = true;
    }
    const req$ = this.asSuperAdmin
      ? this.superAdminApi.getSubjectAdditionRequest(this.data.requestId)
      : this.schoolApi.get(this.data.requestId);
    req$.subscribe({
      next: (d) => {
        this.detail = d;
        if (!this.acceptForm.value.name) {
          this.acceptForm.patchValue({ name: d.subjectName }, { emitEvent: false });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger la demande.', 'Fermer', { duration: 4000 });
      }
    });
  }
}
