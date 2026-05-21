import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../service/auth.service';
import { UserService } from '../../../service/user.service';
import { UserProfile } from '../profile.models';

export interface EditProfileDialogData {
  user: UserProfile;
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
    gender: [''],
    firstName: ['', [Validators.maxLength(255)]],
    lastName: ['', [Validators.required, Validators.maxLength(255)]],
    birthDate: [null as Date | null],
    phone: ['', [Validators.maxLength(100)]],
    biography: ['', [Validators.maxLength(12000)]]
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
    const p = this.data?.user;
    if (p) {
      const genderUi = p.gender === 'MALE' || p.gender === 'FEMALE' ? p.gender : '';
      this.form.patchValue({
        gender: genderUi,
        firstName: p.firstName ?? '',
        lastName: (p.lastName ?? '').trim() || (p.fullname ?? '').trim(),
        birthDate: this.parseIsoDateToLocalDate(p.birthDate),
        phone: p.phone ?? '',
        biography: p.biography ?? ''
      });
    }
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
    const rawGender = (this.form.get('gender')?.value as string) ?? '';
    const gender =
      rawGender === 'MALE' || rawGender === 'FEMALE' ? (rawGender as 'MALE' | 'FEMALE') : null;

    const lastName = ((this.form.get('lastName')?.value as string) ?? '').trim();
    const firstNameRaw = ((this.form.get('firstName')?.value as string) ?? '').trim();
    const phoneRaw = ((this.form.get('phone')?.value as string) ?? '').trim();
    const biographyRaw = ((this.form.get('biography')?.value as string) ?? '').trim();
    const birth = this.form.get('birthDate')?.value as Date | null;

    this.saving = true;
    this.userService
      .updateOwnProfile({
        fullname: null,
        firstName: firstNameRaw.length ? firstNameRaw : null,
        lastName: lastName.length ? lastName : null,
        birthDate: birth ? this.formatLocalDateForApi(birth) : null,
        gender,
        phone: phoneRaw.length ? phoneRaw : null,
        biography: biographyRaw.length ? biographyRaw : null
      })
      .pipe(switchMap(() => this.authService.refreshToken()))
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Profil enregistré.', 'Fermer', { duration: 3500 });
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

  private parseIsoDateToLocalDate(iso: string | null): Date | null {
    if (!iso) {
      return null;
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) {
      return null;
    }
    const y = +m[1];
    const mo = +m[2] - 1;
    const d = +m[3];
    return new Date(y, mo, d);
  }

  private formatLocalDateForApi(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }
}
