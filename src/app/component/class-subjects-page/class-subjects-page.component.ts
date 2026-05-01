import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, Subject as RxSubject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { ClassPlanningView, ClassSubjectRow, SchoolSubject } from '../../models/subject.models';
import { ClassSubjectService } from '../../service/class-subject.service';
import { SubjectService } from '../../service/subject.service';
import { resolveSchoolClassId } from '../../util/class-route.util';
import {
  ClassSubjectFormDialogComponent,
  ClassSubjectFormDialogData
} from '../class-subject-form-dialog/class-subject-form-dialog.component';

@Component({
  selector: 'app-class-subjects-page',
  templateUrl: './class-subjects-page.component.html',
  styleUrls: ['./class-subjects-page.component.scss']
})
export class ClassSubjectsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new RxSubject<void>();

  classId: number | null = null;
  /** Affichage intégré dans l’espace classe (onglets) : masque en-tête dupliqué. */
  workspaceChild = false;
  /** Libellé de la classe (API planning). */
  className: string | null = null;
  /** École pour charger les enseignants (dialogues). */
  schoolIdForTeachers: number | null = null;
  rows: ClassSubjectRow[] = [];
  catalog: SchoolSubject[] = [];
  loading = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly classSubjectService: ClassSubjectService,
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.workspaceChild = !!this.route.snapshot.data['workspaceChild'];
    const param$ =
      this.workspaceChild && this.route.parent != null ? this.route.parent.paramMap : this.route.paramMap;
    param$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.classId = resolveSchoolClassId(this.route);
      this.className = null;
      this.schoolIdForTeachers = null;
      if (this.classId == null) {
        this.loading = false;
        return;
      }
      this.reloadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Titre principal : nom de classe connu, sinon libellé générique. */
  get pageTitle(): string {
    const n = this.className?.trim();
    return n ? `Matières : ${n}` : 'Matières de la classe';
  }

  /** Sous-titre avec nom ou repli sur l’identifiant. */
  get introLine(): string {
    const who = this.className?.trim() || (this.classId != null ? `Classe #${this.classId}` : '');
    return `${who} — affectez des matières du référentiel et définissez le coefficient.`;
  }

  private reloadData(): void {
    if (this.classId == null) {
      return;
    }
    this.loading = true;
    const id = this.classId;
    this.classSubjectService
      .getPlanning(id)
      .pipe(
        catchError(() =>
          of<ClassPlanningView>({ classId: id, className: '', schoolId: 0, subjects: [] })
        ),
        switchMap((planning) => {
          const name = planning.className?.trim();
          this.className = name && name.length > 0 ? name : null;
          const sid = planning.schoolId > 0 ? planning.schoolId : null;
          this.schoolIdForTeachers = sid;
          if (sid == null || sid <= 0) {
            return this.classSubjectService.listForClass(id).pipe(
              map((rows) => ({ rows, catalog: [] as SchoolSubject[] }))
            );
          }
          return forkJoin({
            rows: this.classSubjectService.listForClass(id),
            catalog: this.subjectService.list(sid)
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ rows, catalog }) => {
          this.rows = rows;
          this.catalog = catalog;
          if ((this.schoolIdForTeachers == null || this.schoolIdForTeachers <= 0) && rows.length > 0) {
            this.schoolIdForTeachers = rows[0].schoolId;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Impossible de charger les matières de la classe.', 'Fermer', { duration: 5000 });
        }
      });
  }

  availableSubjects(): SchoolSubject[] {
    const used = new Set(this.rows.map((row) => row.subjectId));
    return this.catalog.filter((s) => !used.has(s.id));
  }

  openAddDialog(): void {
    if (this.classId == null || this.schoolIdForTeachers == null) {
      return;
    }
    const data: ClassSubjectFormDialogData = {
      mode: 'add',
      classId: this.classId,
      schoolId: this.schoolIdForTeachers,
      catalog: this.availableSubjects()
    };
    const ref = this.dialog.open(ClassSubjectFormDialogComponent, {
      width: '420px',
      data
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.reloadData();
      }
    });
  }

  openEditDialog(row: ClassSubjectRow): void {
    if (this.classId == null || this.schoolIdForTeachers == null) {
      return;
    }
    const data: ClassSubjectFormDialogData = {
      mode: 'edit',
      classId: this.classId,
      schoolId: this.schoolIdForTeachers,
      row
    };
    const ref = this.dialog.open(ClassSubjectFormDialogComponent, {
      width: '420px',
      data
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.reloadData();
      }
    });
  }

  remove(row: ClassSubjectRow): void {
    if (!confirm(`Retirer « ${row.subjectName} » de cette classe ?`)) {
      return;
    }
    this.classSubjectService.delete(row.id).subscribe({
      next: () => {
        this.snackBar.open('Matière retirée.', 'Fermer', { duration: 3000 });
        this.reloadData();
      },
      error: () => {
        this.snackBar.open('Suppression impossible.', 'Fermer', { duration: 5000 });
      }
    });
  }
}
