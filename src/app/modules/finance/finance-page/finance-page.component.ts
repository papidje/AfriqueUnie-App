import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ActiveSchoolService } from '../../../service/active-school.service';
import { SchoolClassService } from '../../../service/school-class.service';
import { FinanceApiService } from '../../../service/finance-api.service';
import { SchoolClassDto } from '../../../models/academic.models';
import { StudentPaymentStatusDto } from '../../../models/finance.models';
import { AuthUtilsService } from '../../../service/auth-utils.service';
import { ROLES_FEE_SETTINGS_NAV } from '../../../core/app-roles';

@Component({
  selector: 'app-finance-page',
  templateUrl: './finance-page.component.html',
  styleUrls: ['./finance-page.component.scss']
})
export class FinancePageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly pieCircumference = 2 * Math.PI * 14;

  schoolId: number | null = null;
  loadingClasses = false;
  selectedIndex = 0;

  classes: SchoolClassDto[] = [];
  sortedClasses: SchoolClassDto[] = [];

  readonly rowsByClassId = new Map<number, StudentPaymentStatusDto[]>();
  readonly loadingByClassId = new Set<number>();

  readonly months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
  readonly baseColumns = ['index', 'fullName', 'matricule', 'phone', 'insReins'];

  constructor(
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolClassService: SchoolClassService,
    private readonly financeApi: FinanceApiService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly location: Location,
    private readonly authUtils: AuthUtilsService
  ) {}

  canAccessFeeSettings(): boolean {
    return this.authUtils.hasAnyRole([...ROLES_FEE_SETTINGS_NAV]);
  }

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(
        distinctUntilChanged(),
        tap((id) => {
          this.schoolId = id;
          this.loadingClasses = id != null;
          this.selectedIndex = 0;
          this.rowsByClassId.clear();
          this.loadingByClassId.clear();
          this.sortedClasses = [];
        }),
        switchMap((id) => {
          if (id == null) return of<SchoolClassDto[]>([]);
          return this.schoolClassService.listForActiveSchoolYear(id).pipe(
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
        /*
         * Après retour depuis /finance/payment/…, la liste des classes peut revenir du cache
         * avant que router.url ne contienne encore ?classId= — on ré-applique au tick suivant.
         */
        setTimeout(() => this.applyFinanceClassTabFromUrl(this.router.url), 0);
        this.cdr.markForCheck();
      });

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      )
      .subscribe((e) => {
        if (!this.sortedClasses.length) {
          return;
        }
        this.applyFinanceClassTabFromUrl(e.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    this.selectedIndex = index;
    const clazz = this.sortedClasses[index];
    if (clazz) this.loadRows(clazz.id);
  }

  rows(classId: number): StudentPaymentStatusDto[] {
    return this.rowsByClassId.get(classId) ?? [];
  }

  isLoading(classId: number): boolean {
    return this.loadingByClassId.has(classId);
  }

  rowIndex(i: number): number {
    return i + 1;
  }

  fullName(row: StudentPaymentStatusDto): string {
    return `${row.lastName || ''} ${row.firstName || ''}`.trim();
  }

  formatInsReins(row: StudentPaymentStatusDto): string {
    const label = (row.insReinsLabel || 'INS/REINS').toUpperCase();
    return `${label} ${this.asMoney(Number(row.insReinsPaid || 0))} / ${this.asMoney(Number(row.insReinsExpected || 0))}`;
  }

  insReinsRatio(row: StudentPaymentStatusDto): number {
    const paid = Number(row.insReinsPaid || 0);
    const expected = Number(row.insReinsExpected || 0);
    if (expected <= 0) return 1;
    return Math.max(0, Math.min(1, paid / expected));
  }

  insReinsPercent(row: StudentPaymentStatusDto): number {
    return Math.round(this.insReinsRatio(row) * 100);
  }

  insReinsStrokeDasharray(row: StudentPaymentStatusDto): string {
    const paidArc = this.pieCircumference * this.insReinsRatio(row);
    return `${paidArc} ${this.pieCircumference - paidArc}`;
  }

  insReinsTooltip(row: StudentPaymentStatusDto): string {
    const label = (row.insReinsLabel || 'INS/REINS').toUpperCase();
    return `${label} : ${this.insReinsPercent(row)}% payé`;
  }

  showSuppliesColumn(classId: number): boolean {
    const rows = this.rows(classId);
    if (rows.length === 0) {
      return false;
    }
    return !!rows[0].suppliesColumnEnabled;
  }

  displayedColumnsForClass(classId: number): string[] {
    const columns = [...this.baseColumns];
    if (this.showSuppliesColumn(classId)) {
      columns.push('supplies');
    }
    return [...columns, ...this.months, 'actions'];
  }

  /** Mois de scolarité entièrement soldés (préfixe Oct→Jun, aligné sur l’API). */
  coveredMonthsCount(row: StudentPaymentStatusDto): number {
    return this.months.filter((m) => !!row.monthlyCoverage?.[m]).length;
  }

  /**
   * Remplissage de la barre : uniquement la part « 9 mois » (mois couverts / 9).
   * La piste grise couvre toujours OCT–JUN ; le vert s’arrête au dernier mois soldé.
   */
  monthsProgressFillPercent(row: StudentPaymentStatusDto): number {
    const n = this.coveredMonthsCount(row);
    return Math.min(100, Math.round((n / this.months.length) * 1000) / 10);
  }

  monthsProgressTooltip(row: StudentPaymentStatusDto): string {
    const n = this.coveredMonthsCount(row);
    const paid = this.asMoney(Number(row.totalPaid || 0));
    const exp = this.asMoney(Number(row.totalExpected || 0));
    return `Scolarité : ${n} / ${this.months.length} mois · Total encaissé : ${paid} / ${exp} GNF`;
  }

  progressClass(row: StudentPaymentStatusDto): string {
    const delay = this.expectedProgressMonthsFromToday() - this.coveredMonthsCount(row);
    if (delay <= 0) {
      return 'progress-good';
    }
    if (delay < 1) {
      return 'progress-warn';
    }
    return 'progress-late';
  }

  private expectedProgressMonthsFromToday(): number {
    const now = new Date();
    const month = now.getMonth(); // 0..11
    const day = now.getDate();

    // OCT(9) NOV(10) DEC(11) JAN(0) FEB(1) MAR(2) APR(3) MAY(4) JUN(5)
    const monthIndex = this.monthIndexInTuitionSchedule(month);
    if (monthIndex < 0) {
      // Jul/Aug/Sep -> année précédente terminée, on attend tout payé.
      return 9;
    }

    const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();
    const monthProgress = Math.max(0, Math.min(1, day / Math.max(daysInMonth, 1)));
    return monthIndex + monthProgress;
  }

  private monthIndexInTuitionSchedule(jsMonth: number): number {
    const map: Record<number, number> = {
      9: 0,  // OCT
      10: 1, // NOV
      11: 2, // DEC
      0: 3,  // JAN
      1: 4,  // FEB
      2: 5,  // MAR
      3: 6,  // APR
      4: 7,  // MAY
      5: 8   // JUN
    };
    return map[jsMonth] ?? -1;
  }

  encaisser(row: StudentPaymentStatusDto): void {
    void this.router.navigate(['/finance/payment', row.studentId]);
  }

  /**
   * Reliquat affiché côté liste (total attendu − paiements enregistrés ; fournitures soldées au flag sans ligne Payment).
   */
  remainingToPay(row: StudentPaymentStatusDto): number {
    const total = Number(row.totalExpected ?? 0);
    const paid = Number(row.totalPaid ?? 0);
    const suppliesCovered =
      row.suppliesColumnEnabled && row.hasPaidSupplies ? Number(row.suppliesExpected ?? 0) : 0;
    return Math.max(0, total - paid - suppliesCovered);
  }

  /** Tout est soldé : on masque l’action Encaisser. */
  isFullySettled(row: StudentPaymentStatusDto): boolean {
    return this.remainingToPay(row) < 1;
  }

  asMoney(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  goToSettings(): void {
    if (!this.canAccessFeeSettings()) {
      this.snackBar.open(
        'Les paramètres tarifs sont réservés aux administrateurs d\'établissement et aux directeurs.',
        'Fermer',
        { duration: 5000 }
      );
      return;
    }
    void this.router.navigate(['/finance/settings']);
  }

  /** Lit `classId` sur une URL déjà normalisée (router.url ou NavigationEnd.urlAfterRedirects). */
  private readClassIdFromUrlString(url: string): string | null {
    try {
      const v = this.router.parseUrl(url).queryParamMap.get('classId');
      return v != null && v !== '' ? v : null;
    } catch {
      return null;
    }
  }

  private applyFinanceClassTabFromUrl(url: string): void {
    if (!this.sortedClasses.length) {
      return;
    }
    const classIdFromUrl = this.readClassIdFromUrlString(url);
    if (classIdFromUrl != null && classIdFromUrl !== '') {
      this.selectClassFromQueryParam(classIdFromUrl);
      return;
    }
    const first = this.sortedClasses[0];
    if (
      first &&
      this.selectedIndex === 0 &&
      !this.rowsByClassId.has(first.id) &&
      !this.loadingByClassId.has(first.id)
    ) {
      this.loadRows(first.id);
    }
    this.cdr.markForCheck();
  }

  /**
   * Après encaissement : ?classId= ouvre l’onglet de la classe et recharge les lignes.
   */
  private selectClassFromQueryParam(classIdParam: string): void {
    const id = Number(classIdParam);
    if (!Number.isFinite(id) || !this.sortedClasses.length) {
      return;
    }
    const idx = this.sortedClasses.findIndex((c) => c.id === id);
    if (idx < 0) {
      this.stripClassIdFromBrowserUrl();
      const first = this.sortedClasses[0];
      if (first) {
        this.selectedIndex = 0;
        this.loadRows(first.id);
      }
      this.cdr.markForCheck();
      return;
    }
    this.selectedIndex = idx;
    this.rowsByClassId.delete(id);
    this.loadRows(id);
    this.stripClassIdFromBrowserUrl();
    this.cdr.markForCheck();
  }

  /** Retire `?classId=` sans `Router.navigate` (évite une ré-exécution du flux qui remet l’onglet à 0). */
  private stripClassIdFromBrowserUrl(): void {
    const full = this.router.url;
    const q = full.indexOf('?');
    if (q < 0) {
      return;
    }
    const path = full.slice(0, q);
    const params = new URLSearchParams(full.slice(q + 1));
    if (!params.has('classId')) {
      return;
    }
    params.delete('classId');
    const next = params.toString();
    this.location.replaceState(next ? `${path}?${next}` : path);
  }

  private loadRows(classId: number): void {
    if (this.rowsByClassId.has(classId) || this.loadingByClassId.has(classId)) return;

    this.loadingByClassId.add(classId);
    this.financeApi.getStatusByClass(classId).pipe(
      takeUntil(this.destroy$),
      catchError(() => {
        this.snackBar.open('Impossible de charger le suivi financier pour cette classe.', 'Fermer', { duration: 5000 });
        return of<StudentPaymentStatusDto[]>([]);
      })
    ).subscribe((rows) => {
      this.rowsByClassId.set(classId, rows || []);
      this.loadingByClassId.delete(classId);
    });
  }

  private sortClasses(list: SchoolClassDto[]): SchoolClassDto[] {
    const orderByGroupCode: Record<string, number> = { MAT: 1, PRI: 2, COL: 3, LYC: 4 };
    return (list ?? []).slice().sort((a, b) => {
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
}

