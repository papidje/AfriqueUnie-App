import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolSubject } from '../../models/subject.models';
import { SubjectService } from '../../service/subject.service';

@Component({
  selector: 'app-subjects-catalog-page',
  templateUrl: './subjects-catalog-page.component.html',
  styleUrls: ['./subjects-catalog-page.component.scss']
})
export class SubjectsCatalogPageComponent implements OnInit {
  subjects: SchoolSubject[] = [];
  loading = true;
  saving = false;
  editing: SchoolSubject | null = null;

  readonly createForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  readonly editForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly subjectService: SubjectService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.subjectService.list().subscribe({
      next: (list) => {
        this.subjects = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les matières.', 'Fermer', { duration: 5000 });
      }
    });
  }

  startEdit(s: SchoolSubject): void {
    this.editing = s;
    this.editForm.reset({ code: s.code, name: s.name });
  }

  cancelEdit(): void {
    this.editing = null;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.createForm.getRawValue();
    this.subjectService.create({ code: v.code!.trim(), name: v.name!.trim() }).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Matière créée.', 'Fermer', { duration: 3000 });
        this.createForm.reset();
        this.reload();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Création impossible (code déjà utilisé ?).', 'Fermer', { duration: 5000 });
      }
    });
  }

  submitEdit(): void {
    if (this.editing == null || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.editForm.getRawValue();
    this.subjectService.update(this.editing.id, { code: v.code!.trim(), name: v.name!.trim() }).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Matière mise à jour.', 'Fermer', { duration: 3000 });
        this.editing = null;
        this.reload();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Mise à jour impossible.', 'Fermer', { duration: 5000 });
      }
    });
  }

  delete(s: SchoolSubject): void {
    if (!confirm(`Supprimer la matière « ${s.name} » ?`)) {
      return;
    }
    this.subjectService.delete(s.id).subscribe({
      next: () => {
        this.snackBar.open('Matière supprimée.', 'Fermer', { duration: 3000 });
        this.reload();
      },
      error: () => {
        this.snackBar.open('Suppression impossible (matière affectée à une classe ?).', 'Fermer', {
          duration: 6000
        });
      }
    });
  }
}
