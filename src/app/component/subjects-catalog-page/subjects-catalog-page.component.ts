import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject as RxSubject, EMPTY, of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectService } from '../../service/subject.service';
import { ActiveSchoolService } from '../../service/active-school.service';

@Component({
  selector: 'app-subjects-catalog-page',
  templateUrl: './subjects-catalog-page.component.html',
  styleUrls: ['./subjects-catalog-page.component.scss']
})
export class SubjectsCatalogPageComponent implements OnInit, OnDestroy {
  subjects: SchoolSubject[] = [];
  loading = true;
  saving = false;
  editing: SchoolSubject | null = null;
  /** Établissement pour lequel le référentiel est chargé (API). */
  schoolId: number | null = null;

  private readonly destroy$ = new RxSubject<void>();

  readonly createForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  readonly editForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar,
    private readonly activeSchool: ActiveSchoolService
  ) {}

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        switchMap((id) => {
          this.schoolId = id;
          if (id == null) {
            this.subjects = [];
            this.loading = false;
            return EMPTY;
          }
          this.loading = true;
          return this.subjectService.list(id).pipe(
            catchError(() => {
              this.loading = false;
              this.snackBar.open('Impossible de charger les matières.', 'Fermer', { duration: 5000 });
              return of<SchoolSubject[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.subjects = list;
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Recharge manuellement après création / mise à jour / suppression. */
  private refreshList(): void {
    if (this.schoolId == null) {
      return;
    }
    this.loading = true;
    this.subjectService.list(this.schoolId).subscribe({
      next: (list) => {
        this.subjects = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les matières.', 'Fermer', { duration: 5000 });
      }
    });
  }

  /** Matière du référentiel commun (lecture seule, non modifiable / supprimable ici). */
  isSharedReferential(s: SchoolSubject | null | undefined): boolean {
    return s == null || s.schoolId == null;
  }

  startEdit(s: SchoolSubject): void {
    if (this.isSharedReferential(s)) {
      return;
    }
    this.editing = s;
    this.editForm.reset({ code: s.code, name: s.name });
  }

  cancelEdit(): void {
    this.editing = null;
  }

  submitCreate(): void {
    if (this.schoolId == null) {
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.createForm.getRawValue();
    this.subjectService.create(this.schoolId, { code: v.code!.trim(), name: v.name!.trim() }).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Matière créée.', 'Fermer', { duration: 3000 });
        this.createForm.reset();
        this.refreshList();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Création impossible (code déjà utilisé ?).', 'Fermer', { duration: 5000 });
      }
    });
  }

  submitEdit(): void {
    if (this.schoolId == null || this.editing == null || this.isSharedReferential(this.editing)) {
      this.editing = null;
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.editForm.getRawValue();
    this.subjectService
      .update(this.schoolId, this.editing.id, { code: v.code!.trim(), name: v.name!.trim() })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Matière mise à jour.', 'Fermer', { duration: 3000 });
          this.editing = null;
          this.refreshList();
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Mise à jour impossible.', 'Fermer', { duration: 5000 });
        }
      });
  }

  delete(s: SchoolSubject): void {
    if (this.schoolId == null || this.isSharedReferential(s)) {
      return;
    }
    if (!confirm(`Supprimer la matière « ${s.name} » ?`)) {
      return;
    }
    this.subjectService.delete(this.schoolId, s.id).subscribe({
      next: () => {
        this.snackBar.open('Matière supprimée.', 'Fermer', { duration: 3000 });
        this.refreshList();
      },
      error: () => {
        this.snackBar.open('Suppression impossible (matière affectée à une classe ?).', 'Fermer', {
          duration: 6000
        });
      }
    });
  }
}
