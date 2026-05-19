import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../service/auth.service';
import { UserService } from '../../../service/user.service';

export interface EditProfileDialogData {
  fullname: string;
}

@Component({
  selector: 'app-edit-profile-dialog',
  templateUrl: './edit-profile-dialog.component.html',
  styleUrls: ['./edit-profile-dialog.component.scss']
})
export class EditProfileDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  saving = false;
  serverError: string | null = null;

  readonly form = this.fb.group({
    fullname: ['', [Validators.required, Validators.maxLength(255)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<EditProfileDialogComponent, boolean>,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) private readonly data: EditProfileDialogData
  ) {}

  ngOnInit(): void {
    const initial = (this.data?.fullname ?? '').trim();
    this.form.patchValue({ fullname: initial });
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.serverError = null;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    this.serverError = null;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const fullname = (this.form.get('fullname')?.value as string)?.trim() ?? '';
    this.saving = true;
    this.userService
      .updateOwnProfile({ fullname })
      .pipe(switchMap(() => this.authService.refreshToken()))
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Profil mis à jour.', 'Fermer', { duration: 3500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          const msg =
            err?.error?.detail ||
            err?.error?.message ||
            err?.error?.error ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Impossible de mettre à jour le profil.';
          this.serverError = typeof msg === 'string' ? msg : 'Impossible de mettre à jour le profil.';
        }
      });
  }
}
