import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectAdditionRequestSummary } from '../../models/subject-addition-request.models';
import { SuperAdminService } from '../../service/super-admin.service';
import {
  SubjectAdditionRequestDetailDialogComponent,
  SubjectAdditionRequestDetailDialogData
} from '../subject-addition-request-detail-dialog/subject-addition-request-detail-dialog.component';
import { formatNotificationDateTime } from '../../shared/util/display-date.util';
import { classLevelGroupSortKey } from '../../core/class-level-group-order';

interface LevelGroupOption {
  code: string;
  name: string;
}

@Component({
  selector: 'app-super-admin-subjects-page',
  templateUrl: './super-admin-subjects-page.component.html',
  styleUrls: ['./super-admin-subjects-page.component.scss']
})
export class SuperAdminSubjectsPageComponent implements OnInit {
  subjects: SchoolSubject[] = [];
  levelGroups: LevelGroupOption[] = [];
  requests: SubjectAdditionRequestSummary[] = [];
  loading = true;
  loadingRequests = true;
  saving = false;
  formOpen = false;
  editingId: number | null = null;
  requestFilter: 'OPEN' | 'CLOSED' | 'ALL' = 'OPEN';

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    levelGroupCodes: this.fb.nonNullable.control<string[]>([], [Validators.required, Validators.minLength(1)])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly superAdminService: SuperAdminService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.reload();
    this.reloadRequests();
    const raw = this.route.snapshot.queryParamMap.get('requestId');
    const id = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(id) && id > 0) {
      this.openRequest(id);
    }
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

  cycleLabel(codes: string[] | null | undefined): string {
    if (!codes?.length) {
      return '—';
    }
    const byCode = new Map(this.levelGroups.map((g) => [g.code, g.name]));
    return [...codes]
      .sort((a, b) => classLevelGroupSortKey(a) - classLevelGroupSortKey(b))
      .map((c) => byCode.get(c) || c)
      .join(', ');
  }

  setRequestFilter(filter: 'OPEN' | 'CLOSED' | 'ALL'): void {
    this.requestFilter = filter;
    this.reloadRequests();
  }

  toggleLevelGroup(code: string, checked: boolean): void {
    const current = [...(this.form.controls.levelGroupCodes.value || [])];
    const idx = current.indexOf(code);
    if (checked && idx < 0) {
      current.push(code);
    } else if (!checked && idx >= 0) {
      current.splice(idx, 1);
    }
    this.form.controls.levelGroupCodes.setValue(current);
    this.form.controls.levelGroupCodes.markAsDirty();
    this.form.controls.levelGroupCodes.updateValueAndValidity();
  }

  isLevelGroupSelected(code: string): boolean {
    return (this.form.controls.levelGroupCodes.value || []).includes(code);
  }

  reload(): void {
    this.loading = true;
    forkJoin({
      subjects: this.superAdminService.listGlobalSubjects(),
      groups: this.superAdminService.listLevelGroupOptions()
    }).subscribe({
      next: ({ subjects, groups }) => {
        this.subjects = subjects || [];
        this.levelGroups = [...(groups || [])].sort(
          (a, b) => classLevelGroupSortKey(a.code) - classLevelGroupSortKey(b.code)
        );
        this.loading = false;
      },
      error: () => {
        this.subjects = [];
        this.loading = false;
        this.snackBar.open('Impossible de charger les matières.', 'Fermer', { duration: 4000 });
      }
    });
  }

  reloadRequests(): void {
    this.loadingRequests = true;
    this.superAdminService.listSubjectAdditionRequests(this.requestFilter).subscribe({
      next: (rows) => {
        this.requests = rows || [];
        this.loadingRequests = false;
      },
      error: () => {
        this.requests = [];
        this.loadingRequests = false;
      }
    });
  }

  openRequest(id: number): void {
    const data: SubjectAdditionRequestDetailDialogData = { requestId: id, asSuperAdmin: true };
    this.dialog
      .open(SubjectAdditionRequestDetailDialogComponent, {
        data,
        width: '680px',
        maxWidth: '95vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((changed) => {
        this.reloadRequests();
        if (changed) {
          this.reload();
        }
      });
  }

  startCreate(): void {
    this.editingId = null;
    this.formOpen = true;
    this.form.reset({
      code: '',
      name: '',
      levelGroupCodes: this.levelGroups.map((g) => g.code)
    });
  }

  startEdit(s: SchoolSubject): void {
    this.editingId = s.id;
    this.formOpen = true;
    this.form.reset({
      code: s.code,
      name: s.name,
      levelGroupCodes: [...(s.levelGroupCodes || [])]
    });
  }

  cancelEdit(): void {
    this.formOpen = false;
    this.editingId = null;
    this.form.reset({ code: '', name: '', levelGroupCodes: [] });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim(),
      levelGroupCodes: [...(v.levelGroupCodes || [])]
    };
    if (!body.levelGroupCodes.length) {
      this.snackBar.open('Sélectionnez au moins un cycle scolaire.', 'Fermer', { duration: 4000 });
      return;
    }
    this.saving = true;
    const req =
      this.editingId != null
        ? this.superAdminService.updateGlobalSubject(this.editingId, body)
        : this.superAdminService.createGlobalSubject(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.reload();
        this.snackBar.open('Matière enregistrée.', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.error?.detail || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  delete(s: SchoolSubject): void {
    if (!confirm(`Supprimer la matière « ${s.name} » ?`)) {
      return;
    }
    this.superAdminService.deleteGlobalSubject(s.id).subscribe({
      next: () => {
        this.snackBar.open('Matière supprimée.', 'Fermer', { duration: 3000 });
        this.reload();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.detail || 'Suppression impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
