import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ActiveSchoolHeaderVm, ActiveSchoolService } from '../../../service/active-school.service';
import { AuthService } from '../../../service/auth.service';
import { School } from '../../../modules/admin/school/school-list/school-list.component';

@Component({
  selector: 'app-school-picker',
  templateUrl: './school-picker.component.html',
  styleUrls: ['./school-picker.component.scss']
})
export class SchoolPickerComponent {
  constructor(
    readonly activeSchool: ActiveSchoolService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar
  ) {}

  fallbackTitle(): string {
    return this.authService.getHeaderDisplayTitle();
  }

  /** Écoles autres que l’établissement actuellement sélectionné (liste du menu). */
  otherSchools(vm: ActiveSchoolHeaderVm): School[] {
    return vm.schools.filter((s) => s.id !== vm.selectedId);
  }

  displayName(vm: ActiveSchoolHeaderVm): string {
    if (vm.schools.length === 1) {
      return vm.schools[0]?.name?.trim() || this.fallbackTitle();
    }
    if (vm.selectedId != null) {
      const s = vm.schools.find((x) => x.id === vm.selectedId);
      if (s?.name?.trim()) {
        return s.name.trim();
      }
    }
    return this.fallbackTitle();
  }

  onSchoolSelected(schoolId: number, vm: ActiveSchoolHeaderVm): void {
    if (schoolId === vm.selectedId) {
      return;
    }
    this.activeSchool.switchSchool(schoolId).subscribe({
      next: () => {
        window.location.reload();
      },
      error: (err: unknown) => {
        const msg = this.resolveErrorMessage(err);
        this.snackBar.open(msg, 'Fermer', { duration: 6000 });
      }
    });
  }

  private resolveErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        return String((body as { message: string }).message);
      }
      if (err.status === 403) {
        return 'Vous ne pouvez pas accéder à cet établissement.';
      }
      if (err.status === 404) {
        return 'Établissement introuvable.';
      }
    }
    return 'Impossible de changer d’établissement. Réessayez.';
  }
}
