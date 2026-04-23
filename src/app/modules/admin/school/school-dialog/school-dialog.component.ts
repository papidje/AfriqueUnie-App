import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { School } from '../school-list/school-list.component';
import {SchoolService} from "../school.service";

@Component({
  selector: 'app-school-dialog',
  templateUrl: './school-dialog.component.html',
  styleUrls: ['./school-dialog.component.scss']
})
export class SchoolDialogComponent {
  form: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SchoolDialogComponent>,
    private schoolService: SchoolService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: School | null
  ) {
    this.isEdit = !!data;

    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      adress: [data?.adress || '', Validators.required],
      contact: [data?.contact || '', Validators.required],
      openDate: [data?.openDate || '', Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const payload = this.form.value;

    const request = this.isEdit
      ? this.schoolService.update(this.data!.id, payload)
      : this.schoolService.create(payload);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          `École ${this.isEdit ? 'mise à jour' : 'créée'} avec succès`,
          'Fermer',
          { duration: 2000 }
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open(`Erreur lors de l’enregistrement`, 'Fermer', { duration: 2000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
