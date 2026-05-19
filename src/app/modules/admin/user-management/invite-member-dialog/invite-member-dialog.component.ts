import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserRoleName, UserRoleNameType } from '../../../../core/app-roles';
import { formatRoleLabel } from '../../../../core/role-labels';
import { School } from '../../school/school-list/school-list.component';
import { SchoolService } from '../../school/school.service';

/** Profil d’invitation côté fondateur (hors enseignant/personnel par lignes). */
export type FounderInviteProfile =
  | typeof UserRoleName.ADMIN_ECOLE
  | typeof UserRoleName.DIRECTOR
  | 'MEMBER_BY_SCHOOLS';

export interface InviteMemberDialogResult {
  fullname: string;
  email: string;
  role: UserRoleNameType;
  /** Ancien flux ou directeur invité par le fondateur (une école). */
  schoolId?: number | null;
  /** Rattachements multiples (fondateur → enseignant / personnel). */
  schoolAssignments?: { schoolId: number; role: UserRoleNameType }[];
}

@Component({
  selector: 'app-invite-member-dialog',
  templateUrl: './invite-member-dialog.component.html',
  styleUrls: ['./invite-member-dialog.component.scss']
})
export class InviteMemberDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly UserRoleName = UserRoleName;
  readonly formatRoleLabel = formatRoleLabel;
  readonly assignmentRoleOptions: UserRoleNameType[] = [UserRoleName.TEACHER, UserRoleName.STAFF];
  readonly directorMode: boolean;

  readonly founderProfileOptions: FounderInviteProfile[] = [
    UserRoleName.ADMIN_ECOLE,
    UserRoleName.DIRECTOR,
    'MEMBER_BY_SCHOOLS'
  ];

  schools: School[] = [];
  loadingSchools = false;

  readonly form = this.fb.group({
    fullname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    /** Fondateur uniquement : type de profil invité. */
    founderProfile: ['MEMBER_BY_SCHOOLS' as FounderInviteProfile, Validators.required],
    /** Mode directeur invitant : enseignant ou personnel sur son établissement. */
    directorInviteRole: [UserRoleName.TEACHER as UserRoleNameType, Validators.required],
    schoolId: [null as number | null],
    assignments: this.fb.array([])
  });

  constructor(
    private readonly fb: FormBuilder,
    protected readonly dialogRef: MatDialogRef<InviteMemberDialogComponent>,
    private readonly schoolService: SchoolService,
    @Optional() @Inject(MAT_DIALOG_DATA) dialogData: { directorMode?: boolean } | null
  ) {
    this.directorMode = !!dialogData?.directorMode;
  }

  get assignments(): FormArray {
    return this.form.get('assignments') as FormArray;
  }

  founderProfileLabel(value: FounderInviteProfile): string {
    if (value === 'MEMBER_BY_SCHOOLS') {
      return 'Enseignant ou personnel par établissement(s)';
    }
    return formatRoleLabel(value);
  }

  /** Fondateur : une école pour un directeur. */
  get showSingleSchoolSelect(): boolean {
    if (this.directorMode) {
      return false;
    }
    return this.form.get('founderProfile')?.value === UserRoleName.DIRECTOR;
  }

  /** Fondateur : rattachements multi-écoles (rôle défini par ligne uniquement). */
  get showAssignmentsBlock(): boolean {
    if (this.directorMode) {
      return false;
    }
    return this.form.get('founderProfile')?.value === 'MEMBER_BY_SCHOOLS';
  }

  ngOnInit(): void {
    if (this.directorMode) {
      this.form.patchValue({ directorInviteRole: UserRoleName.TEACHER });
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
      .get('founderProfile')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((p) => this.applyFounderProfileUi(p as FounderInviteProfile | null));

    this.applyFounderProfileUi(this.form.get('founderProfile')?.value as FounderInviteProfile | null);
  }

  private createAssignmentGroup(): FormGroup {
    return this.fb.group({
      schoolId: [null as number | null, Validators.required],
      role: [UserRoleName.STAFF as UserRoleNameType, Validators.required]
    });
  }

  addAssignmentRow(): void {
    this.assignments.push(this.createAssignmentGroup());
  }

  removeAssignmentRow(index: number): void {
    if (this.assignments.length > 1) {
      this.assignments.removeAt(index);
    }
  }

  private applyFounderProfileUi(profile: FounderInviteProfile | null | undefined): void {
    if (this.directorMode || profile == null) {
      return;
    }
    const schoolCtrl = this.form.get('schoolId');
    const arr = this.assignments;
    if (profile === UserRoleName.ADMIN_ECOLE) {
      schoolCtrl?.clearValidators();
      schoolCtrl?.setValue(null);
      while (arr.length) {
        arr.removeAt(0);
      }
    } else if (profile === UserRoleName.DIRECTOR) {
      schoolCtrl?.setValidators([Validators.required]);
      while (arr.length) {
        arr.removeAt(0);
      }
    } else if (profile === 'MEMBER_BY_SCHOOLS') {
      schoolCtrl?.clearValidators();
      schoolCtrl?.setValue(null);
      if (arr.length === 0) {
        this.addAssignmentRow();
      }
    }
    schoolCtrl?.updateValueAndValidity({ emitEvent: false });
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

    let schoolAssignments: { schoolId: number; role: UserRoleNameType }[] | undefined;
    let schoolId: number | null | undefined;
    let role: UserRoleNameType;

    if (this.directorMode) {
      role = v.directorInviteRole as UserRoleNameType;
      schoolAssignments = undefined;
      schoolId = undefined;
    } else {
      const profile = v.founderProfile as FounderInviteProfile;
      if (profile === UserRoleName.ADMIN_ECOLE) {
        role = UserRoleName.ADMIN_ECOLE;
        schoolAssignments = undefined;
        schoolId = undefined;
      } else if (profile === UserRoleName.DIRECTOR) {
        schoolId = v.schoolId as number | null;
        if (schoolId == null) {
          this.form.markAllAsTouched();
          return;
        }
        role = UserRoleName.DIRECTOR;
        schoolAssignments = [{ schoolId, role: UserRoleName.DIRECTOR }];
        schoolId = undefined;
      } else {
        const rows = this.assignments.value as { schoolId: number | null; role: UserRoleNameType | null }[];
        schoolAssignments = rows
          .filter((r) => r.schoolId != null && r.role != null)
          .map((r) => ({ schoolId: r.schoolId as number, role: r.role as UserRoleNameType }));
        if (schoolAssignments.length === 0) {
          this.form.markAllAsTouched();
          return;
        }
        role = schoolAssignments[0].role;
        schoolId = undefined;
      }
    }

    const out: InviteMemberDialogResult = {
      fullname: (v.fullname || '').trim(),
      email: (v.email || '').trim().toLowerCase(),
      role,
      schoolId,
      schoolAssignments
    };
    this.dialogRef.close(out);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
