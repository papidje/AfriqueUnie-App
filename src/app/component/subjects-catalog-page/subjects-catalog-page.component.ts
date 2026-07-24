import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject as RxSubject, EMPTY, of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectService } from '../../service/subject.service';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SubjectFormDialogComponent, SubjectFormDialogData } from '../subject-form-dialog/subject-form-dialog.component';

@Component({
  selector: 'app-subjects-catalog-page',
  templateUrl: './subjects-catalog-page.component.html',
  styleUrls: ['./subjects-catalog-page.component.scss']
})
export class SubjectsCatalogPageComponent implements OnInit, OnDestroy {
  subjects: SchoolSubject[] = [];
  loading = true;
  /** Établissement pour lequel le référentiel est chargé (API). */
  schoolId: number | null = null;

  private readonly destroy$ = new RxSubject<void>();

  constructor(
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar,
    private readonly activeSchool: ActiveSchoolService,
    private readonly dialog: MatDialog
  ) {}

  /** Ouvre la modale de création ; recharge si une matière est créée. */
  openCreate(): void {
    if (this.schoolId == null) {
      return;
    }
    this.openDialog({ mode: 'add', schoolId: this.schoolId });
  }

  /** Ouvre la modale d'édition ; recharge si la matière est modifiée. */
  openEdit(s: SchoolSubject): void {
    if (this.schoolId == null || this.isSharedReferential(s)) {
      return;
    }
    this.openDialog({ mode: 'edit', schoolId: this.schoolId, subject: s });
  }

  private openDialog(data: SubjectFormDialogData): void {
    this.dialog
      .open(SubjectFormDialogComponent, {
        data,
        width: '520px',
        maxWidth: '95vw',
        autoFocus: false,
        restoreFocus: true
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.refreshList();
        }
      });
  }

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
