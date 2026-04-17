import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import {AuthService} from "../../service/auth.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-activate',
  templateUrl: './activate.component.html',
  styleUrls: ['./activate.component.scss']
})
export class ActivateComponent {
  activateForm: FormGroup;
  submitError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
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
    if (this.activateForm.invalid) {
      this.activateForm.markAllAsTouched();
      return;
    }
    const { email, activationCode, newPassword } = this.activateForm.getRawValue();
    this.authService.activate({ email, activationCode, newPassword }).subscribe({
      next: () => {
        this.router.navigate(['/login'], {
          queryParams: { activated: 'success' }
        });
      },
      error: () => {
        this.submitError = "Activation impossible. Vérifiez l'email, le code et le mot de passe.";
      }
    });
  }
}
