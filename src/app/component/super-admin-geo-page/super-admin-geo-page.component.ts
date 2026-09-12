import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import * as LeafletNamespace from 'leaflet';
import {
  GeoCityStats,
  GeoRegionStats,
  SuperAdminGeoStats,
  SuperAdminService
} from '../../service/super-admin.service';

/** Compat CommonJS / ESM (Angular + leaflet). */
const L = (LeafletNamespace as unknown as { default?: typeof LeafletNamespace }).default ?? LeafletNamespace;

@Component({
  selector: 'app-super-admin-geo-page',
  templateUrl: './super-admin-geo-page.component.html',
  styleUrls: ['./super-admin-geo-page.component.scss']
})
export class SuperAdminGeoPageComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Toujours présent dans le DOM (hors *ngIf) pour une init Leaflet fiable. */
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  loading = true;
  error = false;
  mapReady = false;
  stats: SuperAdminGeoStats | null = null;
  selectedRegionId: number | null = null;
  /** 0 = régions, 1 = villes */
  listTabIndex = 0;

  private map: LeafletNamespace.Map | null = null;
  private markersLayer: LeafletNamespace.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.refreshMarkers();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.destroyMap();
  }

  reload(): void {
    this.loading = true;
    this.error = false;
    this.superAdminService.getGeoStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.cdr.detectChanges();
        // Laisser le layout se stabiliser (sidenav / grille) avant invalidateSize.
        setTimeout(() => {
          this.map?.invalidateSize({ animate: false });
          this.refreshMarkers();
        }, 50);
        setTimeout(() => this.map?.invalidateSize({ animate: false }), 300);
      },
      error: () => {
        this.stats = null;
        this.loading = false;
        this.error = true;
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

  onListTabChange(index: number): void {
    this.listTabIndex = index;
    // Passage sur l’onglet villes : garder le filtre région s’il est actif.
    setTimeout(() => this.map?.invalidateSize({ animate: false }), 0);
  }

  /** Affiche « (Région) Ville ». */
  cityLabel(c: GeoCityStats): string {
    const name = c.cityName || '—';
    return c.regionName ? `(${c.regionName}) ${name}` : name;
  }

  private initMap(): void {
    if (this.map || !this.mapHost?.nativeElement) {
      return;
    }
    const el = this.mapHost.nativeElement;
    this.map = L.map(el, {
      center: [9.95, -11.7],
      zoom: 6,
      scrollWheelZoom: true,
      zoomControl: true
    });

    // Carto (OSM data) — plus fiable que tile.openstreetmap.org (souvent bloqué sans UA dédié).
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.mapReady = true;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize({ animate: false });
      });
      this.resizeObserver.observe(el);
    }

    // Premier paint : forcer le recalcul de taille.
    requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));
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
      const radius = Math.min(18, 8 + Math.sqrt(Math.max(c.schoolCount, 1)) * 3);
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
      marker.addTo(this.markersLayer!);
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
    this.map.invalidateSize({ animate: false });
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markersLayer = null;
      this.mapReady = false;
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
