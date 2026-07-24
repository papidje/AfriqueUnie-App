import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectService } from '../../service/subject.service';

export interface SubjectFormDialogData {
  mode: 'add' | 'edit';
  schoolId: number;
  subject?: SchoolSubject;
}

@Component({
  selector: 'app-subject-form-dialog',
  templateUrl: './subject-form-dialog.component.html',
  styleUrls: ['./subject-form-dialog.component.scss']
})
export class SubjectFormDialogComponent implements OnInit {
  saving = false;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SubjectFormDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: SubjectFormDialogData,
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar
  ) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.subject) {
      this.form.reset({ code: this.data.subject.code, name: this.data.subject.name });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = { code: v.code!.trim(), name: v.name!.trim() };
    this.saving = true;

    if (this.isEdit && this.data.subject) {
      this.subjectService.update(this.data.schoolId, this.data.subject.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Matière mise à jour.', 'Fermer', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Mise à jour impossible.', 'Fermer', { duration: 5000 });
        }
      });
      return;
    }

    this.subjectService.create(this.data.schoolId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Matière créée.', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Création impossible (code déjà utilisé ?).', 'Fermer', { duration: 5000 });
      }
    });
  }
}
