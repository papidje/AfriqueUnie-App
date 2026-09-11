import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { School } from '../school-list/school-list.component';
import { SchoolService } from '../school.service';
import { CityDto, CityService } from '../../../../service/city.service';
import { schoolOpenDateBounds } from '../../../../util/date-input-bounds.util';

@Component({
  selector: 'app-school-dialog',
  templateUrl: './school-dialog.component.html',
  styleUrls: ['./school-dialog.component.scss']
})
export class SchoolDialogComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  cities: CityDto[] = [];
  readonly openDateMin = schoolOpenDateBounds().min;
  readonly openDateMax = schoolOpenDateBounds().max;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SchoolDialogComponent>,
    private schoolService: SchoolService,
    private cityService: CityService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: School | null
  ) {
    this.isEdit = !!data;

    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      adress: [data?.adress || '', Validators.required],
      contact: [data?.contact || '', Validators.required],
      openDate: [data?.openDate || '', Validators.required],
      cityId: [data?.city?.id ?? null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cityService.listActive().subscribe({
      next: (list) => (this.cities = list || []),
      error: () => {
        this.cities = [];
        this.snackBar.open('Impossible de charger les villes.', 'Fermer', { duration: 4000 });
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const payload = {
      name: (v.name || '').trim(),
      adress: (v.adress || '').trim(),
      contact: (v.contact || '').trim(),
      openDate: v.openDate,
      city: { id: v.cityId as number }
    };

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
