import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-register-school',
  templateUrl: './register-school.component.html',
  styleUrls: ['./register-school.component.scss']
})
export class RegisterSchoolComponent {
  step = 1;
  loading = false;
  errorMessage = '';
  schoolForm: FormGroup;
  adminForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.schoolForm = this.fb.group({
      schoolName: ['', Validators.required],
      tenantName: [''],
      tenantAddress: ['', Validators.required],
      phone: ['', Validators.required]
    });

    this.adminForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  goToStep2(): void {
    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  goBack(): void {
    this.step = 1;
  }

  submit(): void {
    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      this.step = 1;
      return;
    }
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const schoolValues = this.schoolForm.value;
    const adminValues = this.adminForm.value;
    const establishmentName = (schoolValues.schoolName ?? '').trim();
    const tenantLabel = (schoolValues.tenantName ?? '').trim() || establishmentName;

    this.authService.registerSchoolAdmin({
      username: adminValues.email,
      fullname: adminValues.fullname,
      email: adminValues.email,
      password: adminValues.password,
      tenantName: tenantLabel,
      schoolName: establishmentName,
      tenantAddress: `${schoolValues.tenantAddress} | Tel: ${schoolValues.phone}`,
      tenantLogo: ''
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Inscription impossible pour le moment.';
      }
    });
  }
}
