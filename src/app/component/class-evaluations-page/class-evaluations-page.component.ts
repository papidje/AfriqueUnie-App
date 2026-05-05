import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject as RxSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppRoles } from '../../core/app-roles';
import { EVALUATION_TYPE_OPTIONS, EvaluationResponse } from '../../models/evaluation.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { EvaluationApiService } from '../../service/evaluation-api.service';
import { resolveSchoolClassId } from '../../util/class-route.util';
import { NewEvaluationDialogComponent } from './new-evaluation-dialog.component';

@Component({
  selector: 'app-class-evaluations-page',
  templateUrl: './class-evaluations-page.component.html',
  styleUrls: ['./class-evaluations-page.component.scss']
})
export class ClassEvaluationsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new RxSubject<void>();

  readonly displayedColumns = ['title', 'subject', 'type', 'period', 'start', 'coeff'];

  classId: number | null = null;
  workspaceChild = false;
  /** Liste dédiée sidebar (carte + onglets classe), sans barre « espace classe ». */
  hubEmbedded = false;
  loading = true;
  evaluations: EvaluationResponse[] = [];

  readonly typeLabel = (t: string): string =>
    EVALUATION_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly evalApi: EvaluationApiService,
    private readonly authUtils: AuthUtilsService,
    private readonly snackBar: MatSnackBar
  ) {}

  get canWrite(): boolean {
    return this.authUtils.hasAnyRole([
      AppRoles.ADMIN_ECOLE,
      AppRoles.STAFF,
      AppRoles.DIRECTOR,
      AppRoles.TEACHER
    ]);
  }

  ngOnInit(): void {
    this.workspaceChild = !!this.route.snapshot.data['workspaceChild'];
    this.hubEmbedded = !!this.route.snapshot.data['hubEmbedded'];
    const param$ =
      this.workspaceChild && this.route.parent != null ? this.route.parent.paramMap : this.route.paramMap;
    param$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.classId = resolveSchoolClassId(this.route);
      if (this.classId == null) {
        this.loading = false;
        return;
      }
      this.reload();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openNewDialog(): void {
    if (this.classId == null) {
      return;
    }
    const ref = this.dialog.open(NewEvaluationDialogComponent, {
      width: '520px',
      data: { classId: this.classId }
    });
    ref.afterClosed().subscribe((r) => {
      if (r?.created) {
        this.reload();
      }
    });
  }

  openGrades(e: EvaluationResponse): void {
    if (this.classId == null) {
      return;
    }
    void this.router.navigate(['/evaluations', this.classId, e.id, 'notes']);
  }

  private reload(): void {
    if (this.classId == null) {
      return;
    }
    this.loading = true;
    this.evalApi
      .listForClass(this.classId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.evaluations = list;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Impossible de charger les évaluations.', 'Fermer', { duration: 5000 });
        }
      });
  }
}
