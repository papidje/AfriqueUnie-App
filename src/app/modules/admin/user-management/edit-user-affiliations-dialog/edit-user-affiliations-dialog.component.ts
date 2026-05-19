import { Component, ChangeDetectorRef, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { UserRoleName, UserRoleNameType } from '../../../../core/app-roles';
import { formatRoleLabel } from '../../../../core/role-labels';
import { UserService } from '../../../../service/user.service';
import { School } from '../../school/school-list/school-list.component';
import { SchoolService } from '../../school/school.service';
import { UserAffiliationVm } from '../user-affiliations.models';

export interface EditUserAffiliationsDialogData {
  userId: number;
  fullname: string;
  primaryRole: UserRoleNameType;
  affiliations: UserAffiliationVm[];
  /** Faux pour le staff du directeur : pas de suspension réseau. */
  canSuspendAffiliations?: boolean;
}

interface SchoolAccessRowVm {
  schoolId: number;
  schoolName: string;
  hasActive: boolean;
  canReactivate: boolean;
  invitationOnly: boolean;
}

@Component({
  selector: 'app-edit-user-affiliations-dialog',
  templateUrl: './edit-user-affiliations-dialog.component.html',
  styleUrls: ['./edit-user-affiliations-dialog.component.scss']
})
export class EditUserAffiliationsDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly UserRoleName = UserRoleName;
  readonly formatRoleLabel = formatRoleLabel;
  readonly assignmentRoleOptions: UserRoleNameType[] = [UserRoleName.TEACHER, UserRoleName.STAFF];

  schools: School[] = [];
  loadingSchools = false;
  saving = false;
  busySchoolId: number | null = null;

  /** Résolu une fois à l’ouverture — évite un *ngFor sur un getter qui recrée les objets à chaque CD (boutons « morts »). */
  schoolAccessRows: SchoolAccessRowVm[] = [];

  readonly form = this.fb.group({
    schoolId: [null as number | null],
    assignments: this.fb.array([])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<EditUserAffiliationsDialogComponent>,
    private readonly schoolService: SchoolService,
    private readonly userService: UserService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: EditUserAffiliationsDialogData
  ) {}

  get isDirector(): boolean {
    return this.data.primaryRole === UserRoleName.DIRECTOR;
  }

  /** Accès suspendre / réactiver par établissement (fondateur). */
  get canSuspendAffiliations(): boolean {
    return this.data.canSuspendAffiliations === true;
  }

  trackBySchoolId(_index: number, g: SchoolAccessRowVm): number {
    return g.schoolId;
  }

  private buildSchoolAccessRows(): SchoolAccessRowVm[] {
    const aff = this.data.affiliations || [];
    const bySchool = new Map<number, SchoolAccessRowVm>();
    for (const a of aff) {
      let row = bySchool.get(a.schoolId);
      if (!row) {
        row = {
          schoolId: a.schoolId,
          schoolName: a.schoolName?.trim() || `Établissement #${a.schoolId}`,
          hasActive: false,
          canReactivate: false,
          invitationOnly: false
        };
        bySchool.set(a.schoolId, row);
      }
      if (a.active === true) {
        row.hasActive = true;
      } else if (a.active !== false && !a.invitationPending && !a.reactivationEligible) {
        /* Ancienne réponse sans booléens : membre affiché comme actif dans l’annuaire */
        row.hasActive = true;
      }
      if (a.reactivationEligible) {
        row.canReactivate = true;
      }
      if (a.invitationPending) {
        row.invitationOnly = true;
      }
    }
    return Array.from(bySchool.values())
      .map((r) => ({
        ...r,
        invitationOnly: !!(r.invitationOnly && !r.hasActive && !r.canReactivate)
      }))
      .sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'fr'));
  }

  get assignments(): FormArray {
    return this.form.get('assignments') as FormArray;
  }

  ngOnInit(): void {
    this.schoolAccessRows = this.buildSchoolAccessRows();

    this.loadingSchools = true;
    this.schoolService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.schools = list || [];
          this.loadingSchools = false;
          this.prefill();
        },
        error: () => {
          this.schools = [];
          this.loadingSchools = false;
          this.prefill();
        }
      });
  }

  private prefill(): void {
    if (this.isDirector) {
      const first = this.data.affiliations[0];
      this.form.patchValue({
        schoolId: first?.schoolId ?? null
      });
      this.form.get('schoolId')?.setValidators([Validators.required]);
      this.form.get('schoolId')?.updateValueAndValidity({ emitEvent: false });
      return;
    }
    while (this.assignments.length) {
      this.assignments.removeAt(0);
    }
    const rows = this.data.affiliations?.length ? this.data.affiliations : [];
    if (rows.length) {
      for (const a of rows) {
        const role = this.normalizeRole(a.role) as UserRoleNameType;
        const row = this.fb.group({
          schoolId: [a.schoolId, Validators.required],
          role: [
            role === UserRoleName.TEACHER || role === UserRoleName.STAFF
              ? role
              : UserRoleName.STAFF,
            Validators.required
          ]
        });
        this.assignments.push(row);
      }
    } else {
      this.addAssignmentRow();
    }
  }

  private normalizeRole(raw: string): string {
    return raw.replace(/^ROLE_/, '');
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  suspendAtSchool(rawSchoolId: number): void {
    const schoolId = Number(rawSchoolId);
    if (!Number.isFinite(schoolId)) {
      return;
    }
    /* Ne pas utiliser [disabled] sur le bouton : en navigateur les clics traversent alors le bouton (pointer-events: none). */
    if (!this.canSuspendAffiliations || this.busySchoolId != null || this.saving) {
      return;
    }
    this.busySchoolId = schoolId;
    this.cdr.markForCheck();
    this.userService
      .suspendAffiliation(this.data.userId, schoolId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.busySchoolId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Accès suspendu pour cet établissement.', 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          const msg = this.extractHttpErrorMessage(err);
          this.snackBar.open(msg || 'Impossible de suspendre l’accès.', 'Fermer', { duration: 6000 });
        }
      });
  }

  reactivateAtSchool(rawSchoolId: number): void {
    const schoolId = Number(rawSchoolId);
    if (!Number.isFinite(schoolId)) {
      return;
    }
    if (!this.canSuspendAffiliations || this.busySchoolId != null || this.saving) {
      return;
    }
    this.busySchoolId = schoolId;
    this.cdr.markForCheck();
    this.userService
      .reactivateAffiliation(this.data.userId, schoolId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.busySchoolId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Accès réactivé pour cet établissement.', 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          const msg = this.extractHttpErrorMessage(err);
          this.snackBar.open(msg || 'Impossible de réactiver l’accès.', 'Fermer', { duration: 6000 });
        }
      });
  }

  private extractHttpErrorMessage(err: unknown): string | undefined {
    if (!err || typeof err !== 'object' || !('error' in err)) {
      return undefined;
    }
    const payload = (err as { error?: unknown }).error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
    if (payload && typeof payload === 'object') {
      const o = payload as { message?: unknown; detail?: unknown };
      if (typeof o.message === 'string' && o.message.trim()) {
        return o.message.trim();
      }
      if (typeof o.detail === 'string' && o.detail.trim()) {
        return o.detail.trim();
      }
    }
    return undefined;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    let payload: { schoolId: number; role: UserRoleNameType }[];

    if (this.isDirector) {
      const sid = this.form.get('schoolId')?.value as number | null;
      if (sid == null) {
        this.form.markAllAsTouched();
        return;
      }
      payload = [{ schoolId: sid, role: UserRoleName.DIRECTOR }];
    } else {
      const rows = this.assignments.value as { schoolId: number | null; role: UserRoleNameType | null }[];
      payload = rows
        .filter((r) => r.schoolId != null && r.role != null)
        .map((r) => ({ schoolId: r.schoolId as number, role: r.role as UserRoleNameType }));
      if (payload.length === 0) {
        this.form.markAllAsTouched();
        return;
      }
    }

    this.saving = true;
    this.userService.patchUserAffiliations(this.data.userId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Affiliations mises à jour.', 'Fermer', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
        this.dialogRef.close(false);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
