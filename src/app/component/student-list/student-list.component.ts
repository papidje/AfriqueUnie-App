import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActiveSchoolService } from '../../service/active-school.service';
import { SchoolClassService } from '../../service/school-class.service';
import { StudentApiService } from '../../service/student-api.service';
import { SchoolClassDto } from '../../models/academic.models';
import { StudentListRow } from '../../models/student-list.models';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-student-list',
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.scss']
})
export class StudentListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  schoolId: number | null = null;
  loadingClasses = false;

  classes: SchoolClassDto[] = [];
  sortedClasses: SchoolClassDto[] = [];

  selectedIndex = 0;

  readonly displayedColumns = ['lastName', 'firstName', 'matricule', 'sex', 'birthDate'];

  readonly studentsByClassId = new Map<number, StudentListRow[]>();
  readonly loadingByClassId = new Set<number>();

  constructor(
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolClassService: SchoolClassService,
    private readonly studentApi: StudentApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.schoolId = this.activeSchool.getActiveSchoolId();

    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        tap((id) => {
          this.schoolId = id;
          this.studentsByClassId.clear();
          this.loadingByClassId.clear();
          this.sortedClasses = [];
          this.selectedIndex = 0;
        }),
        switchMap((schoolId) => {
          if (schoolId == null) {
            return of<SchoolClassDto[]>([]);
          }
          this.loadingClasses = true;
          return this.schoolClassService.listForActiveSchoolYear(schoolId).pipe(
            catchError(() => {
              this.snackBar.open('Impossible de charger les classes.', 'Fermer', { duration: 5000 });
              return of<SchoolClassDto[]>([]);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((classes) => {
        this.loadingClasses = false;
        this.classes = classes || [];
        this.sortedClasses = this.sortClasses(this.classes);

        const classIdFromUrl = this.route.snapshot.queryParamMap.get('classId');
        if (classIdFromUrl != null && classIdFromUrl !== '') {
          this.selectClassFromQueryParam(classIdFromUrl);
        } else {
          const first = this.sortedClasses[0];
          if (first) {
            this.loadStudentsForClass(first.id);
          }
        }
      });

    this.route.queryParamMap
      .pipe(
        takeUntil(this.destroy$),
        map((p) => p.get('classId') ?? ''),
        distinctUntilChanged(),
        filter((classId) => !!classId && this.sortedClasses.length > 0)
      )
      .subscribe((classId) => {
        this.selectClassFromQueryParam(classId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabIndexChange(index: number): void {
    this.selectedIndex = index;
    const cl = this.sortedClasses[index];
    if (!cl) return;
    this.loadStudentsForClass(cl.id);
  }

  getStudentsForClass(classId: number): StudentListRow[] {
    return this.studentsByClassId.get(classId) ?? [];
  }

  isLoading(classId: number): boolean {
    return this.loadingByClassId.has(classId);
  }

  private loadStudentsForClass(classId: number): void {
    if (this.studentsByClassId.has(classId)) return;
    if (this.loadingByClassId.has(classId)) return;

    this.loadingByClassId.add(classId);
    this.studentApi
      .getByClass(classId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.snackBar.open("Impossible de charger les élèves pour cette classe.", 'Fermer', { duration: 5000 });
          return of<StudentListRow[]>([]);
        })
      )
      .subscribe((rows) => {
        this.studentsByClassId.set(classId, rows || []);
        this.loadingByClassId.delete(classId);
      });
  }

  sexLabel(civility: string): string {
    if (civility === 'MONSIEUR') return 'Garçon';
    if (civility === 'MADAME') return 'Fille';
    return civility ?? '';
  }

  tabClassesLabel(cl: SchoolClassDto): string {
    return cl.name;
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
        if (ao !== bo) return ao - bo;

        const al = a.level?.id ?? 0;
        const bl = b.level?.id ?? 0;
        if (al !== bl) return al - bl;

        return (a.id ?? 0) - (b.id ?? 0);
      });
  }

  goToRegistration(): void {
    void this.router.navigate(['/students/inscription']);
  }

  /**
   * Sélectionne l’onglet de la classe indiquée (ex. après inscription : ?classId=…)
   * et recharge la liste pour inclure le nouvel élève.
   */
  private selectClassFromQueryParam(classIdParam: string): void {
    const id = Number(classIdParam);
    if (!Number.isFinite(id) || !this.sortedClasses.length) {
      return;
    }
    const idx = this.sortedClasses.findIndex((c) => c.id === id);
    if (idx < 0) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { classId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      const first = this.sortedClasses[0];
      if (first) {
        this.selectedIndex = 0;
        this.loadStudentsForClass(first.id);
      }
      return;
    }
    this.selectedIndex = idx;
    this.studentsByClassId.delete(id);
    this.loadStudentsForClass(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { classId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}

