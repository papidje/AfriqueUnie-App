import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { API_BASE_URL } from '../../core/api-base';
import { SuperAdminService, SuperAdminTenantDetail } from '../../service/super-admin.service';
import { BackNavigationService } from '../../core/back-navigation.service';

@Component({
  selector: 'app-super-admin-tenant-detail-page',
  templateUrl: './super-admin-tenant-detail-page.component.html',
  styleUrls: ['./super-admin-tenant-detail-page.component.scss']
})
export class SuperAdminTenantDetailPageComponent implements OnInit {
  loading = true;
  detail: SuperAdminTenantDetail | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly superAdmin: SuperAdminService,
    private readonly snackBar: MatSnackBar,
    private readonly backNav: BackNavigationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('tenantId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.snackBar.open('Identifiant tenant invalide.', 'Fermer', { duration: 4000 });
      void this.router.navigate(['/super-admin/tenants']);
      return;
    }
    this.superAdmin.getTenantDetail(id).subscribe({
      next: (d) => {
        this.detail = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Tenant introuvable.', 'Fermer', { duration: 5000 });
        void this.router.navigate(['/super-admin/tenants']);
      }
    });
  }

  goBack(): void {
    this.backNav.goBackInHistory();
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

  placeLabel(city: string | null | undefined, region: string | null | undefined): string {
    if (city && region) {
      return `${city} · ${region}`;
    }
    return city || region || 'Localisation non renseignée';
  }

  openSchool(schoolId: number): void {
    void this.router.navigate(['/super-admin/ecoles', schoolId]);
  }

  initials(name: string | null | undefined): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return (name || '?').slice(0, 2).toUpperCase();
  }
}
