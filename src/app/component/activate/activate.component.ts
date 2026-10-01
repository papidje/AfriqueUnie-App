import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-activate',
  templateUrl: './activate.component.html',
  styleUrls: ['./activate.component.scss']
})
export class ActivateComponent implements OnInit {
  activateForm: FormGroup;
  submitError: string | null = null;
  showResetHint = false;
  submitting = false;
  /** Affiché après inscription école : invite à consulter la boîte mail. */
  showMailDisclaimer = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.activateForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      activationCode: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: [this.passwordsMatchValidator]
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.showMailDisclaimer = params.get('registered') === '1';
      const email = (params.get('email') ?? '').trim();
      const code = (params.get('code') ?? '').trim();
      const patch: { email?: string; activationCode?: string } = {};
      if (email) {
        patch.email = email;
      }
      if (code) {
        patch.activationCode = code;
      }
      if (Object.keys(patch).length > 0) {
        this.activateForm.patchValue(patch);
      }
    });
  }

  private readonly passwordsMatchValidator = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  onSubmit() {
    this.submitError = null;
    this.showResetHint = false;
    if (this.activateForm.invalid) {
      this.activateForm.markAllAsTouched();
      return;
    }
    const { email, activationCode, newPassword } = this.activateForm.getRawValue();
    this.submitting = true;
    this.authService
      .activate({ email, activationCode, newPassword })
      .pipe(
        switchMap((res) => {
          if (res?.bearer && res?.refresh) {
            return of(res);
          }
          return this.authService.login({ userName: email, password: newPassword });
        })
      )
      .subscribe({
        next: (res) => {
          this.authService.saveTokens(res.bearer, res.refresh);
          this.submitting = false;
          this.authService.navigateAfterLogin(this.router);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.submitError = this.resolveErrorMessage(err);
          const lower = this.submitError.toLowerCase();
          this.showResetHint =
            err.status === 400 ||
            err.status === 404 ||
            lower.includes('expir') ||
            lower.includes('invalide');
        }
      });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    const fromBody = this.extractErrorText(err.error);
    if (fromBody.length > 0) {
      return fromBody;
    }
    return "Activation impossible. Vérifiez l'email, le code et le mot de passe.";
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
