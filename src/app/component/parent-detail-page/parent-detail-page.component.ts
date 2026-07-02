import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ParentApiService } from '../../service/parent-api.service';
import { BackNavigationService } from '../../core/back-navigation.service';
import {
  compactGuineaPhone,
  emailControlError,
  guineaPhoneValidator,
  optionalEmailValidator,
  phoneControlError
} from '../../util/guinea-contact.validators';

@Component({
  selector: 'app-parent-detail-page',
  templateUrl: './parent-detail-page.component.html',
  styleUrls: ['./parent-detail-page.component.scss']
})
export class ParentDetailPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = true;
  saving = false;
  parentId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    phone: ['', [Validators.required, guineaPhoneValidator()]],
    email: ['', optionalEmailValidator()],
    profession: [''],
    address: ['']
  });

  readonly phoneControlError = phoneControlError;
  readonly emailControlError = emailControlError;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly parentApi: ParentApiService,
    private readonly snackBar: MatSnackBar,
    private readonly backNav: BackNavigationService
  ) {}

  goBack(): void {
    this.backNav.goBackInHistory();
  }

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('parentId');
    const id = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      this.snackBar.open('Identifiant parent invalide.', 'Fermer', { duration: 4000 });
      void this.router.navigate(['/students']);
      return;
    }
    this.parentId = id;
    this.parentApi
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => {
          this.form.patchValue({
            lastName: p.lastName,
            firstName: p.firstName,
            phone: p.phone,
            email: p.email ?? '',
            profession: p.profession ?? '',
            address: p.address ?? ''
          });
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Parent introuvable ou accès refusé.', 'Fermer', { duration: 5000 });
          void this.router.navigate(['/students']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  save(): void {
    if (this.form.invalid || this.parentId == null) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving = true;
    this.parentApi
      .update(this.parentId, {
        lastName: v.lastName.trim(),
        firstName: v.firstName.trim(),
        phone: compactGuineaPhone(v.phone),
        email: v.email.trim() ? v.email.trim() : null,
        profession: v.profession.trim() ? v.profession.trim() : null,
        address: v.address.trim() ? v.address.trim() : null
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.saving = false;
          this.form.patchValue({
            lastName: updated.lastName,
            firstName: updated.firstName,
            phone: updated.phone,
            email: updated.email ?? '',
            profession: updated.profession ?? '',
            address: updated.address ?? ''
          });
          this.snackBar.open('Fiche parent enregistrée.', 'Fermer', { duration: 3000 });
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving = false;
          this.snackBar.open(err?.error?.message || 'Enregistrement impossible.', 'Fermer', {
            duration: 6000
          });
        }
      });
  }
}
