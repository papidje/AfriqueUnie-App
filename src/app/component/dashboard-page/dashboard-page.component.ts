import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { distinctUntilChanged, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import {
  DashboardClassFill,
  DashboardClassPaymentStatus,
  DashboardService,
  DashboardSummary
} from '../../service/dashboard.service';
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

  classLabel(row: { levelCode: string | null; className: string }): string {
    const code = row.levelCode?.trim();
    const name = row.className?.trim() || '—';
    if (code && code.toLowerCase() !== name.toLowerCase()) {
      return `${code} · ${name}`;
    }
    return code || name;
  }

  fillEnrolledPct(row: DashboardClassFill): number {
    if (!row.capacity || row.capacity <= 0) {
      return row.enrolled > 0 ? 100 : 0;
    }
    return Math.min(100, (row.enrolled * 100) / row.capacity);
  }

  fillFreePct(row: DashboardClassFill): number {
    if (!row.capacity || row.capacity <= 0) {
      return 0;
    }
    const free = Math.max(0, row.capacity - row.enrolled);
    return (free * 100) / row.capacity;
  }

  fillTooltip(row: DashboardClassFill): string {
    const free = Math.max(0, (row.capacity || 0) - (row.enrolled || 0));
    return `${row.enrolled} inscrits / ${row.capacity} places (${free} libres)`;
  }

  payUpToDatePct(row: DashboardClassPaymentStatus): number {
    const total = (row.upToDateCount || 0) + (row.lateCount || 0);
    if (total <= 0) {
      return 0;
    }
    return (row.upToDateCount * 100) / total;
  }

  payLatePct(row: DashboardClassPaymentStatus): number {
    const total = (row.upToDateCount || 0) + (row.lateCount || 0);
    if (total <= 0) {
      return 0;
    }
    return (row.lateCount * 100) / total;
  }

  payTooltip(row: DashboardClassPaymentStatus): string {
    return `${row.upToDateCount} à jour · ${row.lateCount} en retard`;
  }

  maxFillCapacity(data: DashboardSummary): number {
    const caps = (data.classFill || []).map((c) => c.capacity || 0);
    return caps.length ? Math.max(...caps, 1) : 1;
  }

  maxPayHeadcount(data: DashboardSummary): number {
    const totals = (data.classPaymentStatus || []).map(
      (c) => (c.upToDateCount || 0) + (c.lateCount || 0)
    );
    return totals.length ? Math.max(...totals, 1) : 1;
  }

  /** Hauteur relative de la barre (capacité / effectif) pour comparer les classes. */
  barHeightPct(value: number, max: number): number {
    if (!max || max <= 0) {
      return 0;
    }
    return Math.max(4, Math.min(100, (value * 100) / max));
  }
}
