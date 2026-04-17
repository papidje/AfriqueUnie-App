import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClassLevel } from '../../models/academic.models';
import { FeeStructureDto, FeeStructureWritePayload } from '../../models/fee-structure.models';
import { ClassLevelService } from '../../service/class-level.service';
import { ActiveSchoolService } from '../../service/active-school.service';
import { FeeStructureService } from '../../service/fee-structure.service';
import { SchoolYearService } from '../../service/school-year.service';
import { FeeStructureDialogComponent, FeeStructureDialogResult } from './fee-structure-dialog/fee-structure-dialog.component';

interface FinancialRow {
  level: ClassLevel;
  feeStructure: FeeStructureDto | null;
}

@Component({
  selector: 'app-financial-settings-page',
  templateUrl: './financial-settings-page.component.html',
  styleUrls: ['./financial-settings-page.component.scss']
})
export class FinancialSettingsPageComponent implements OnInit {
  loading = false;
  schoolId: number | null = null;
  activeYearId: number | null = null;
  activeYearLabel: string | null = null;
  rows: FinancialRow[] = [];
  readonly displayedColumns = ['level', 'registrationFee', 'reRegistrationFee', 'monthlyTuitionFee', 'suppliesFee', 'suppliesColumnEnabled', 'actions'];

  constructor(
    private readonly classLevelService: ClassLevelService,
    private readonly activeSchoolService: ActiveSchoolService,
    private readonly schoolYearService: SchoolYearService,
    private readonly feeStructureService: FeeStructureService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.schoolId = this.activeSchoolService.getActiveSchoolId();
    if (!this.schoolId) {
      return;
    }
    this.reload();
  }

  configure(row: FinancialRow): void {
    if (!this.activeYearId || !this.activeYearLabel) {
      return;
    }
    const ref = this.dialog.open(FeeStructureDialogComponent, {
      width: '560px',
      disableClose: true,
      data: {
        schoolYearId: this.activeYearId,
        schoolYearLabel: this.activeYearLabel,
        classLevelId: row.level.id,
        classLevelCode: row.level.code,
        classLevelName: row.level.name,
        existing: row.feeStructure ?? undefined
      }
    });

    ref.afterClosed().subscribe((result?: FeeStructureDialogResult) => {
      if (!result) {
        return;
      }
      const payload: FeeStructureWritePayload = {
        classLevelId: result.classLevelId,
        schoolYearId: result.schoolYearId,
        registrationFee: result.registrationFee,
        reRegistrationFee: result.reRegistrationFee,
        monthlyTuitionFee: result.monthlyTuitionFee,
        suppliesFee: result.suppliesFee,
        suppliesColumnEnabled: result.suppliesColumnEnabled,
        currency: result.currency || 'GNF'
      };
      const req$ = result.id
        ? this.feeStructureService.update(result.id, payload)
        : this.feeStructureService.create(payload);

      req$.subscribe({
        next: () => {
          this.snackBar.open('Configuration des frais enregistrée.', 'Fermer', { duration: 3500 });
          this.reload();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Impossible d’enregistrer cette configuration.';
          this.snackBar.open(msg, 'Fermer', { duration: 5000 });
        }
      });
    });
  }

  asMoney(value: number | null | undefined, currency = 'GNF'): string {
    if (value == null) {
      return '--';
    }
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  }

  private reload(): void {
    if (!this.schoolId) {
      return;
    }
    this.loading = true;
    this.schoolYearService.getActiveForSchool(this.schoolId).subscribe({
      next: (year) => {
        if (!year) {
          this.loading = false;
          this.activeYearId = null;
          this.activeYearLabel = null;
          this.rows = [];
          return;
        }
        this.activeYearId = year.id;
        this.activeYearLabel = year.label;
        this.loadLevelsAndFees(year.id);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open("Impossible de charger l'année active.", 'Fermer', { duration: 5000 });
      }
    });
  }

  private loadLevelsAndFees(schoolYearId: number): void {
    this.classLevelService.getAll().subscribe({
      next: (levels) => {
        this.feeStructureService.listBySchoolYear(schoolYearId).subscribe({
          next: (structures) => {
            const byLevel = new Map<number, FeeStructureDto>();
            structures.forEach((s) => byLevel.set(s.classLevelId, s));
            this.rows = this.sortLevels(levels).map((level) => ({
              level,
              feeStructure: byLevel.get(level.id) ?? null
            }));
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.snackBar.open('Impossible de charger les frais configurés.', 'Fermer', { duration: 5000 });
          }
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les niveaux.', 'Fermer', { duration: 5000 });
      }
    });
  }

  private sortLevels(levels: ClassLevel[]): ClassLevel[] {
    const orderByGroupCode: Record<string, number> = {
      MAT: 1,
      PRI: 2,
      COL: 3,
      LYC: 4
    };

    return (levels ?? [])
      .slice()
      .sort((a, b) => {
        const ag = a.group?.code ?? '_';
        const bg = b.group?.code ?? '_';
        const ao = orderByGroupCode[ag] ?? Number.MAX_SAFE_INTEGER;
        const bo = orderByGroupCode[bg] ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;

        const al = a.id ?? 0;
        const bl = b.id ?? 0;
        if (al !== bl) return al - bl;

        return (a.code ?? '').localeCompare(b.code ?? '');
      });
  }
}
