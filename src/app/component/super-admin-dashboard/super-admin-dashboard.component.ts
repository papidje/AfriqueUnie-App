import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SuperAdminService, SuperAdminTenantRow } from '../../service/super-admin.service';
import {
  TenantSubscriptionDialogComponent,
  TenantSubscriptionDialogResult
} from './tenant-subscription-dialog.component';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  readonly subscriptionStudentThreshold = 100;

  readonly displayedColumns: string[] = [
    'name',
    'admins',
    'address',
    'createdAt',
    'subscriptionEndsOn',
    'schools',
    'activeSchools',
    'students',
    'status'
  ];
  rows: SuperAdminTenantRow[] = [];
  loading = true;
  error = false;
  togglingId: number | null = null;

  search = '';
  statusFilter: StatusFilter = 'all';

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog
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

  get filteredRows(): SuperAdminTenantRow[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (this.statusFilter === 'active' && row.active === false) {
        return false;
      }
      if (this.statusFilter === 'inactive' && row.active !== false) {
        return false;
      }
      if (!q) {
        return true;
      }
      const adminHay = (row.admins ?? [])
        .map((a) => `${a.fullname ?? ''} ${a.email ?? ''}`)
        .join(' ');
      const hay = [row.name, row.address, adminHay].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  get activeCount(): number {
    return this.rows.filter((r) => r.active !== false).length;
  }

  get inactiveCount(): number {
    return this.rows.length - this.activeCount;
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter = filter;
  }

  schoolCount(row: SuperAdminTenantRow): number {
    return row.schools?.length ?? 0;
  }

  activeSchoolCount(row: SuperAdminTenantRow): number {
    return (row.schools ?? []).filter((s) => s.active).length;
  }

  adminsLabel(row: SuperAdminTenantRow): string {
    const admins = row.admins ?? [];
    if (!admins.length) {
      return '—';
    }
    return admins.map((a) => a.fullname).join(', ');
  }

  openSchools(row: SuperAdminTenantRow): void {
    void this.router.navigate(['/super-admin/ecoles'], {
      queryParams: { tenant: row.id }
    });
  }

  toggleActive(row: SuperAdminTenantRow): void {
    const next = row.active === false;
    if (!next) {
      this.applyActiveChange(row, false);
      return;
    }
    if ((row.studentCount ?? 0) > this.subscriptionStudentThreshold) {
      const ref = this.dialog.open(TenantSubscriptionDialogComponent, {
        width: '420px',
        data: {
          tenantName: row.name,
          studentCount: row.studentCount ?? 0,
          currentEndsOn: row.subscriptionEndsOn
        }
      });
      ref.afterClosed().subscribe((result: TenantSubscriptionDialogResult | undefined) => {
        if (!result?.subscriptionEndsOn) {
          return;
        }
        this.applyActiveChange(row, true, result.subscriptionEndsOn);
      });
      return;
    }
    this.applyActiveChange(row, true);
  }

  private applyActiveChange(
    row: SuperAdminTenantRow,
    active: boolean,
    subscriptionEndsOn?: string
  ): void {
    this.togglingId = row.id;
    const body =
      subscriptionEndsOn != null ? { subscriptionEndsOn } : undefined;
    this.superAdminService.setTenantActive(row.id, active, body).subscribe({
      next: (updated) => {
        this.rows = this.rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));
        this.togglingId = null;
        this.snackBar.open(
          active ? 'Tenant activé.' : 'Tenant désactivé.',
          'Fermer',
          { duration: 2500 }
        );
      },
      error: (err: HttpErrorResponse) => {
        this.togglingId = null;
        const msg =
          err?.error?.message ||
          err?.error?.detail ||
          'Changement de statut impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
