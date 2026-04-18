import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { SchoolService } from '../school.service';
import { AssignAdminDialogComponent } from '../assign-admin-dialog/assign-admin-dialog.component';
import { School } from '../school-list/school-list.component';
import { UserService } from '../../../../service/user.service';
import { SchoolYearService } from '../../../../service/school-year.service';
import { SchoolYearDto } from '../../../../models/academic.models';
import { ConfirmDialogComponent } from '../../../../shared/component/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-school-details',
  templateUrl: './school-details.component.html',
  styleUrls: ['./school-details.component.scss']
})
export class SchoolDetailsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  schoolId: number | null = null;
  school: School | null = null;
  admins: Array<{ id: number; fullname: string; email: string }> = [];
  years: SchoolYearDto[] = [];
  loading = true;
  saving = false;
  togglingActive = false;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    adress: ['', Validators.required],
    contact: ['', Validators.required],
    openDate: ['', Validators.required],
    logo: ['']
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly schoolService: SchoolService,
    private readonly userService: UserService,
    private readonly schoolYearService: SchoolYearService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const id = pm.get('id');
      this.schoolId = id != null ? Number(id) : null;
      if (this.schoolId != null && Number.isFinite(this.schoolId)) {
        this.reloadAll();
      } else {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isActive(): boolean {
    return !!this.school?.active;
  }

  private reloadAll(): void {
    if (this.schoolId == null) {
      return;
    }
    this.loading = true;
    this.schoolService
      .getById(this.schoolId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (s) => {
          this.school = s;
          this.patchForm(s);
          this.loadAdmins();
          this.loadYears();
        },
        error: () => {
          this.school = null;
          this.snackBar.open('Établissement introuvable ou non autorisé.', 'Fermer', { duration: 5000 });
        }
      });
  }

  private patchForm(s: School): void {
    const od =
      typeof s.openDate === 'string' && s.openDate.length >= 10 ? s.openDate.slice(0, 10) : (s.openDate as string) || '';
    this.form.patchValue({
      name: s.name ?? '',
      adress: s.adress ?? '',
      contact: s.contact ?? '',
      openDate: od,
      logo: s.logo ?? ''
    });
  }

  private loadAdmins(): void {
    if (this.schoolId == null) {
      return;
    }
    this.userService.getAdminsBySchool(String(this.schoolId)).subscribe({
      next: (a) => (this.admins = a || []),
      error: () => (this.admins = [])
    });
  }

  private loadYears(): void {
    if (this.schoolId == null) {
      return;
    }
    this.schoolYearService.listBySchool(this.schoolId).subscribe({
      next: (y) => (this.years = y || []),
      error: () => (this.years = [])
    });
  }

  saveSchool(): void {
    if (this.schoolId == null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving = true;
    this.schoolService
      .update(this.schoolId, {
        name: (v.name || '').trim(),
        adress: (v.adress || '').trim(),
        contact: (v.contact || '').trim(),
        openDate: v.openDate || '',
        logo: (v.logo || '').trim()
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (s) => {
          this.school = s;
          this.snackBar.open('Établissement enregistré.', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open('Enregistrement impossible.', 'Fermer', { duration: 5000 })
      });
  }

  setActive(active: boolean): void {
    if (this.schoolId == null) {
      return;
    }
    this.togglingActive = true;
    this.schoolService
      .toggleActive(this.schoolId, active)
      .pipe(finalize(() => (this.togglingActive = false)))
      .subscribe({
        next: () => {
          if (this.school) {
            this.school = { ...this.school, active };
          }
          this.snackBar.open(active ? 'Établissement activé.' : 'Établissement désactivé.', 'Fermer', {
            duration: 3000
          });
        },
        error: () => this.snackBar.open('Mise à jour du statut impossible.', 'Fermer', { duration: 5000 })
      });
  }

  deleteSchool(): void {
    if (this.schoolId == null || !this.school) {
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Supprimer l’établissement',
        message: `Confirmer la suppression définitive de « ${this.school.name} » ? Les données liées peuvent empêcher la suppression.`
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok || this.schoolId == null) {
        return;
      }
      this.schoolService.delete(this.schoolId).subscribe({
        next: () => {
          this.snackBar.open('Établissement supprimé.', 'Fermer', { duration: 3000 });
          void this.router.navigateByUrl('/mes-etablissements');
        },
        error: () =>
          this.snackBar.open(
            'Suppression impossible (contraintes en base ou droits insuffisants).',
            'Fermer',
            { duration: 6000 }
          )
      });
    });
  }

  openAssignDialog(): void {
    if (!this.school) {
      return;
    }
    const dialogRef = this.dialog.open(AssignAdminDialogComponent, {
      width: '600px',
      data: { schoolId: this.school.id }
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadAdmins();
      }
    });
  }

  removeAdmin(adminId: number): void {
    if (!this.school) {
      return;
    }
    if (!confirm('Retirer cet administrateur ?')) {
      return;
    }
    this.schoolService.removeAdministrator(this.school.id, adminId).subscribe({
      next: () => this.loadAdmins(),
      error: () => this.snackBar.open('Action impossible.', 'Fermer', { duration: 4000 })
    });
  }

  newYearQueryParams(): Record<string, string> {
    if (this.schoolId == null) {
      return {};
    }
    return {
      schoolId: String(this.schoolId),
      returnUrl: `/admin/schools/${this.schoolId}`
    };
  }

  editYearQueryParams(yearId: number): Record<string, string> {
    const base = this.newYearQueryParams();
    return { ...base, yearId: String(yearId) };
  }
}
