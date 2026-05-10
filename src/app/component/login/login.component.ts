import { Component, OnInit } from '@angular/core';
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
    this.authService.refreshToken().subscribe({
      next: () => this.router.navigate(this.authService.getPostLoginCommands()),
      error: () => this.authService.clearTokens()
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          console.log('Login successful', res);
          this.authService.saveTokens(res.bearer, res.refresh);
          this.router.navigate(this.authService.getPostLoginCommands());
        },
        error: (err) => console.error('Login failed', err)
      });
    }
  }
}
