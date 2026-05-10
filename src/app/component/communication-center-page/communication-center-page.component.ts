import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ActiveSchoolService } from '../../service/active-school.service';
import {
  CommunicationApiService,
  CommunicationHistoryRow,
  CommunicationScheduledPreviewRow
} from '../../service/communication-api.service';
import { SchoolClassService } from '../../service/school-class.service';
import { SchoolClassDto } from '../../models/academic.models';
import { CommunicationBatchSettingsDialogComponent } from './communication-batch-settings-dialog.component';
import { CommunicationHistoryDetailDialogComponent } from './communication-history-detail-dialog.component';

@Component({
  selector: 'app-communication-center-page',
  templateUrl: './communication-center-page.component.html',
  styleUrls: ['./communication-center-page.component.scss']
})
export class CommunicationCenterPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly historyColumns = [
    'createdAt',
    'source',
    'eventType',
    'status',
    'channel',
    'title',
    'recipientsSummary',
    'errorMessage'
  ];

  previewRows: CommunicationScheduledPreviewRow[] = [];
  previewLoading = false;

  historyRows: CommunicationHistoryRow[] = [];
  historyLoading = false;
  historyTotal = 0;
  historyPage = 0;
  historyPageSize = 25;

  manualSending = false;

  schoolClasses: SchoolClassDto[] = [];

  readonly manualForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.maxLength(8000)]],
    channel: ['EMAIL' as 'EMAIL' | 'SMS' | 'BOTH'],
    schoolClassIds: this.fb.nonNullable.control<number[]>([])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: CommunicationApiService,
    private readonly activeSchool: ActiveSchoolService,
    private readonly schoolClassService: SchoolClassService,
    private readonly dialog: MatDialog,
    private readonly snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.activeSchool.activeSchoolId$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((schoolId) => {
        this.manualForm.patchValue({ schoolClassIds: [] });
        if (schoolId == null) {
          this.schoolClasses = [];
          this.previewRows = [];
          this.previewLoading = false;
          this.historyRows = [];
          this.historyTotal = 0;
          return;
        }
        this.schoolClassService
          .listForActiveSchoolYear(schoolId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (list) => {
              this.schoolClasses = list ?? [];
            },
            error: () => {
              this.schoolClasses = [];
              this.snack.open('Impossible de charger les classes de l’établissement.', 'Fermer', { duration: 4500 });
            }
          });
        this.refreshPreview(schoolId);
        this.loadHistory(schoolId, 0);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshPreview(schoolId: number): void {
    this.previewLoading = true;
    this.api
      .getScheduledPreview(schoolId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.previewRows = rows;
          this.previewLoading = false;
        },
        error: () => {
          this.previewLoading = false;
          this.snack.open('Impossible de charger l’aperçu planifié.', 'Fermer', { duration: 5000 });
        }
      });
  }

  loadHistory(schoolId: number, pageIndex: number): void {
    this.historyLoading = true;
    this.api
      .getHistory(schoolId, pageIndex, this.historyPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => {
          this.historyRows = p.content;
          this.historyTotal = p.totalElements;
          this.historyPage = p.number;
          this.historyPageSize = p.size;
          this.historyLoading = false;
        },
        error: () => {
          this.historyLoading = false;
          this.snack.open('Impossible de charger l’historique.', 'Fermer', { duration: 5000 });
        }
      });
  }

  onHistoryPage(ev: PageEvent): void {
    const schoolId = this.activeSchool.getActiveSchoolId();
    if (schoolId == null) {
      return;
    }
    this.historyPageSize = ev.pageSize;
    this.loadHistory(schoolId, ev.pageIndex);
  }

  openBatchSettings(): void {
    this.dialog
      .open(CommunicationBatchSettingsDialogComponent, { width: '520px', autoFocus: false })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((saved) => {
        if (saved) {
          const sid = this.activeSchool.getActiveSchoolId();
          if (sid != null) {
            this.refreshPreview(sid);
          }
        }
      });
  }

  refreshPreviewForActiveSchool(): void {
    const sid = this.activeSchool.getActiveSchoolId();
    if (sid == null) {
      this.snack.open('Sélectionnez un établissement dans l’en-tête.', 'Fermer', { duration: 4500 });
      return;
    }
    this.refreshPreview(sid);
  }

  openHistoryDetail(row: CommunicationHistoryRow): void {
    this.dialog.open(CommunicationHistoryDetailDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { row }
    });
  }

  sendManual(): void {
    if (this.manualForm.invalid || this.manualSending) {
      return;
    }
    const schoolId = this.activeSchool.getActiveSchoolId();
    if (schoolId == null) {
      this.snack.open('Aucun établissement actif. Sélectionnez une école dans l’en-tête.', 'Fermer', {
        duration: 6000
      });
      return;
    }
    const v = this.manualForm.getRawValue();
    const classIds = (v.schoolClassIds ?? []).filter((id) => id != null && Number.isFinite(id) && id > 0);
    this.manualSending = true;
    this.api
      .manualSend({
        schoolId,
        title: v.title.trim(),
        message: v.message.trim(),
        channel: v.channel,
        schoolClassIds: classIds.length ? classIds : undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.manualSending = false;
          let msg = `Envoi terminé : ${res.successes} succès, ${res.failures} échec(s) sur ${res.attempted} envoi(s) distinct(s).`;
          if (res.skippedDuplicates > 0) {
            msg += ` (${res.skippedDuplicates} doublon(s) ignoré(s).)`;
          }
          this.snack.open(msg, 'OK', { duration: 7500 });
          this.manualForm.patchValue({ title: '', message: '', schoolClassIds: [] });
          const sid = this.activeSchool.getActiveSchoolId();
          if (sid != null) {
            this.loadHistory(sid, 0);
          }
        },
        error: (err) => {
          this.manualSending = false;
          const msg =
            err?.error?.message ??
            (typeof err?.error === 'string' ? err.error : null) ??
            'Erreur lors de l’envoi.';
          this.snack.open(msg, 'Fermer', { duration: 7000 });
        }
      });
  }

  statusChipClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'SUCCESS') {
      return 'chip-success';
    }
    if (s === 'FAILURE') {
      return 'chip-failure';
    }
    return '';
  }
}
