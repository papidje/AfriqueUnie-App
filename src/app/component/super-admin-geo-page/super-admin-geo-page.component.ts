import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import * as L from 'leaflet';
import {
  GeoCityStats,
  GeoRegionStats,
  SuperAdminGeoStats,
  SuperAdminService
} from '../../service/super-admin.service';

/** Icônes Leaflet (chemins webpack / Angular). */
function fixLeafletDefaultIcons(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = L.Icon.Default.prototype as any;
  if (proto._getIconUrl) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });
}

@Component({
  selector: 'app-super-admin-geo-page',
  templateUrl: './super-admin-geo-page.component.html',
  styleUrls: ['./super-admin-geo-page.component.scss']
})
export class SuperAdminGeoPageComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = true;
  error = false;
  stats: SuperAdminGeoStats | null = null;
  selectedRegionId: number | null = null;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private viewReady = false;

  constructor(private readonly superAdminService: SuperAdminService) {}

  ngOnInit(): void {
    this.reload();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryInitMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  reload(): void {
    this.loading = true;
    this.error = false;
    this.superAdminService.getGeoStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.tryInitMap();
        this.refreshMarkers();
      },
      error: () => {
        this.stats = null;
        this.loading = false;
        this.error = true;
      }
    });
  }

  get regions(): GeoRegionStats[] {
    return this.stats?.byRegion ?? [];
  }

  get filteredCities(): GeoCityStats[] {
    const list = this.stats?.byCity ?? [];
    if (this.selectedRegionId == null) {
      return list;
    }
    return list.filter((c) => c.regionId === this.selectedRegionId);
  }

  get markerCities(): GeoCityStats[] {
    return this.filteredCities.filter(
      (c) =>
        c.schoolCount > 0 &&
        c.latitude != null &&
        c.longitude != null &&
        Number.isFinite(c.latitude) &&
        Number.isFinite(c.longitude)
    );
  }

  selectRegion(regionId: number | null): void {
    this.selectedRegionId =
      regionId != null && this.selectedRegionId === regionId ? null : regionId;
    this.refreshMarkers();
  }

  private tryInitMap(): void {
    if (!this.viewReady || this.map || typeof document === 'undefined') {
      return;
    }
    const el = document.getElementById('super-admin-guinea-map');
    if (!el) {
      return;
    }
    fixLeafletDefaultIcons();
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
    setTimeout(() => this.map?.invalidateSize(), 0);
    this.refreshMarkers();
  }

  private refreshMarkers(): void {
    if (!this.map || !this.markersLayer) {
      return;
    }
    this.markersLayer.clearLayers();
    const cities = this.markerCities;
    for (const c of cities) {
      const marker = L.marker([c.latitude, c.longitude]);
      marker.bindPopup(
        `<strong>${this.escapeHtml(c.cityName)}</strong>` +
          (c.regionName ? `<br/>${this.escapeHtml(c.regionName)}` : '') +
          `<br/>Écoles : ${c.schoolCount} (${c.activeSchoolCount} actives)` +
          `<br/>Élèves : ${c.studentCount}`
      );
      marker.addTo(this.markersLayer);
    }
    if (cities.length === 1) {
      this.map.setView([cities[0].latitude, cities[0].longitude], 9);
    } else if (cities.length > 1) {
      const bounds = L.latLngBounds(cities.map((c) => [c.latitude, c.longitude] as [number, number]));
      this.map.fitBounds(bounds.pad(0.2));
    } else {
      this.map.setView([9.95, -11.7], 6);
    }
    setTimeout(() => this.map?.invalidateSize(), 0);
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
