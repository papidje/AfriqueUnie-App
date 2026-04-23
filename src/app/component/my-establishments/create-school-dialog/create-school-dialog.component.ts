import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolService } from '../../../modules/admin/school/school.service';

@Component({
  selector: 'app-create-school-dialog',
  templateUrl: './create-school-dialog.component.html',
  styleUrls: ['./create-school-dialog.component.scss']
})
export class CreateSchoolDialogComponent {
  readonly form = this.fb.group({
    name: ['', Validators.required],
    adress: ['', Validators.required],
    contact: ['', Validators.required],
    openDate: ['', Validators.required]
  });

  saving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CreateSchoolDialogComponent, boolean>,
    private readonly schoolService: SchoolService,
    private readonly snackBar: MatSnackBar
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    this.schoolService
      .create({
        name: (v.name || '').trim(),
        adress: (v.adress || '').trim(),
        contact: (v.contact || '').trim(),
        openDate: v.openDate || ''
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('École créée. Activez-la depuis la fiche si besoin.', 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Impossible de créer l’établissement.', 'Fermer', { duration: 5000 });
        }
      });
  }
}
