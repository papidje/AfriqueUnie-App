import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClassLevel } from '../../models/academic.models';
import { ClassLevelService } from '../../service/class-level.service';
import { SubjectAdditionRequestService } from '../../service/subject-addition-request.service';
import { classLevelCodeSortKey, classLevelGroupSortKey } from '../../core/class-level-group-order';

export interface SubjectAdditionRequestDialogData {
  schoolId: number;
}

interface LevelGroupOption {
  groupCode: string;
  groupLabel: string;
  levels: ClassLevel[];
}

@Component({
  selector: 'app-subject-addition-request-dialog',
  templateUrl: './subject-addition-request-dialog.component.html',
  styleUrls: ['./subject-addition-request-dialog.component.scss']
})
export class SubjectAdditionRequestDialogComponent implements OnInit {
  saving = false;
  loadingLevels = true;
  levelGroups: LevelGroupOption[] = [];

  readonly form = this.fb.group({
    subjectName: ['', [Validators.required, Validators.maxLength(200)]],
    classLevelId: [null as number | null, Validators.required],
    comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SubjectAdditionRequestDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: SubjectAdditionRequestDialogData,
    private readonly classLevelService: ClassLevelService,
    private readonly requestService: SubjectAdditionRequestService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.classLevelService.getAll().subscribe({
      next: (levels) => {
        this.levelGroups = this.buildGroups(levels || []);
        this.loadingLevels = false;
      },
      error: () => {
        this.loadingLevels = false;
        this.snackBar.open('Impossible de charger les niveaux.', 'Fermer', { duration: 4000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.classLevelId == null) {
      return;
    }
    this.saving = true;
    this.requestService
      .create(this.data.schoolId, {
        subjectName: (v.subjectName || '').trim(),
        classLevelId: v.classLevelId,
        comment: (v.comment || '').trim()
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Demande envoyée au super administrateur.', 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          const msg = err?.error?.message || err?.error?.detail || 'Envoi impossible.';
          this.snackBar.open(msg, 'Fermer', { duration: 5000 });
        }
      });
  }

  private buildGroups(levels: ClassLevel[]): LevelGroupOption[] {
    const byCode = new Map<string, LevelGroupOption>();
    for (const level of levels) {
      const code = level.group?.code ?? '_';
      if (!byCode.has(code)) {
        byCode.set(code, {
          groupCode: code,
          groupLabel: level.group?.name ?? 'Autres',
          levels: []
        });
      }
      byCode.get(code)!.levels.push(level);
    }
    return Array.from(byCode.values())
      .map((g) => ({
        ...g,
        levels: g.levels.slice().sort((a, b) => {
          const byLevel = classLevelCodeSortKey(a.code) - classLevelCodeSortKey(b.code);
          return byLevel !== 0 ? byLevel : (a.code ?? '').localeCompare(b.code ?? '', 'fr');
        })
      }))
      .sort((a, b) => classLevelGroupSortKey(a.groupCode) - classLevelGroupSortKey(b.groupCode));
  }
}
