import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolService } from '../../../modules/admin/school/school.service';
import { CityDto, CityService } from '../../../service/city.service';
import { schoolOpenDateBounds } from '../../../util/date-input-bounds.util';

@Component({
  selector: 'app-create-school-dialog',
  templateUrl: './create-school-dialog.component.html',
  styleUrls: ['./create-school-dialog.component.scss']
})
export class CreateSchoolDialogComponent implements OnInit {
  readonly form = this.fb.group({
    name: ['', Validators.required],
    adress: ['', Validators.required],
    contact: ['', Validators.required],
    openDate: ['', Validators.required],
    cityId: [null as number | null, Validators.required]
  });

  readonly openDateMin = schoolOpenDateBounds().min;
  readonly openDateMax = schoolOpenDateBounds().max;

  cities: CityDto[] = [];
  saving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CreateSchoolDialogComponent, boolean>,
    private readonly schoolService: SchoolService,
    private readonly cityService: CityService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cityService.listActive().subscribe({
      next: (list) => (this.cities = list || []),
      error: () => {
        this.cities = [];
        this.snackBar.open('Impossible de charger les villes.', 'Fermer', { duration: 4000 });
      }
    });
  }

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
        openDate: v.openDate || '',
        city: { id: v.cityId as number }
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
