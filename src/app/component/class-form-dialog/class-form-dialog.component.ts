import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolClassService } from '../../service/school-class.service';
import { SchoolYearDto } from '../../models/academic.models';
import type { ClassLevelGroupOption } from '../school-classes-page/school-classes-page.component';

export interface ClassFormDialogData {
  schoolId: number;
  activeYear: SchoolYearDto;
  levelGroups: ClassLevelGroupOption[];
}

@Component({
  selector: 'app-class-form-dialog',
  templateUrl: './class-form-dialog.component.html',
  styleUrls: ['./class-form-dialog.component.scss']
})
export class ClassFormDialogComponent {
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

  get levelGroups(): ClassLevelGroupOption[] {
    return this.data.levelGroups ?? [];
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
    const periodType = this.form.value.periodType ?? 'TRIMESTER';

    this.saving = true;
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
