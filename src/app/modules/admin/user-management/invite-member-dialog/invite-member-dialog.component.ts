import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { UserRoleName, UserRoleNameType } from '../../../../core/app-roles';

export interface InviteMemberDialogResult {
  fullname: string;
  email: string;
  role: UserRoleNameType;
}

@Component({
  selector: 'app-invite-member-dialog',
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.scss']
})
export class InviteMemberDialogComponent {
  readonly roles = [UserRoleName.ADMIN_ECOLE, UserRoleName.STAFF, UserRoleName.TEACHER];

  readonly form = this.fb.group({
    fullname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRoleName.STAFF as UserRoleNameType, Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    protected readonly dialogRef: MatDialogRef<InviteMemberDialogComponent>
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      fullname: (v.fullname || '').trim(),
      email: (v.email || '').trim().toLowerCase(),
      role: v.role as UserRoleNameType
    } satisfies InviteMemberDialogResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
