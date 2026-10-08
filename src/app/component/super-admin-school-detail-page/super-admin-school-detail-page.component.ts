import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { API_BASE_URL } from '../../core/api-base';
import { SuperAdminService, SuperAdminSchoolDetail } from '../../service/super-admin.service';
import { BackNavigationService } from '../../core/back-navigation.service';

@Component({
  selector: 'app-super-admin-school-detail-page',
  templateUrl: './super-admin-school-detail-page.component.html',
  styleUrls: ['./super-admin-school-detail-page.component.scss']
})
export class SuperAdminSchoolDetailPageComponent implements OnInit {
  loading = true;
  detail: SuperAdminSchoolDetail | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly superAdmin: SuperAdminService,
    private readonly snackBar: MatSnackBar,
    private readonly backNav: BackNavigationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('schoolId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.snackBar.open('Identifiant école invalide.', 'Fermer', { duration: 4000 });
      void this.router.navigate(['/super-admin/ecoles']);
      return;
    }
    this.superAdmin.getSchoolDetail(id).subscribe({
      next: (d) => {
        this.detail = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('École introuvable.', 'Fermer', { duration: 5000 });
        void this.router.navigate(['/super-admin/ecoles']);
      }
    });
  }

  goBack(): void {
    this.backNav.goBackInHistory();
  }

  openTenant(tenantId: number | null | undefined): void {
    if (tenantId == null) {
      return;
    }
    void this.router.navigate(['/super-admin/tenants', tenantId]);
  }

  logoUrl(logo: string | null | undefined): string | null {
    if (!logo) {
      return null;
    }
    if (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:')) {
      return logo;
    }
    return `${API_BASE_URL}${logo.startsWith('/') ? '' : '/'}${logo}`;
  }

  placeLabel(): string {
    const d = this.detail;
    if (!d) {
      return '—';
    }
    if (d.cityName && d.regionName) {
      return `${d.cityName} · ${d.regionName}`;
    }
    return d.cityName || d.regionName || '—';
  }

  occupancyPercent(): number | null {
    const d = this.detail;
    if (!d || !d.capacity || d.capacity <= 0) {
      return null;
    }
    return Math.min(999, Math.round((d.activeYearStudentCount / d.capacity) * 100));
  }

  initials(name: string | null | undefined): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (name || '?').slice(0, 2).toUpperCase();
  }
}
