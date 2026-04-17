import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { DashboardService, DashboardSummary } from '../../service/dashboard.service';
import { ActiveSchoolService } from '../../service/active-school.service';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = true;
  hasError = false;
  summary: DashboardSummary | null = null;

  constructor(
    private readonly dashboardService: DashboardService,
    readonly activeSchool: ActiveSchoolService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.activeSchool
      .refreshSchools$()
      .pipe(
        take(1),
        takeUntil(this.destroy$),
        switchMap(() =>
          this.activeSchool.activeSchoolId$.pipe(
            distinctUntilChanged(),
            tap(() => {
              this.loading = true;
              this.hasError = false;
              this.cdr.markForCheck();
            }),
            switchMap((schoolId) => this.dashboardService.getSummary(schoolId ?? undefined)),
            takeUntil(this.destroy$)
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.loading = false;
          this.hasError = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.summary = null;
          this.hasError = true;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSummary(): void {
    this.loading = true;
    this.hasError = false;
    this.dashboardService.getSummary(this.activeSchool.getActiveSchoolId() ?? undefined).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.summary = null;
        this.hasError = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
