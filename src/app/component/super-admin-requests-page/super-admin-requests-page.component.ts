import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { SubjectAdditionRequestSummary } from '../../models/subject-addition-request.models';
import { SuperAdminService } from '../../service/super-admin.service';
import {
  SubjectAdditionRequestDetailDialogComponent,
  SubjectAdditionRequestDetailDialogData
} from '../subject-addition-request-detail-dialog/subject-addition-request-detail-dialog.component';
import { formatNotificationDateTime } from '../../shared/util/display-date.util';

@Component({
  selector: 'app-super-admin-requests-page',
  templateUrl: './super-admin-requests-page.component.html',
  styleUrls: ['./super-admin-requests-page.component.scss']
})
export class SuperAdminRequestsPageComponent implements OnInit {
  requests: SubjectAdditionRequestSummary[] = [];
  loadingRequests = true;
  requestFilter: 'OPEN' | 'CLOSED' | 'ALL' = 'OPEN';
  /** Nombre de demandes ouvertes (pastille onglet Matière). */
  openRequestCount = 0;

  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.reloadOpenCount();
    this.reloadRequests();
    const raw = this.route.snapshot.queryParamMap.get('requestId');
    const id = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(id) && id > 0) {
      this.openRequest(id);
    }
  }

  formatDt(value: string | null | undefined): string {
    return formatNotificationDateTime(value);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'Ouverte';
      case 'ACCEPTED':
        return 'Acceptée';
      case 'REFUSED':
        return 'Refusée';
      default:
        return status;
    }
  }

  setRequestFilter(filter: 'OPEN' | 'CLOSED' | 'ALL'): void {
    this.requestFilter = filter;
    this.reloadRequests();
  }

  reloadOpenCount(): void {
    this.superAdminService.listSubjectAdditionRequests('OPEN').subscribe({
      next: (rows) => (this.openRequestCount = (rows || []).length),
      error: () => (this.openRequestCount = 0)
    });
  }

  reloadRequests(): void {
    this.loadingRequests = true;
    this.superAdminService.listSubjectAdditionRequests(this.requestFilter).subscribe({
      next: (rows) => {
        this.requests = rows || [];
        this.loadingRequests = false;
        if (this.requestFilter === 'OPEN') {
          this.openRequestCount = this.requests.length;
        }
      },
      error: () => {
        this.requests = [];
        this.loadingRequests = false;
      }
    });
  }

  openRequest(id: number): void {
    const data: SubjectAdditionRequestDetailDialogData = { requestId: id, asSuperAdmin: true };
    this.dialog
      .open(SubjectAdditionRequestDetailDialogComponent, {
        data,
        width: '680px',
        maxWidth: '95vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe(() => {
        this.reloadOpenCount();
        this.reloadRequests();
      });
  }
}
