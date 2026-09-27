import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Subject as RxSubject, EMPTY, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectAdditionRequestSummary } from '../../models/subject-addition-request.models';
import { SubjectService } from '../../service/subject.service';
import { SubjectAdditionRequestService } from '../../service/subject-addition-request.service';
import { ActiveSchoolService } from '../../service/active-school.service';
import { classLevelGroupSortKey } from '../../core/class-level-group-order';
import {
  SubjectAdditionRequestDialogComponent,
  SubjectAdditionRequestDialogData
} from '../subject-addition-request-dialog/subject-addition-request-dialog.component';
import {
  SubjectAdditionRequestDetailDialogComponent,
  SubjectAdditionRequestDetailDialogData
} from '../subject-addition-request-detail-dialog/subject-addition-request-detail-dialog.component';
import { formatNotificationDateTime } from '../../shared/util/display-date.util';

interface SubjectCycleGroup {
  groupCode: string;
  groupLabel: string;
  subjects: SchoolSubject[];
}

@Component({
  selector: 'app-subjects-catalog-page',
  templateUrl: './subjects-catalog-page.component.html',
  styleUrls: ['./subjects-catalog-page.component.scss']
})
export class SubjectsCatalogPageComponent implements OnInit, OnDestroy {
  subjects: SchoolSubject[] = [];
  cycleGroups: SubjectCycleGroup[] = [];
  localSubjects: SchoolSubject[] = [];
  openRequests: SubjectAdditionRequestSummary[] = [];
  loading = true;
  schoolId: number | null = null;

  private readonly destroy$ = new RxSubject<void>();

  constructor(
    private readonly subjectService: SubjectService,
    private readonly requestService: SubjectAdditionRequestService,
    private readonly snackBar: MatSnackBar,
    private readonly activeSchool: ActiveSchoolService,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute
  ) {}

  openCreateRequest(): void {
    if (this.schoolId == null) {
      return;
    }
    const data: SubjectAdditionRequestDialogData = { schoolId: this.schoolId };
    this.dialog
      .open(SubjectAdditionRequestDialogComponent, {
        data,
        width: '560px',
        maxWidth: '95vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.refreshAll();
        }
      });
  }

  openRequest(row: SubjectAdditionRequestSummary): void {
    const data: SubjectAdditionRequestDetailDialogData = { requestId: row.id, asSuperAdmin: false };
    this.dialog
      .open(SubjectAdditionRequestDetailDialogComponent, {
        data,
        width: '640px',
        maxWidth: '95vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe(() => this.refreshRequests());
  }

  formatDt(value: string | null | undefined): string {
    return formatNotificationDateTime(value);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'Ouverte';
      case 'ACCEPTED':
        return 'Acceptée';
      case 'REFUSED':
        return 'Refusée';
      default:
        return status;
    }
  }

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        switchMap((id) => {
          this.schoolId = id;
          if (id == null) {
            this.subjects = [];
            this.cycleGroups = [];
            this.localSubjects = [];
            this.openRequests = [];
            this.loading = false;
            return EMPTY;
          }
          this.loading = true;
          return forkJoin({
            subjects: this.subjectService.list(id).pipe(catchError(() => of<SchoolSubject[]>([]))),
            requests: this.requestService.listMine('OPEN').pipe(
              catchError(() => of<SubjectAdditionRequestSummary[]>([]))
            )
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (bundle) => {
          this.applySubjects(bundle.subjects);
          this.openRequests = bundle.requests;
          this.loading = false;
          this.openRequestFromQuery();
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Impossible de charger le référentiel.', 'Fermer', { duration: 5000 });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  deleteLocal(s: SchoolSubject): void {
    if (this.schoolId == null || s.schoolId == null) {
      return;
    }
    if (!confirm(`Supprimer la matière locale « ${s.name} » ?`)) {
      return;
    }
    this.subjectService.delete(this.schoolId, s.id).subscribe({
      next: () => {
        this.snackBar.open('Matière locale supprimée.', 'Fermer', { duration: 3000 });
        this.refreshAll();
      },
      error: () => {
        this.snackBar.open('Suppression impossible (matière affectée à une classe ?).', 'Fermer', {
          duration: 6000
        });
      }
    });
  }

  private refreshAll(): void {
    if (this.schoolId == null) {
      return;
    }
    this.loading = true;
    forkJoin({
      subjects: this.subjectService.list(this.schoolId).pipe(catchError(() => of<SchoolSubject[]>([]))),
      requests: this.requestService.listMine('OPEN').pipe(catchError(() => of<SubjectAdditionRequestSummary[]>([])))
    }).subscribe({
      next: (bundle) => {
        this.applySubjects(bundle.subjects);
        this.openRequests = bundle.requests;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private refreshRequests(): void {
    this.requestService.listMine('OPEN').subscribe({
      next: (rows) => {
        this.openRequests = rows;
      }
    });
  }

  private applySubjects(list: SchoolSubject[]): void {
    this.subjects = list || [];
    this.localSubjects = this.subjects.filter((s) => s.schoolId != null);
    const shared = this.subjects.filter((s) => s.schoolId == null);
    const byGroup = new Map<string, SubjectCycleGroup>();
    const labels: Record<string, string> = {
      PRE: 'Pré scolaire',
      MAT: 'Maternelle',
      PRI: 'Primaire',
      COL: 'Collège',
      LYC: 'Lycée'
    };
    for (const s of shared) {
      const codes = s.levelGroupCodes?.length ? s.levelGroupCodes : ['_'];
      for (const code of codes) {
        if (!byGroup.has(code)) {
          byGroup.set(code, {
            groupCode: code,
            groupLabel: labels[code] || code,
            subjects: []
          });
        }
        byGroup.get(code)!.subjects.push(s);
      }
    }
    this.cycleGroups = Array.from(byGroup.values())
      .map((g) => ({
        ...g,
        subjects: g.subjects.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      }))
      .sort((a, b) => classLevelGroupSortKey(a.groupCode) - classLevelGroupSortKey(b.groupCode));
  }

  private openRequestFromQuery(): void {
    const raw = this.route.snapshot.queryParamMap.get('requestId');
    const id = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    const data: SubjectAdditionRequestDetailDialogData = { requestId: id, asSuperAdmin: false };
    this.dialog.open(SubjectAdditionRequestDetailDialogComponent, {
      data,
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false
    });
  }
}
