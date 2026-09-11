import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';
import {
  GeoCityStats,
  GeoRegionStats,
  SuperAdminGeoStats,
  SuperAdminService
} from '../../service/super-admin.service';

@Component({
  selector: 'app-super-admin-geo-page',
  templateUrl: './super-admin-geo-page.component.html',
  styleUrls: ['./super-admin-geo-page.component.scss']
})
export class SuperAdminGeoPageComponent implements OnInit, OnDestroy {
  @ViewChild('mapHost') mapHost?: ElementRef<HTMLDivElement>;

  loading = true;
  error = false;
  stats: SuperAdminGeoStats | null = null;
  selectedRegionId: number | null = null;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private initScheduled = false;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  reload(): void {
    this.loading = true;
    this.error = false;
    this.destroyMap();
    this.superAdminService.getGeoStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.cdr.detectChanges();
        this.scheduleMapInit();
      },
      error: () => {
        this.stats = null;
        this.loading = false;
        this.error = true;
        this.destroyMap();
      }
    });
  }

  /** Régions avec au moins une école ou un élève. */
  get regions(): GeoRegionStats[] {
    return (this.stats?.byRegion ?? []).filter(
      (r) => (r.schoolCount ?? 0) > 0 || (r.studentCount ?? 0) > 0
    );
  }

  /** Villes avec au moins une école ou un élève (filtre région optionnel). */
  get filteredCities(): GeoCityStats[] {
    let list = (this.stats?.byCity ?? []).filter(
      (c) => (c.schoolCount ?? 0) > 0 || (c.studentCount ?? 0) > 0
    );
    if (this.selectedRegionId != null) {
      list = list.filter((c) => c.regionId === this.selectedRegionId);
    }
    return list;
  }

  get markerCities(): GeoCityStats[] {
    return this.filteredCities.filter(
      (c) =>
        c.schoolCount > 0 &&
        c.latitude != null &&
        c.longitude != null &&
        Number.isFinite(Number(c.latitude)) &&
        Number.isFinite(Number(c.longitude))
    );
  }

  selectRegion(regionId: number | null): void {
    this.selectedRegionId =
      regionId != null && this.selectedRegionId === regionId ? null : regionId;
    this.refreshMarkers();
  }

  /**
   * Le conteneur carte est derrière un *ngIf : attendre le prochain paint après detectChanges.
   */
  private scheduleMapInit(attempt = 0): void {
    if (this.initScheduled && attempt === 0) {
      return;
    }
    this.initScheduled = true;
    requestAnimationFrame(() => {
      this.initScheduled = false;
      const el = this.mapHost?.nativeElement ?? document.getElementById('super-admin-guinea-map');
      if (!el) {
        if (attempt < 10) {
          setTimeout(() => this.scheduleMapInit(attempt + 1), 50);
        }
        return;
      }
      this.tryInitMap();
      this.refreshMarkers();
      // Leaflet calcule mal la taille si le layout n’est pas encore stable.
      setTimeout(() => {
        this.map?.invalidateSize();
        this.refreshMarkers();
      }, 120);
    });
  }

  private tryInitMap(): void {
    if (this.map) {
      return;
    }
    const el = this.mapHost?.nativeElement ?? document.getElementById('super-admin-guinea-map');
    if (!el) {
      return;
    }
    this.map = L.map(el, {
      center: [9.95, -11.7],
      zoom: 6,
      scrollWheelZoom: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  private refreshMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }
    this.markersLayer.clearLayers();
    const cities = this.markerCities;
    for (const c of cities) {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      const radius = Math.min(18, 8 + Math.sqrt(c.schoolCount) * 3);
      const marker = L.circleMarker([lat, lng], {
        radius,
        color: '#0f4c81',
        weight: 2,
        fillColor: '#1e88e5',
        fillOpacity: 0.85
      });
      marker.bindPopup(
        `<strong>${this.escapeHtml(c.cityName)}</strong>` +
          (c.regionName ? `<br/>${this.escapeHtml(c.regionName)}` : '') +
          `<br/>Écoles : ${c.schoolCount} (${c.activeSchoolCount} actives)` +
          `<br/>Élèves : ${c.studentCount}`
      );
      marker.addTo(this.markersLayer);
    }
    if (cities.length === 1) {
      this.map.setView([Number(cities[0].latitude), Number(cities[0].longitude)], 9);
    } else if (cities.length > 1) {
      const bounds = L.latLngBounds(
        cities.map((c) => [Number(c.latitude), Number(c.longitude)] as [number, number])
      );
      this.map.fitBounds(bounds.pad(0.25));
    } else {
      this.map.setView([9.95, -11.7], 6);
    }
    this.map.invalidateSize();
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markersLayer = null;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
