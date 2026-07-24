import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  activationSuccessMessage: string | null = null;
  loginErrorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    this.route.queryParamMap.subscribe((params) => {
      this.activationSuccessMessage = params.get('activated') === 'success'
        ? 'Compte activé avec succès. Vous pouvez maintenant vous connecter.'
        : null;
    });
  }

  ngOnInit(): void {
    if (this.authService.isAccessTokenValid()) {
      this.router.navigate(this.authService.getPostLoginCommands());
      return;
    }
    const refresh = this.authService.getRefreshToken();
    if (!refresh) {
      return;
    }
    // Renouvellement silencieux : ne pas rediriger (conserve l’URL courante au rechargement).
    this.authService.refreshToken().subscribe({
      error: () => this.authService.clearTokens()
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      if (this.authService.isAccessTokenValid()) {
        this.router.navigate(this.authService.getPostLoginCommands());
        return;
      }
      this.loginErrorMessage = null;
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          console.log('Login successful', res);
          this.authService.saveTokens(res.bearer, res.refresh);
          this.router.navigate(this.authService.getPostLoginCommands());
        },
        error: (err: HttpErrorResponse) => {
          this.loginErrorMessage = this.resolveLoginErrorMessage(err);
        }
      });
    }
  }

  private resolveLoginErrorMessage(err: HttpErrorResponse): string {
    const fromBody = this.extractErrorText(err.error);
    if (fromBody.length > 0) {
      return fromBody;
    }
    if (err.status === 401) {
      return 'Identifiants incorrects.';
    }
    if (err.status === 403) {
      return 'Accès refusé. Vérifiez l’activation du compte ou vos droits.';
    }
    return 'Connexion impossible pour le moment. Vérifiez votre connexion et réessayez.';
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
    const candidates = [
      o['detail'],
      o['message'],
      o['error_description'],
      typeof o['error'] === 'string' ? o['error'] : undefined
    ];
    for (const c of candidates) {
      if (typeof c === 'string') {
        const t = c.trim();
        if (
          t.length > 0 &&
          t !== 'Unauthorized' &&
          t !== 'Forbidden' &&
          t !== 'Bad Request'
        ) {
          return t;
        }
      }
    }
    const errors = o['errors'];
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, unknown>).flat()[0];
      if (typeof first === 'string' && first.trim().length > 0) {
        return first.trim();
      }
    }
    return '';
  }
}
