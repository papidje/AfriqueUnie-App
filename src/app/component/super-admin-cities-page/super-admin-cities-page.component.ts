import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CityDto,
  CityService,
  CityWritePayload,
  RegionDto,
  RegionWritePayload,
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
  citySearch = '';
  loadingCities = true;
  loadingRegions = true;
  savingCity = false;
  savingRegion = false;
  /** Formulaire ville visible uniquement après « Nouvelle ville » ou « Modifier ». */
  cityFormOpen = false;
  cityEditingId: number | null = null;
  /** Formulaire région visible uniquement après « Nouvelle région » ou « Modifier ». */
  regionFormOpen = false;
  regionEditingId: number | null = null;

  readonly regionLabel = cityRegionLabel;

  readonly cityForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    regionId: [null as number | null, Validators.required],
    latitude: [0 as number, Validators.required],
    longitude: [0 as number, Validators.required],
    active: [true]
  });

  readonly regionForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(32)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    active: [true]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly cityService: CityService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reloadRegions();
    this.reloadCities();
  }

  get filteredCities(): CityDto[] {
    const q = (this.citySearch || '').trim().toLowerCase();
    if (!q) {
      return this.cities;
    }
    return this.cities.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      const region = this.regionLabel(c).toLowerCase();
      const regionCode = (c.regionCode || c.region?.code || '').toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        region.includes(q) ||
        regionCode.includes(q)
      );
    });
  }

  reloadRegions(): void {
    this.loadingRegions = true;
    this.cityService.listRegionsAdmin().subscribe({
      next: (list) => {
        this.regions = list || [];
        this.loadingRegions = false;
      },
      error: () => {
        this.regions = [];
        this.loadingRegions = false;
        this.snackBar.open('Impossible de charger les régions.', 'Fermer', { duration: 4000 });
      }
    });
  }

  reloadCities(): void {
    this.loadingCities = true;
    this.cityService.listAllAdmin().subscribe({
      next: (list) => {
        this.cities = list || [];
        this.loadingCities = false;
      },
      error: () => {
        this.cities = [];
        this.loadingCities = false;
        this.snackBar.open('Impossible de charger les villes.', 'Fermer', { duration: 4000 });
      }
    });
  }

  // —— Régions ——

  startCreateRegion(): void {
    this.regionEditingId = null;
    this.regionFormOpen = true;
    this.regionForm.reset({ code: '', name: '', active: true });
  }

  startEditRegion(region: RegionDto): void {
    this.regionEditingId = region.id;
    this.regionFormOpen = true;
    this.regionForm.reset({
      code: region.code,
      name: region.name,
      active: region.active !== false
    });
  }

  cancelRegionEdit(): void {
    this.regionFormOpen = false;
    this.regionEditingId = null;
    this.regionForm.reset({ code: '', name: '', active: true });
  }

  saveRegion(): void {
    if (this.regionForm.invalid) {
      this.regionForm.markAllAsTouched();
      return;
    }
    const v = this.regionForm.getRawValue();
    const body: RegionWritePayload = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      active: !!v.active
    };
    this.savingRegion = true;
    const req =
      this.regionEditingId != null
        ? this.cityService.updateRegion(this.regionEditingId, body)
        : this.cityService.createRegion(body);
    req.subscribe({
      next: () => {
        this.savingRegion = false;
        this.snackBar.open(
          this.regionEditingId != null ? 'Région mise à jour.' : 'Région ajoutée.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelRegionEdit();
        this.reloadRegions();
      },
      error: (err) => {
        this.savingRegion = false;
        const msg =
          err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  toggleRegionActive(region: RegionDto): void {
    const next = !(region.active !== false);
    this.cityService.setRegionActive(region.id, next).subscribe({
      next: () => {
        this.snackBar.open(next ? 'Région activée.' : 'Région désactivée.', 'Fermer', {
          duration: 2500
        });
        this.reloadRegions();
      },
      error: () =>
        this.snackBar.open('Changement de statut impossible.', 'Fermer', { duration: 4000 })
    });
  }

  deleteRegion(region: RegionDto): void {
    const count = region.cityCount ?? 0;
    if (count > 0) {
      this.snackBar.open(
        `Impossible : ${count} ville(s) rattachée(s). Désactivez plutôt la région.`,
        'Fermer',
        { duration: 4500 }
      );
      return;
    }
    if (!confirm(`Supprimer la région « ${region.name} » ?`)) {
      return;
    }
    this.cityService.deleteRegion(region.id).subscribe({
      next: () => {
        this.snackBar.open('Région supprimée.', 'Fermer', { duration: 2500 });
        if (this.regionEditingId === region.id) {
          this.cancelRegionEdit();
        }
        this.reloadRegions();
      },
      error: (err) => {
        const msg =
          err?.error?.message || err?.error?.error || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  // —— Villes ——

  startCreateCity(): void {
    this.cityEditingId = null;
    this.cityFormOpen = true;
    this.cityForm.reset({
      code: '',
      name: '',
      regionId: null,
      latitude: 9.5,
      longitude: -13.7,
      active: true
    });
  }

  startEditCity(city: CityDto): void {
    this.cityEditingId = city.id;
    this.cityFormOpen = true;
    this.cityForm.reset({
      code: city.code,
      name: city.name,
      regionId: city.regionId ?? city.region?.id ?? null,
      latitude: city.latitude,
      longitude: city.longitude,
      active: city.active !== false
    });
  }

  cancelCityEdit(): void {
    this.cityFormOpen = false;
    this.cityEditingId = null;
    this.cityForm.reset({
      code: '',
      name: '',
      regionId: null,
      latitude: 9.5,
      longitude: -13.7,
      active: true
    });
  }

  saveCity(): void {
    if (this.cityForm.invalid) {
      this.cityForm.markAllAsTouched();
      return;
    }
    const v = this.cityForm.getRawValue();
    const body: CityWritePayload = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      regionId: v.regionId as number,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      active: !!v.active
    };
    this.savingCity = true;
    const req =
      this.cityEditingId != null
        ? this.cityService.update(this.cityEditingId, body)
        : this.cityService.create(body);
    req.subscribe({
      next: () => {
        this.savingCity = false;
        this.snackBar.open(
          this.cityEditingId != null ? 'Ville mise à jour.' : 'Ville ajoutée.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelCityEdit();
        this.reloadCities();
        this.reloadRegions();
      },
      error: (err) => {
        this.savingCity = false;
        const msg =
          err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  toggleCityActive(city: CityDto): void {
    const next = !(city.active !== false);
    this.cityService.setActive(city.id, next).subscribe({
      next: () => {
        this.snackBar.open(next ? 'Ville activée.' : 'Ville désactivée.', 'Fermer', {
          duration: 2500
        });
        this.reloadCities();
      },
      error: () =>
        this.snackBar.open('Changement de statut impossible.', 'Fermer', { duration: 4000 })
    });
  }

  deleteCity(city: CityDto): void {
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
        if (this.cityEditingId === city.id) {
          this.cancelCityEdit();
        }
        this.reloadCities();
        this.reloadRegions();
      },
      error: (err) => {
        const msg =
          err?.error?.message || err?.error?.error || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
