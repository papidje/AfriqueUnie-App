import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { DashboardService, DashboardSummary } from '../../service/dashboard.service';
import { ActiveSchoolService } from '../../service/active-school.service';
import { formatGnfAmount } from '../../util/money-format.util';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  /** Montants type « 1 235 000 GNF » pour le template. */
  readonly formatGnf = formatGnfAmount;

  loading = true;
  hasError = false;
  summary: DashboardSummary | null = null;

  constructor(
    private readonly dashboardService: DashboardService,
    readonly activeSchool: ActiveSchoolService,
    private readonly cdr: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const accessDenied = this.route.snapshot.queryParamMap.get('accessDenied');
    if (accessDenied === '1' || accessDenied === 'true') {
      this.snackBar.open('Cette page n\'est pas accessible avec votre rôle.', 'Fermer', { duration: 6000 });
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { accessDenied: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }

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
