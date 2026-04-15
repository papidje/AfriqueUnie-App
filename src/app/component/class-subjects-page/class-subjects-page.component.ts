import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of, Subject as RxSubject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { ClassPlanningView, ClassSubjectRow, SchoolSubject } from '../../models/subject.models';
import { ClassSubjectService } from '../../service/class-subject.service';
import { SubjectService } from '../../service/subject.service';

@Component({
  selector: 'app-class-subjects-page',
  templateUrl: './class-subjects-page.component.html',
  styleUrls: ['./class-subjects-page.component.scss']
})
export class ClassSubjectsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new RxSubject<void>();

  classId: number | null = null;
  /** Libellé de la classe (API planning). */
  className: string | null = null;
  rows: ClassSubjectRow[] = [];
  catalog: SchoolSubject[] = [];
  loading = true;
  saving = false;

  readonly addForm = this.fb.group({
    subjectId: [null as number | null, Validators.required],
    coefficient: [1, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly classSubjectService: ClassSubjectService,
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('classId'));
      this.classId = Number.isFinite(id) ? id : null;
      this.className = null;
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
    forkJoin({
      planning: this.classSubjectService.getPlanning(id).pipe(
        catchError(() =>
          of<ClassPlanningView>({ classId: id, className: '', schoolId: 0, subjects: [] })
        )
      ),
      rows: this.classSubjectService.listForClass(id),
      catalog: this.subjectService.list()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ planning, rows, catalog }) => {
          const name = planning.className?.trim();
          this.className = name && name.length > 0 ? name : null;
          this.rows = rows;
          this.catalog = catalog;
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

  submitAdd(): void {
    if (this.classId == null || this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    if (v.subjectId == null) {
      return;
    }
    this.saving = true;
    this.classSubjectService
      .create(this.classId, { subjectId: v.subjectId, coefficient: Number(v.coefficient) })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Matière ajoutée à la classe.', 'Fermer', { duration: 3000 });
          this.addForm.patchValue({ subjectId: null, coefficient: 1 });
          this.reloadData();
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Ajout impossible (déjà affectée ?).', 'Fermer', { duration: 5000 });
        }
      });
  }

  onCoeffBlur(row: ClassSubjectRow, ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.saveCoefficient(row, value);
  }

  saveCoefficient(row: ClassSubjectRow, value: string): void {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      this.snackBar.open('Coefficient entre 1 et 20.', 'Fermer', { duration: 4000 });
      this.reloadData();
      return;
    }
    if (n === row.coefficient) {
      return;
    }
    this.classSubjectService.updateCoefficient(row.id, n).subscribe({
      next: (updated) => {
        row.coefficient = updated.coefficient;
        this.snackBar.open('Coefficient mis à jour.', 'Fermer', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('Mise à jour impossible.', 'Fermer', { duration: 5000 });
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
