import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { Router } from '@angular/router';
import { AppRoles } from '../../core/app-roles';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          console.log('Login successful', res);
          this.authService.saveTokens(res.bearer, res.refresh);
          const role = localStorage.getItem('role');
          if (role === AppRoles.ADMIN_ECOLE) {
            this.router.navigate(['/admin']);
            return;
          }
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Login failed', err)
      });
    }
  }
}
