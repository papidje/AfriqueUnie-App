import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { API_BASE_URL } from '../../core/api-base';
import { SuperAdminSchoolRow, SuperAdminService } from '../../service/super-admin.service';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-super-admin-schools-page',
  templateUrl: './super-admin-schools-page.component.html',
  styleUrls: ['./super-admin-schools-page.component.scss']
})
export class SuperAdminSchoolsPageComponent implements OnInit {
  schools: SuperAdminSchoolRow[] = [];
  loading = true;
  error = false;

  search = '';
  statusFilter: StatusFilter = 'all';
  tenantFilterId: number | null = null;
  tenantFilterName: string | null = null;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((qp) => {
      const raw = qp.get('tenant');
      const id = raw != null ? Number(raw) : NaN;
      this.tenantFilterId = Number.isFinite(id) ? id : null;
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.superAdminService.getSchools().subscribe({
      next: (rows) => {
        this.schools = rows || [];
        this.syncTenantFilterName();
        this.loading = false;
      },
      error: () => {
        this.schools = [];
        this.loading = false;
        this.error = true;
      }
    });
  }

  get filteredSchools(): SuperAdminSchoolRow[] {
    const q = this.search.trim().toLowerCase();
    return this.schools.filter((s) => {
      if (this.tenantFilterId != null && s.tenantId !== this.tenantFilterId) {
        return false;
      }
      if (this.statusFilter === 'active' && !s.active) {
        return false;
      }
      if (this.statusFilter === 'inactive' && s.active) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = [
        s.name,
        s.adress,
        s.contact,
        s.tenantName,
        s.cityName,
        s.regionName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  get activeCount(): number {
    return this.schools.filter((s) => s.active).length;
  }

  get inactiveCount(): number {
    return this.schools.length - this.activeCount;
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter = filter;
  }

  clearTenantFilter(): void {
    this.tenantFilterId = null;
    this.tenantFilterName = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tenant: null },
      queryParamsHandling: 'merge'
    });
  }

  logoUrl(logo: string | null | undefined): string | null {
    if (!logo) {
      return null;
    }
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    if (logo.startsWith('/')) {
      return `${API_BASE_URL}${logo}`;
    }
    return logo;
  }

  placeLabel(s: SuperAdminSchoolRow): string {
    if (s.cityName && s.regionName) {
      return `${s.cityName} · ${s.regionName}`;
    }
    return s.cityName || s.regionName || 'Ville non renseignée';
  }

  private syncTenantFilterName(): void {
    if (this.tenantFilterId == null) {
      this.tenantFilterName = null;
      return;
    }
    const match = this.schools.find((s) => s.tenantId === this.tenantFilterId);
    this.tenantFilterName = match?.tenantName ?? `Tenant #${this.tenantFilterId}`;
  }
}
