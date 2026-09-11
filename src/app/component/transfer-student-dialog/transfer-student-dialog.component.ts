import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SchoolClassDto } from '../../models/academic.models';
import { SchoolClassService } from '../../service/school-class.service';
import { sortSchoolClassesByLevel } from '../../core/class-level-group-order';

export interface TransferStudentDialogData {
  schoolId: number;
  currentClassId: number | null;
  studentLabel: string;
}

@Component({
  selector: 'app-transfer-student-dialog',
  templateUrl: './transfer-student-dialog.component.html',
  styleUrls: ['./transfer-student-dialog.component.scss']
})
export class TransferStudentDialogComponent implements OnInit {
  classes: SchoolClassDto[] = [];
  selectedClassId: number | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private readonly dialogRef: MatDialogRef<TransferStudentDialogComponent, number>,
    private readonly schoolClassService: SchoolClassService,
    @Inject(MAT_DIALOG_DATA) public readonly data: TransferStudentDialogData
  ) {}

  ngOnInit(): void {
    this.schoolClassService.listForActiveSchoolYear(this.data.schoolId).subscribe({
      next: (classes) => {
        this.classes = sortSchoolClassesByLevel(
          (classes || []).filter((c) => c.id !== this.data.currentClassId)
        );
        this.loading = false;
        if (!this.classes.length) {
          this.errorMessage = 'Aucune autre classe disponible pour l’année active.';
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les classes.';
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.selectedClassId == null) {
      return;
    }
    this.dialogRef.close(this.selectedClassId);
  }
}
