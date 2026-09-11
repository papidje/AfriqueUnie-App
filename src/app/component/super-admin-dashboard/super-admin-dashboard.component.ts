import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SuperAdminService, SuperAdminTenantRow } from '../../service/super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  readonly displayedColumns: string[] = ['name', 'address', 'createdAt', 'schools', 'active'];
  rows: SuperAdminTenantRow[] = [];
  loading = true;
  error = false;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.superAdminService.getTenantsWithSchools().subscribe({
      next: (data) => {
        this.rows = data;
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.error = true;
        this.loading = false;
      }
    });
  }

  schoolCount(row: SuperAdminTenantRow): number {
    return row.schools?.length ?? 0;
  }

  activeSchoolCount(row: SuperAdminTenantRow): number {
    return (row.schools ?? []).filter((s) => s.active).length;
  }

  openSchools(row: SuperAdminTenantRow): void {
    void this.router.navigate(['/super-admin/ecoles'], {
      queryParams: { tenant: row.id }
    });
  }
}
