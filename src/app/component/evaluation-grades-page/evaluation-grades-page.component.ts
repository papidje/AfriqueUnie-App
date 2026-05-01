import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { merge, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppRoles } from '../../core/app-roles';
import { GradeSheetResponse, GradeUpsertRequest } from '../../models/evaluation.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { EvaluationApiService } from '../../service/evaluation-api.service';
import { resolveSchoolClassId } from '../../util/class-route.util';

@Component({
  selector: 'app-evaluation-grades-page',
  templateUrl: './evaluation-grades-page.component.html',
  styleUrls: ['./evaluation-grades-page.component.scss']
})
export class EvaluationGradesPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  /** Invalide les écouteurs de lignes lors d’un rechargement du FormArray. */
  private readonly formRowWatchReset$ = new Subject<void>();

  evaluationId: number | null = null;
  classId: number | null = null;
  workspaceChild = false;
  loading = true;
  saving = false;
  sheet: GradeSheetResponse | null = null;

  /** Métadonnées affichées (nom) — le FormArray porte id + note + commentaire. */
  rowMetas: { studentId: number; lastName: string; firstName: string }[] = [];

  /** Copie des valeurs côté serveur après chargement (ou apres enregistrement) pour l’indicateur « en attente ». */
  private serverSnapshot: { value: number | null; comment: string }[] = [];

  /** Lignes dont l’input note vient d’être modifié (animation courte). */
  readonly flashingRowIndices = new Set<number>();

  readonly gradeForm: FormGroup;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly evalApi: EvaluationApiService,
    private readonly authUtils: AuthUtilsService,
    private readonly snackBar: MatSnackBar,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.gradeForm = this.fb.group({
      rows: this.fb.array([])
    });
  }

  get rowsArray(): FormArray {
    return this.gradeForm.get('rows') as FormArray;
  }

  get canWrite(): boolean {
    return this.authUtils.hasAnyRole([
      AppRoles.ADMIN_ECOLE,
      AppRoles.STAFF,
      AppRoles.DIRECTOR,
      AppRoles.TEACHER
    ]);
  }

  get titleLine(): string {
    const t = this.sheet?.evaluation?.title?.trim();
    return t ? t : 'Saisie des notes';
  }

  get maxScore(): number {
    const m = this.sheet?.evaluation?.maxScore;
    return m != null && m > 0 && Number.isFinite(m) ? m : 20;
  }

  get hasInvalidNote(): boolean {
    for (const g of this.rowsArray.controls) {
      if (this.isGroupOverMax(g)) {
        return true;
      }
    }
    return false;
  }

  get saveDisabled(): boolean {
    return this.saving || this.hasInvalidNote;
  }

  ngOnInit(): void {
    this.workspaceChild = !!this.route.snapshot.data['workspaceChild'];
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const eid = Number(this.route.snapshot.paramMap.get('evaluationId'));
      this.evaluationId = Number.isFinite(eid) && eid > 0 ? eid : null;
      this.classId = resolveSchoolClassId(this.route);
      if (this.evaluationId == null) {
        this.loading = false;
        return;
      }
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.clearFlashTimers();
    this.formRowWatchReset$.next();
    this.formRowWatchReset$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  backToList(): void {
    if (this.classId != null) {
      void this.router.navigate(['/classes', this.classId, 'evaluations']);
    } else {
      void this.router.navigate(['/classes']);
    }
  }

  isRowDirty(index: number): boolean {
    const g = this.rowsArray.at(index);
    const snap = this.serverSnapshot[index];
    if (!g || !snap) {
      return false;
    }
    const v = this.parseNoteValue(g.get('value')?.value);
    const c = this.normalizeComment(g.get('comment')?.value);
    if (!this.notesEqual(v, snap.value)) {
      return true;
    }
    return c !== snap.comment;
  }

  isGroupOverMax(g: AbstractControl): boolean {
    const v = this.parseNoteValue((g as FormGroup).get('value')?.value);
    return v != null && Number.isFinite(v) && v > this.maxScore;
  }

  isRowFlashing(i: number): boolean {
    return this.flashingRowIndices.has(i);
  }

  trackByIndex(i: number): number {
    return i;
  }

  saveAll(): void {
    if (!this.canWrite || this.saving || this.evaluationId == null) {
      return;
    }
    const cap = this.maxScore;
    const body: GradeUpsertRequest[] = this.rowsArray.controls.map((c) => {
      const g = c as FormGroup;
      return {
        studentId: g.get('studentId')!.value as number,
        value: this.parseNoteValue(g.get('value')?.value),
        comment: this.normalizeComment(g.get('comment')?.value) || null
      };
    });
    for (const r of body) {
      if (r.value != null && r.value > cap) {
        this.snackBar.open(
          `Une note dépasse le maximum (${cap}) pour cette évaluation.`,
          'Fermer',
          { duration: 6000 }
        );
        return;
      }
    }
    this.saving = true;
    this.evalApi
      .saveGrades(this.evaluationId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.syncServerSnapshotFromForm();
          this.snackBar.open('Toutes les notes ont été enregistrées.', 'Fermer', { duration: 3000 });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          const msg = err?.error?.message || 'Enregistrement impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        }
      });
  }

  private clearFlashTimers(): void {
    this.flashTimerIds.forEach((t) => clearTimeout(t));
    this.flashTimerIds.clear();
    this.flashingRowIndices.clear();
  }

  private flashTimerIds = new Map<number, ReturnType<typeof setTimeout>>();

  private load(): void {
    if (this.evaluationId == null) {
      return;
    }
    this.loading = true;
    this.clearFormAndMeta();
    this.evalApi
      .getGradeSheet(this.evaluationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sheet = data;
          this.buildFormFromSheet(data);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Chargement de la feuille de notes impossible.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private clearFormAndMeta(): void {
    this.clearFlashTimers();
    this.formRowWatchReset$.next();
    this.rowMetas = [];
    this.serverSnapshot = [];
    while (this.rowsArray.length) {
      this.rowsArray.removeAt(0);
    }
  }

  private buildFormFromSheet(data: GradeSheetResponse): void {
    const cap = this.maxScore;
    for (const r of data.rows) {
      this.rowMetas.push({
        studentId: r.studentId,
        lastName: r.lastName,
        firstName: r.firstName
      });
      const comment = (r.comment ?? '').trim();
      this.serverSnapshot.push({
        value: r.value,
        comment
      });
      const g = this.fb.group({
        studentId: this.fb.control(r.studentId),
        value: this.fb.control<number | null>(r.value, [
          (ctrl) => {
            const n = this.parseNoteValue(ctrl.value);
            if (n == null) {
              return null;
            }
            if (n > cap) {
              return { max: { max: cap, actual: n } };
            }
            return null;
          }
        ]),
        comment: this.fb.control(comment, [Validators.maxLength(500)])
      });
      this.rowsArray.push(g);
    }
    const until = merge(this.destroy$, this.formRowWatchReset$);
    this.rowsArray.controls.forEach((c, i) => {
      const g = c as FormGroup;
      merge(g.get('value')!.valueChanges, g.get('comment')!.valueChanges)
        .pipe(takeUntil(until))
        .subscribe(() => {
          this.triggerRowFlash(i);
        });
    });
    if (!this.canWrite) {
      this.gradeForm.disable({ emitEvent: false });
    } else {
      this.gradeForm.enable({ emitEvent: false });
    }
  }

  private triggerRowFlash(i: number): void {
    const prev = this.flashTimerIds.get(i);
    if (prev != null) {
      clearTimeout(prev);
    }
    this.flashingRowIndices.add(i);
    const t = setTimeout(() => {
      this.flashingRowIndices.delete(i);
      this.flashTimerIds.delete(i);
      this.cdr.markForCheck();
    }, 400);
    this.flashTimerIds.set(i, t);
    this.cdr.markForCheck();
  }

  private syncServerSnapshotFromForm(): void {
    this.serverSnapshot = this.rowsArray.controls.map((c) => {
      const g = c as FormGroup;
      return {
        value: this.parseNoteValue(g.get('value')?.value),
        comment: this.normalizeComment(g.get('comment')?.value)
      };
    });
  }

  private parseNoteValue(v: unknown): number | null {
    if (v === null || v === undefined) {
      return null;
    }
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) {
        return null;
      }
      const n = Number(t.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v === 'number') {
      return Number.isFinite(v) ? v : null;
    }
    return null;
  }

  private normalizeComment(v: unknown): string {
    if (v == null) {
      return '';
    }
    return String(v).trim();
  }

  private notesEqual(a: number | null, b: number | null): boolean {
    if (a == null && b == null) {
      return true;
    }
    if (a == null || b == null) {
      return false;
    }
    return Math.abs(a - b) < 1e-9;
  }
}
