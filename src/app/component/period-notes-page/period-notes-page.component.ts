import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { EvaluationApiService } from '../../service/evaluation-api.service';
import { GradingApiService } from '../../service/grading-api.service';
import { SchoolClassService } from '../../service/school-class.service';
import { GradingPeriodSummary } from '../../models/evaluation.models';
import { PeriodNotesGridResponse } from '../../models/grading.models';
import { SchoolClassDto } from '../../models/academic.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { AppRoles } from '../../core/app-roles';

@Component({
  selector: 'app-period-notes-page',
  templateUrl: './period-notes-page.component.html',
  styleUrls: ['./period-notes-page.component.scss']
})
export class PeriodNotesPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly grids = new Map<number, PeriodNotesGridResponse>();
  private readonly loadingPeriodIds = new Set<number>();

  /** Classes de l’année active, triées par niveau (comme la page Élèves). */
  sortedClasses: SchoolClassDto[] = [];
  selectedClassIndex = 0;
  currentClassId: number | null = null;

  periods: GradingPeriodSummary[] = [];
  loadingClasses = true;

  /** Rôles pouvant saisir des notes / accéder aux évaluations de la classe (hors simple lecture comptable). */
  private static readonly SAISIE_NOTES_ROLES = [
    AppRoles.ADMIN_ECOLE,
    AppRoles.DIRECTOR,
    AppRoles.STAFF,
    AppRoles.TEACHER
  ] as const;

  constructor(
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolClassService: SchoolClassService,
    private readonly evalApi: EvaluationApiService,
    private readonly gradingApi: GradingApiService,
    private readonly snackBar: MatSnackBar,
    private readonly authUtils: AuthUtilsService
  ) {}

  /** Phrase pour le message (ce trimestre / ce semestre / cette période). */
  periodTypePhraseForMessage(): string {
    const t = this.sortedClasses[this.selectedClassIndex]?.periodType;
    if (t === 'TRIMESTER') {
      return 'ce trimestre';
    }
    if (t === 'SEMESTER') {
      return 'ce semestre';
    }
    return 'cette période de notation';
  }

  canSaisirNote(): boolean {
    return this.authUtils.hasAnyRole([...PeriodNotesPageComponent.SAISIE_NOTES_ROLES]);
  }

  /**
   * Aucune donnée exploitable : pas de matières, pas d’élèves, ou aucune moyenne calculable / note saisie.
   */
  isNotesDataEmpty(periodId: number): boolean {
    const g = this.getGrid(periodId);
    if (!g) {
      return false;
    }
    if (g.columns.length === 0 || g.rows.length === 0) {
      return true;
    }
    return g.rows.every((row) => {
      const hasGeneral =
        row.generalAverage != null && !Number.isNaN(row.generalAverage);
      if (hasGeneral) {
        return false;
      }
      return row.averages.every((a) => a == null || Number.isNaN(a as number));
    });
  }

  hasCompositionMeta(periodId: number): boolean {
    if (this.isLoading(periodId)) {
      return false;
    }
    const g = this.getGrid(periodId);
    if (!g || this.isNotesDataEmpty(periodId)) {
      return false;
    }
    return g.compositionWeight > 0;
  }

  compositionWeightPercent(periodId: number): number {
    const g = this.getGrid(periodId);
    return g != null ? g.compositionWeight * 100 : 0;
  }

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        tap((id) => {
          if (id == null) {
            this.sortedClasses = [];
            this.currentClassId = null;
            this.periods = [];
            this.grids.clear();
            this.loadingPeriodIds.clear();
            this.selectedClassIndex = 0;
            this.loadingClasses = false;
            return;
          }
          this.loadingClasses = true;
        }),
        switchMap((schoolId) => {
          if (schoolId == null) {
            return of<SchoolClassDto[]>([]);
          }
          return this.schoolClassService.listForActiveSchoolYear(schoolId).pipe(
            catchError(() => {
              this.snackBar.open('Chargement des classes impossible.', 'Fermer', { duration: 5000 });
              return of<SchoolClassDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.loadingClasses = false;
        this.sortedClasses = this.sortClasses(list);
        this.grids.clear();
        this.loadingPeriodIds.clear();
        this.periods = [];
        this.selectedClassIndex = 0;
        const first = this.sortedClasses[0];
        if (first) {
          this.currentClassId = first.id;
          this.loadPeriodsForClass(first.id, true);
        } else {
          this.currentClassId = null;
        }
      });
  }

  onClassTabChange(index: number): void {
    this.selectedClassIndex = index;
    const cl = this.sortedClasses[index];
    if (!cl) {
      return;
    }
    this.currentClassId = cl.id;
    this.grids.clear();
    this.loadingPeriodIds.clear();
    this.periods = [];
    this.loadPeriodsForClass(cl.id, true);
  }

  onPeriodTabChange(event: MatTabChangeEvent): void {
    const p = this.periods[event.index];
    const cid = this.currentClassId;
    if (p && cid != null) {
      this.ensureGrid(cid, p.id);
    }
  }

  getGrid(periodId: number): PeriodNotesGridResponse | null {
    return this.grids.get(periodId) ?? null;
  }

  /** Bandeau d’info si les données viennent du snapshot nocturne. */
  snapshotGridDisclaimer(periodId: number): string | null {
    const g = this.getGrid(periodId);
    if (!g?.dataFromSnapshot || g.snapshotAsOf == null) {
      return null;
    }
    const d = new Date(g.snapshotAsOf);
    if (Number.isNaN(d.getTime())) {
      return (
        'Les moyennes et rangs proviennent d’un enregistrement en base. ' +
        'Les notes saisies après le dernier calcul seront intégrées au prochain recalcul nocturne.'
      );
    }
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return (
      `Les moyennes et rangs ont été mis à jour le ${dateStr} à ${timeStr}. ` +
      'Les notes saisies après cette heure seront prises en compte lors du prochain calcul nocturne.'
    );
  }

  /**
   * Chargement de la grille pour l’onglet période (skeleton + désactivation des actions).
   */
  isLoading(periodId: number): boolean {
    return this.loadingPeriodIds.has(periodId);
  }

  /** Lignes factices du squelette (hauteur du tableau de notes). */
  readonly skeletonRowPlaceholders: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

  /**
   * Nombre de colonnes matières pour le squelette : aligné sur une autre période déjà chargée
   * pour la même classe si possible, sinon 5.
   */
  skeletonSubjectCount(_periodId: number): number {
    for (const g of this.grids.values()) {
      if (this.currentClassId != null && g.classId === this.currentClassId) {
        return Math.max(1, g.columns.length);
      }
    }
    return 5;
  }

  skeletonSubjectIndices(periodId: number): number[] {
    const n = this.skeletonSubjectCount(periodId);
    return Array.from({ length: n }, (_, i) => i);
  }

  displayedColumnsFor(periodId: number): string[] {
    const g = this.grids.get(periodId);
    if (!g) {
      return [];
    }
    return ['student', ...g.columns.map((c) => 'subj_' + c.classSubjectId), 'general'];
  }

  colLabel(c: { subjectCode: string; subjectName: string }): string {
    return c.subjectCode ? `${c.subjectCode} — ${c.subjectName}` : c.subjectName;
  }

  formatCell(v: number | null): string {
    if (v == null || Number.isNaN(v)) {
      return '—';
    }
    return v.toFixed(2);
  }

  /**
   * Badge visuel sur la moyenne générale /20.
   */
  generalBadgeClass(v: number | null): string {
    if (v == null || Number.isNaN(v)) {
      return 'moy-badge moy-badge--na';
    }
    if (v >= 12) {
      return 'moy-badge moy-badge--high';
    }
    if (v >= 10) {
      return 'moy-badge moy-badge--ok';
    }
    if (v >= 8) {
      return 'moy-badge moy-badge--mid';
    }
    return 'moy-badge moy-badge--low';
  }

  trackByStudentId = (_: number, r: { studentId: number }): number => r.studentId;

  trackByPeriodId = (_: number, p: GradingPeriodSummary): number => p.id;

  trackByIndex = (index: number) => index;

  exportPdf(periodId: number): void {
    const classId = this.currentClassId;
    if (classId == null) {
      return;
    }
    const cl = this.sortedClasses[this.selectedClassIndex];
    const baseName = (cl?.name ?? 'classe').replace(/[^a-zA-Z0-9._-]+/g, '-');
    this.gradingApi.downloadPeriodNotesPdf(classId, periodId).subscribe({
      next: (blob) => {
        const name = `releve-notes-${baseName}-periode-${periodId}.pdf`;
        this.triggerDownload(blob, name);
        this.snackBar.open('PDF généré.', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Export PDF impossible.', 'Fermer', { duration: 5000 });
      }
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private loadPeriodsForClass(classId: number, loadFirstGrid: boolean): void {
    this.evalApi
      .listGradingPeriods(classId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.snackBar.open('Chargement des périodes impossible.', 'Fermer', { duration: 5000 });
          return of<GradingPeriodSummary[]>([]);
        })
      )
      .subscribe((p) => {
        this.periods = p;
        if (loadFirstGrid && p.length > 0 && this.currentClassId === classId) {
          this.ensureGrid(classId, p[0].id);
        }
      });
  }

  private ensureGrid(classId: number, periodId: number): void {
    if (this.grids.has(periodId) || this.loadingPeriodIds.has(periodId)) {
      return;
    }
    this.loadingPeriodIds.add(periodId);
    this.gradingApi
      .getPeriodNotesGrid(classId, periodId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          const msg = err?.error?.message || 'Chargement de la grille impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
          return of(null);
        })
      )
      .subscribe((g) => {
        this.loadingPeriodIds.delete(periodId);
        if (g) {
          this.grids.set(periodId, g);
        }
      });
  }

  private sortClasses(list: SchoolClassDto[]): SchoolClassDto[] {
    const orderByGroupCode: Record<string, number> = { MAT: 1, PRI: 2, COL: 3, LYC: 4 };
    return (list ?? [])
      .slice()
      .sort((a, b) => {
        const ag = a.level?.group?.code ?? '_';
        const bg = b.level?.group?.code ?? '_';
        const ao = orderByGroupCode[ag] ?? Number.MAX_SAFE_INTEGER;
        const bo = orderByGroupCode[bg] ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) {
          return ao - bo;
        }
        const al = a.level?.id ?? 0;
        const bl = b.level?.id ?? 0;
        if (al !== bl) {
          return al - bl;
        }
        return (a.id ?? 0) - (b.id ?? 0);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
