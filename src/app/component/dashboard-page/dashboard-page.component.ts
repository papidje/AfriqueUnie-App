import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardSummary } from '../../service/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit {
  loading = true;
  hasError = false;
  summary: DashboardSummary | null = null;

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.hasError = false;
    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => {
        this.summary = null;
        this.hasError = true;
        this.loading = false;
      }
    });
  }
}
