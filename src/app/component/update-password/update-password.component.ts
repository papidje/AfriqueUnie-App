import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.scss']
})
export class UpdatePasswordComponent implements OnInit {
  form: FormGroup;
  submitError: string | null = null;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        code: ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: [this.passwordsMatchValidator] }
    );
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const email = (params.get('email') ?? '').trim();
      const code = (params.get('code') ?? '').trim();
      const patch: { email?: string; code?: string } = {};
      if (email) {
        patch.email = email;
      }
      if (code) {
        patch.code = code;
      }
      if (Object.keys(patch).length > 0) {
        this.form.patchValue(patch);
      }
    });
  }

  private readonly passwordsMatchValidator = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  onSubmit() {
    this.submitError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, code, password } = this.form.getRawValue();
    this.submitting = true;
    this.authService.newPassword({ email, code, password }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        this.submitError = this.resolveErrorMessage(err);
      }
    });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    const fromBody = this.extractErrorText(err.error);
    if (fromBody.length > 0) {
      return fromBody;
    }
    if (err.status === 404) {
      return 'Code de vérification invalide.';
    }
    if (err.status === 400) {
      return 'Code expiré ou données invalides.';
    }
    return 'Mise à jour impossible pour le moment. Réessayez.';
  }

  private extractErrorText(body: unknown): string {
    if (body == null) {
      return '';
    }
    if (typeof body === 'string') {
      const t = body.trim();
      if (!t || t.startsWith('<')) {
        return '';
      }
      return t;
    }
    if (typeof body !== 'object') {
      return '';
    }
    const o = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error_description', 'error']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim() && !v.trim().startsWith('<')) {
        return v.trim();
      }
    }
    return '';
  }
}
