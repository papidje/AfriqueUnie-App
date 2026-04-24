import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject as RxSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppRoles } from '../../core/app-roles';
import { ClassPlanningView, ClassSubjectRow, TeacherSummary } from '../../models/subject.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { ClassSubjectService } from '../../service/class-subject.service';
import { resolveSchoolClassId } from '../../util/class-route.util';

@Component({
  selector: 'app-class-planning-page',
  templateUrl: './class-planning-page.component.html',
  styleUrls: ['./class-planning-page.component.scss']
})
export class ClassPlanningPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new RxSubject<void>();

  classId: number | null = null;
  workspaceChild = false;
  view: ClassPlanningView | null = null;
  teachers: TeacherSummary[] = [];
  loading = true;
  savingRowId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly classSubjectService: ClassSubjectService,
    private readonly authUtils: AuthUtilsService,
    private readonly snackBar: MatSnackBar
  ) {}

  /** Affectation réservée au personnel de direction (pas aux comptes professeur seuls). */
  get canEditTeachers(): boolean {
    return this.authUtils.hasAnyRole([AppRoles.ADMIN_ECOLE, AppRoles.STAFF, AppRoles.DIRECTOR]);
  }

  get pageTitle(): string {
    const n = this.view?.className?.trim();
    return n ? `Planning : ${n}` : 'Planning de la classe';
  }

  get introLine(): string {
    const n = this.view?.className?.trim();
    const who = n || (this.classId != null ? `Classe #${this.classId}` : '');
    return `${who} — matières, coefficients et professeurs assignés.`;
  }

  ngOnInit(): void {
    this.workspaceChild = !!this.route.snapshot.data['workspaceChild'];
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

  private reload(): void {
    if (this.classId == null) {
      return;
    }
    this.loading = true;
    this.view = null;
    this.teachers = [];
    this.classSubjectService.getPlanning(this.classId).subscribe({
      next: (v) => {
        this.view = v;
        if (this.canEditTeachers) {
          this.classSubjectService.listTeachersForSchool(v.schoolId).subscribe({
            next: (t) => {
              this.teachers = t;
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              this.snackBar.open('Impossible de charger la liste des professeurs.', 'Fermer', {
                duration: 5000
              });
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger le planning de la classe.', 'Fermer', {
          duration: 5000
        });
      }
    });
  }

  onTeacherChange(row: ClassSubjectRow, teacherId: number | null): void {
    if (!this.canEditTeachers || this.classId == null) {
      return;
    }
    const prev = row.teacherId ?? null;
    const next = teacherId ?? null;
    if (prev === next) {
      return;
    }
    this.savingRowId = row.id;
    this.classSubjectService.assignTeacher(row.id, next).subscribe({
      next: (updated) => {
        row.teacherId = updated.teacherId;
        row.teacherFullname = updated.teacherFullname;
        this.savingRowId = null;
        this.snackBar.open('Professeur mis à jour.', 'Fermer', { duration: 2500 });
      },
      error: () => {
        this.savingRowId = null;
        this.snackBar.open('Affectation impossible.', 'Fermer', { duration: 5000 });
        this.reload();
      }
    });
  }

  isRowSaving(row: ClassSubjectRow): boolean {
    return this.savingRowId === row.id;
  }
}
