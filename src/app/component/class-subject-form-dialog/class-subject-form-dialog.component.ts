import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppRoles } from '../../core/app-roles';
import { ClassSubjectRow, SchoolSubject, TeacherSummary } from '../../models/subject.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { ClassSubjectService } from '../../service/class-subject.service';

export interface ClassSubjectFormDialogData {
  mode: 'add' | 'edit';
  classId: number;
  schoolId: number;
  /** Édition : ligne courante. */
  row?: ClassSubjectRow;
  /** Ajout : matières encore disponibles. */
  catalog?: SchoolSubject[];
}

@Component({
  selector: 'app-class-subject-form-dialog',
  templateUrl: './class-subject-form-dialog.component.html',
  styleUrls: ['./class-subject-form-dialog.component.scss']
})
export class ClassSubjectFormDialogComponent implements OnInit {
  teachers: TeacherSummary[] = [];
  loadingTeachers = true;
  saving = false;

  readonly form = this.fb.group({
    subjectId: [null as number | null],
    coefficient: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    teacherId: [null as number | null]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClassSubjectFormDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ClassSubjectFormDialogData,
    private readonly classSubjectService: ClassSubjectService,
    private readonly snackBar: MatSnackBar,
    private readonly authUtils: AuthUtilsService
  ) {}

  get canEditTeachers(): boolean {
    return this.authUtils.hasAnyRole([AppRoles.SUPER_ADMIN, AppRoles.ADMIN_ECOLE, AppRoles.STAFF, AppRoles.DIRECTOR]);
  }

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.row) {
      this.form.patchValue({
        subjectId: this.data.row.subjectId,
        coefficient: this.data.row.coefficient,
        teacherId: this.data.row.teacherId
      });
      this.form.get('subjectId')?.disable();
    } else {
      this.form.get('subjectId')?.setValidators([Validators.required]);
    }

    this.classSubjectService
      .listTeachersForSchool(this.data.schoolId)
      .pipe(catchError(() => of<TeacherSummary[]>([])))
      .subscribe((list) => {
        this.teachers = list;
        this.loadingTeachers = false;
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const coeff = Number(raw.coefficient);
    if (!Number.isFinite(coeff) || coeff < 1 || coeff > 20) {
      return;
    }

    if (this.isEdit) {
      const row = this.data.row;
      if (!row) {
        return;
      }
      this.saving = true;
      const teacherId = this.canEditTeachers ? (raw.teacherId as number | null) : row.teacherId;
      const tasks = [];
      if (coeff !== row.coefficient) {
        tasks.push(this.classSubjectService.updateCoefficient(row.id, coeff));
      }
      const prevT = row.teacherId ?? null;
      const nextT = teacherId ?? null;
      if (this.canEditTeachers && prevT !== nextT) {
        tasks.push(this.classSubjectService.assignTeacher(row.id, nextT));
      }
      if (!tasks.length) {
        this.saving = false;
        this.dialogRef.close(false);
        return;
      }
      forkJoin(tasks).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Matière mise à jour.', 'Fermer', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Enregistrement impossible.', 'Fermer', { duration: 5000 });
        }
      });
      return;
    }

    const subjectId = raw.subjectId as number | null;
    if (subjectId == null) {
      return;
    }
    this.saving = true;
    const body: { subjectId: number; coefficient: number; teacherId?: number | null } = {
      subjectId,
      coefficient: coeff
    };
    if (this.canEditTeachers) {
      body.teacherId = raw.teacherId as number | null;
    }
    this.classSubjectService.create(this.data.classId, body).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Matière ajoutée à la classe.', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Ajout impossible (déjà affectée ?).', 'Fermer', { duration: 5000 });
      }
    });
  }
}
