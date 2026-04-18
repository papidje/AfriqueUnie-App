import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserRoleName, UserRoleNameType } from '../../../../core/app-roles';
import { School } from '../../school/school-list/school-list.component';
import { SchoolService } from '../../school/school.service';

export interface InviteMemberDialogResult {
  fullname: string;
  email: string;
  role: UserRoleNameType;
  /** Obligatoire pour tout rôle sauf ADMIN_ECOLE (hors mode directeur, où l’école est imposée côté serveur). */
  schoolId?: number | null;
}

@Component({
  selector: 'app-invite-member-dialog',
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.scss']
})
export class InviteMemberDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly UserRoleName = UserRoleName;
  readonly directorMode: boolean;

  schools: School[] = [];
  loadingSchools = false;

  readonly form = this.fb.group({
    fullname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRoleName.STAFF as UserRoleNameType, Validators.required],
    schoolId: [null as number | null]
  });

  constructor(
    private readonly fb: FormBuilder,
    protected readonly dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    private readonly schoolService: SchoolService,
    @Optional() @Inject(MAT_DIALOG_DATA) dialogData: { directorMode?: boolean } | null
  ) {
    this.directorMode = !!dialogData?.directorMode;
  }

  get roleOptions(): UserRoleNameType[] {
    if (this.directorMode) {
      return [UserRoleName.TEACHER, UserRoleName.ACCOUNTANT];
    }
    return [
      UserRoleName.ADMIN_ECOLE,
      UserRoleName.DIRECTOR,
      UserRoleName.STAFF,
      UserRoleName.TEACHER
    ];
  }

  /** Afficher le sélecteur d’établissement : tout rôle sauf ADMIN_ECOLE (et pas en mode directeur). */
  get showSchoolField(): boolean {
    if (this.directorMode) {
      return false;
    }
    const r = this.form.get('role')?.value as UserRoleNameType | undefined;
    return r != null && r !== UserRoleName.ADMIN_ECOLE;
  }

  ngOnInit(): void {
    if (this.directorMode) {
      this.form.patchValue({ role: UserRoleName.TEACHER });
    } else {
      this.loadingSchools = true;
      this.schoolService
        .getAll()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (list) => {
            this.schools = list || [];
            this.loadingSchools = false;
          },
          error: () => {
            this.schools = [];
            this.loadingSchools = false;
          }
        });
    }

    this.form
      .get('role')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((r) => this.applySchoolValidators(r as UserRoleNameType | null));

    this.applySchoolValidators(this.form.get('role')?.value as UserRoleNameType | null);
  }

  private applySchoolValidators(role: UserRoleNameType | null | undefined): void {
    const ctrl = this.form.get('schoolId');
    if (this.directorMode || role === UserRoleName.ADMIN_ECOLE || role == null) {
      ctrl?.clearValidators();
      ctrl?.setValue(null);
    } else {
      ctrl?.setValidators([Validators.required]);
    }
    ctrl?.updateValueAndValidity({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const role = v.role as UserRoleNameType;
    const out: InviteMemberDialogResult = {
      fullname: (v.fullname || '').trim(),
      email: (v.email || '').trim().toLowerCase(),
      role,
      schoolId:
        this.directorMode || role === UserRoleName.ADMIN_ECOLE ? undefined : (v.schoolId as number | null)
    };
    this.dialogRef.close(out);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
