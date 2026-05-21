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
      schoolAddress: ['', Validators.required],
      schoolContact: ['', Validators.required]
    });

    this.adminForm = this.fb.group({
      adminFirstName: ['', Validators.required],
      adminLastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
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

    const adminFirstName = (adminValues.adminFirstName ?? '').trim();
    const adminLastName = (adminValues.adminLastName ?? '').trim();

    this.authService
      .registerSchoolAdmin({
        username: adminValues.email,
        adminFirstName,
        adminLastName,
        email: adminValues.email,
        tenantName: tenantLabel,
        schoolName: establishmentName,
        schoolAddress: (schoolValues.schoolAddress ?? '').trim(),
        tenantLogo: '',
        schoolContact: (schoolValues.schoolContact ?? '').trim()
      })
      .subscribe({
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
