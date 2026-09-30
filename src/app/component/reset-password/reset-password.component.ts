import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  form: FormGroup;
  submitError: string | null = null;
  successMessage: string | null = null;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    this.submitError = null;
    this.successMessage = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.authService.resetPassword(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage =
          'Un e-mail de réinitialisation a été envoyé. Consultez votre boîte de réception (et les indésirables).';
        this.form.reset();
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
      return "Aucun compte n'est associé à cette adresse e-mail.";
    }
    if (err.status === 503) {
      return "Impossible d'envoyer l'e-mail pour le moment. Réessayez plus tard.";
    }
    return 'Demande impossible pour le moment. Vérifiez votre connexion et réessayez.';
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
