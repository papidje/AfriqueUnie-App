import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../service/user.service';

function newPasswordDifferentFromCurrent(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const cur = (g.get('currentPassword')?.value as string) ?? '';
    const neu = (g.get('newPassword')?.value as string) ?? '';
    if (!neu.length) {
      return null;
    }
    if (cur === neu) {
      return { newSameAsCurrent: true };
    }
    return null;
  };
}

function confirmMatchesNew(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const neu = (g.get('newPassword')?.value as string) ?? '';
    const conf = (g.get('confirmPassword')?.value as string) ?? '';
    if (!conf.length) {
      return null;
    }
    if (neu !== conf) {
      return { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-change-password-dialog',
  templateUrl: './change-password-dialog.component.html',
  styleUrls: ['./change-password-dialog.component.scss']
})
export class ChangePasswordDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  saving = false;
  serverError: string | null = null;

  readonly form = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    },
    {
      validators: [newPasswordDifferentFromCurrent(), confirmMatchesNew()]
    }
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ChangePasswordDialogComponent, boolean>,
    private readonly userService: UserService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
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
    const v = this.form.getRawValue();
    const currentPassword = v.currentPassword ?? '';
    const newPassword = v.newPassword ?? '';
    this.saving = true;
    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Mot de passe mis à jour.', 'Fermer', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Impossible de mettre à jour le mot de passe.';
        this.serverError = typeof msg === 'string' ? msg : 'Impossible de mettre à jour le mot de passe.';
      }
    });
  }
}
