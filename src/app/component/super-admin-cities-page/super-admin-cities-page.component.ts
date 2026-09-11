import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CityDto,
  CityService,
  CityWritePayload,
  RegionDto,
  cityRegionLabel
} from '../../service/city.service';

@Component({
  selector: 'app-super-admin-cities-page',
  templateUrl: './super-admin-cities-page.component.html',
  styleUrls: ['./super-admin-cities-page.component.scss']
})
export class SuperAdminCitiesPageComponent implements OnInit {
  cities: CityDto[] = [];
  regions: RegionDto[] = [];
  loading = true;
  saving = false;
  editingId: number | null = null;

  readonly regionLabel = cityRegionLabel;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    regionId: [null as number | null, Validators.required],
    latitude: [0 as number, Validators.required],
    longitude: [0 as number, Validators.required],
    active: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly cityService: CityService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cityService.listRegionsAdmin().subscribe({
      next: (list) => (this.regions = list || []),
      error: () => {
        this.regions = [];
        this.snackBar.open('Impossible de charger les régions.', 'Fermer', { duration: 4000 });
      }
    });
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.cityService.listAllAdmin().subscribe({
      next: (list) => {
        this.cities = list || [];
        this.loading = false;
      },
      error: () => {
        this.cities = [];
        this.loading = false;
        this.snackBar.open('Impossible de charger les villes.', 'Fermer', { duration: 4000 });
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.form.reset({
      code: '',
      name: '',
      regionId: null,
      latitude: 9.5,
      longitude: -13.7,
      active: true
    });
  }

  startEdit(city: CityDto): void {
    this.editingId = city.id;
    this.form.reset({
      code: city.code,
      name: city.name,
      regionId: city.regionId ?? city.region?.id ?? null,
      latitude: city.latitude,
      longitude: city.longitude,
      active: city.active !== false
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({
      code: '',
      name: '',
      regionId: null,
      latitude: 9.5,
      longitude: -13.7,
      active: true
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: CityWritePayload = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      regionId: v.regionId as number,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      active: !!v.active
    };
    this.saving = true;
    const req =
      this.editingId != null
        ? this.cityService.update(this.editingId, body)
        : this.cityService.create(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.editingId != null ? 'Ville mise à jour.' : 'Ville ajoutée.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelEdit();
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        const msg =
          err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  toggleActive(city: CityDto): void {
    const next = !(city.active !== false);
    this.cityService.setActive(city.id, next).subscribe({
      next: () => {
        this.snackBar.open(next ? 'Ville activée.' : 'Ville désactivée.', 'Fermer', {
          duration: 2500
        });
        this.reload();
      },
      error: () =>
        this.snackBar.open('Changement de statut impossible.', 'Fermer', { duration: 4000 })
    });
  }

  delete(city: CityDto): void {
    const count = city.schoolCount ?? 0;
    if (count > 0) {
      this.snackBar.open(
        `Impossible : ${count} établissement(s) rattaché(s).`,
        'Fermer',
        { duration: 4500 }
      );
      return;
    }
    if (!confirm(`Supprimer la ville « ${city.name} » ?`)) {
      return;
    }
    this.cityService.delete(city.id).subscribe({
      next: () => {
        this.snackBar.open('Ville supprimée.', 'Fermer', { duration: 2500 });
        if (this.editingId === city.id) {
          this.cancelEdit();
        }
        this.reload();
      },
      error: (err) => {
        const msg =
          err?.error?.message || err?.error?.error || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
