import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolClassService } from '../../service/school-class.service';
import { SchoolClassDto, SchoolYearDto } from '../../models/academic.models';
import type { ClassLevelGroupOption } from '../school-classes-page/school-classes-page.component';

export interface ClassFormDialogData {
  mode?: 'create' | 'edit';
  schoolId: number;
  activeYear: SchoolYearDto;
  levelGroups: ClassLevelGroupOption[];
  schoolClass?: SchoolClassDto;
}

@Component({
  selector: 'app-class-form-dialog',
  templateUrl: './class-form-dialog.component.html',
  styleUrls: ['./class-form-dialog.component.scss']
})
export class ClassFormDialogComponent implements OnInit {
  saving = false;

  readonly form = this.fb.group({
    levelId: [null as number | null, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(50)]],
    capacity: [40, [Validators.required, Validators.min(1), Validators.max(200)]],
    periodType: ['TRIMESTER' as 'TRIMESTER' | 'SEMESTER', Validators.required]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClassFormDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ClassFormDialogData,
    private readonly schoolClassService: SchoolClassService,
    private readonly snackBar: MatSnackBar
  ) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get levelGroups(): ClassLevelGroupOption[] {
    return this.data.levelGroups ?? [];
  }

  get minCapacity(): number {
    if (!this.isEdit) {
      return 1;
    }
    return Math.max(1, this.data.schoolClass?.enrolledStudentCount ?? 0);
  }

  ngOnInit(): void {
    if (this.isEdit && this.data.schoolClass) {
      const enrolled = this.data.schoolClass.enrolledStudentCount ?? 0;
      const capacity = this.data.schoolClass.capacity ?? 40;
      this.form.reset({
        levelId: this.data.schoolClass.level?.id ?? null,
        name: this.data.schoolClass.name ?? '',
        capacity: Math.max(capacity, enrolled || 1),
        periodType: this.data.schoolClass.periodType === 'SEMESTER' ? 'SEMESTER' : 'TRIMESTER'
      });
      this.form.controls.capacity.setValidators([
        Validators.required,
        Validators.min(this.minCapacity),
        Validators.max(200)
      ]);
      this.form.controls.capacity.updateValueAndValidity();
      this.form.controls.periodType.clearValidators();
      this.form.controls.periodType.updateValueAndValidity();
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
    const name = (this.form.value.name ?? '').trim();
    const levelId = this.form.value.levelId;
    const capacity = Number(this.form.value.capacity);
    if (!name || levelId == null) {
      return;
    }

    this.saving = true;

    if (this.isEdit && this.data.schoolClass) {
      this.schoolClassService
        .update(this.data.schoolClass.id, {
          name,
          levelId,
          capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : this.minCapacity
        })
        .subscribe({
          next: () => {
            this.saving = false;
            this.snackBar.open('Classe mise à jour.', 'Fermer', { duration: 3500 });
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.saving = false;
            const msg =
              err?.error?.message ||
              err?.error?.detail ||
              'Mise à jour impossible (nom ou niveau déjà utilisé ?).';
            this.snackBar.open(msg, 'Fermer', { duration: 5000 });
          }
        });
      return;
    }

    const periodType = this.form.value.periodType ?? 'TRIMESTER';
    this.schoolClassService
      .create({
        name,
        year: { id: this.data.activeYear.id },
        level: { id: levelId },
        capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 40,
        periodType: periodType === 'SEMESTER' ? 'SEMESTER' : 'TRIMESTER'
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Classe ouverte avec succès.', 'Fermer', { duration: 3500 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Création impossible (nom ou niveau déjà utilisé ?).', 'Fermer', {
            duration: 5000
          });
        }
      });
  }
}
