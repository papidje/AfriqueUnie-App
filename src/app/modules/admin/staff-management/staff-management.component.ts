import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../service/user.service';
import { AuthUtilsService } from '../../../service/auth-utils.service';
import { UserRoleName } from '../../../core/app-roles';

interface StaffUser {
  id: number;
  fullname: string;
  email: string;
  username: string;
  roles: string[];
}

@Component({
  selector: 'app-staff-management',
  templateUrl: './staff-management.component.html',
  styleUrls: ['./staff-management.component.scss']
})
export class StaffManagementComponent implements OnInit {
  staffForm: FormGroup;
  staffUsers: StaffUser[] = [];
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly authUtils: AuthUtilsService
  ) {
    this.staffForm = this.fb.group({
      fullname: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.staffUsers = users.filter((u) => (u.roles || []).includes(UserRoleName.STAFF));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  createStaff(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const tenantId = this.authUtils.getTenantId();
    this.userService.createStaff({
      ...this.staffForm.value,
      schoolId: tenantId
    }).subscribe({
      next: () => {
        this.staffForm.reset();
        this.loadStaff();
      }
    });
  }
}
