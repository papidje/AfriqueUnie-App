import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SchoolSubject } from '../../models/subject.models';
import { SuperAdminService } from '../../service/super-admin.service';

@Component({
  selector: 'app-super-admin-subjects-page',
  templateUrl: './super-admin-subjects-page.component.html',
  styleUrls: ['./super-admin-subjects-page.component.scss']
})
export class SuperAdminSubjectsPageComponent implements OnInit {
  subjects: SchoolSubject[] = [];
  loading = true;
  saving = false;
  editingId: number | null = null;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly superAdminService: SuperAdminService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.superAdminService.listGlobalSubjects().subscribe({
      next: (list) => {
        this.subjects = list || [];
        this.loading = false;
      },
      error: () => {
        this.subjects = [];
        this.loading = false;
        this.snackBar.open('Impossible de charger les matières.', 'Fermer', { duration: 4000 });
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.form.reset({ code: '', name: '' });
  }

  startEdit(s: SchoolSubject): void {
    this.editingId = s.id;
    this.form.reset({ code: s.code, name: s.name });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ code: '', name: '' });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      code: (v.code || '').trim().toUpperCase(),
      name: (v.name || '').trim()
    };
    this.saving = true;
    const req =
      this.editingId != null
        ? this.superAdminService.updateGlobalSubject(this.editingId, body)
        : this.superAdminService.createGlobalSubject(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.editingId != null ? 'Matière mise à jour.' : 'Matière ajoutée.',
          'Fermer',
          { duration: 2500 }
        );
        this.cancelEdit();
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        const msg =
          err?.error?.message || err?.error?.error || 'Enregistrement impossible.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  delete(s: SchoolSubject): void {
    if (!confirm(`Supprimer la matière « ${s.name} » du référentiel global ?`)) {
      return;
    }
    this.superAdminService.deleteGlobalSubject(s.id).subscribe({
      next: () => {
        this.snackBar.open('Matière supprimée.', 'Fermer', { duration: 2500 });
        if (this.editingId === s.id) {
          this.cancelEdit();
        }
        this.reload();
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.error ||
          'Suppression impossible (matière peut-être utilisée en classe).';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
