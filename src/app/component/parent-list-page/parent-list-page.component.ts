import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import { ParentApiService } from '../../service/parent-api.service';
import { ParentListRowDto } from '../../models/parent-list.models';
import { AuthUtilsService } from '../../service/auth-utils.service';
import { ROLES_STUDENT_WRITE } from '../../core/app-roles';

@Component({
  selector: 'app-parent-list-page',
  templateUrl: './parent-list-page.component.html',
  styleUrls: ['./parent-list-page.component.scss']
})
export class ParentListPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = false;
  schoolId: number | null = null;
  allRows: ParentListRowDto[] = [];
  /** Filtrage local : nom, prénom, email ou téléphone. */
  filterText = '';

  readonly displayedColumns = ['lastName', 'firstName', 'phone', 'email', 'enrolledChildrenCount', 'actions'];
  readonly canEditParent = this.authUtils.hasAnyRole([...ROLES_STUDENT_WRITE]);

  constructor(
    private readonly activeSchool: ActiveSchoolService,
    private readonly parentApi: ParentApiService,
    private readonly snackBar: MatSnackBar,
    private readonly authUtils: AuthUtilsService
  ) {}

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        switchMap((id) => {
          this.schoolId = id;
          this.allRows = [];
          if (id == null) {
            return of<ParentListRowDto[]>([]);
          }
          this.loading = true;
          return this.parentApi.listForSchoolActiveYear(id).pipe(
            catchError((err) => {
              this.snackBar.open(err?.error?.message || 'Impossible de charger les parents.', 'Fermer', {
                duration: 5000
              });
              return of<ParentListRowDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((rows) => {
        this.loading = false;
        this.allRows = rows ?? [];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredRows(): ParentListRowDto[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) {
      return this.allRows;
    }
    return this.allRows.filter((r) => {
      const hay = [r.lastName, r.firstName, r.phone, r.email ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
}
