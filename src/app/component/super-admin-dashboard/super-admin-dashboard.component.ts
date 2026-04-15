import { Component, OnInit } from '@angular/core';
import { SuperAdminService, SuperAdminTenantRow } from '../../service/super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  readonly displayedColumns: string[] = ['id', 'name', 'address', 'createdAt', 'schools'];
  rows: SuperAdminTenantRow[] = [];
  loading = true;
  error = false;

  constructor(private readonly superAdminService: SuperAdminService) {}

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

  formatSchools(row: SuperAdminTenantRow): string {
    if (!row.schools?.length) {
      return '—';
    }
    return row.schools.map((s) => `${s.name}${s.active ? '' : ' (inactive)'}`).join(' · ');
  }
}
