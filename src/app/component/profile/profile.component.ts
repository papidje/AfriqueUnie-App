import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../service/user.service';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';
import { EditProfileDialogComponent } from './edit-profile-dialog/edit-profile-dialog.component';
import { formatRoleLabel, formatRoleLabelsList } from '../../core/role-labels';
import { UserAffiliationVm } from '../../modules/admin/user-management/user-affiliations.models';
import { ProfileSchoolSummary, UserProfile } from './profile.models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  loadError = false;

  readonly formatRoles = formatRoleLabelsList;
  readonly formatRoleLabel = formatRoleLabel;

  constructor(
    private readonly userService: UserService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.loadError = false;
    this.userService.getUserInfo().subscribe({
      next: (raw) => {
        this.user = this.normalizeProfile(raw);
        this.loading = false;
      },
      error: () => {
        this.user = null;
        this.loading = false;
        this.loadError = true;
        this.snackBar.open('Impossible de charger le profil.', 'Fermer', { duration: 5000 });
      }
    });
  }

  /** Liste plate des noms d’établissements (affiliations actives ou écoles du profil). */
  establishmentLabels(): string[] {
    if (!this.user) {
      return [];
    }
    if (this.user.activeAffiliations.length > 0) {
      const names = this.user.activeAffiliations.map((a) => a.schoolName.trim()).filter(Boolean);
      return [...new Set(names)];
    }
    return this.user.schools.map((s) => s.name).filter(Boolean);
  }

  genderLabel(): string {
    if (!this.user) {
      return '—';
    }
    if (this.user.gender === 'MALE') {
      return 'Homme';
    }
    if (this.user.gender === 'FEMALE') {
      return 'Femme';
    }
    return 'Non renseigné';
  }

  readonlyAgeYears(): number | null {
    if (!this.user?.birthDate) {
      return null;
    }
    const d = this.parseIsoDateToLocalDate(this.user.birthDate);
    return this.ageFromDate(d);
  }

  openEditProfileDialog(): void {
    if (!this.user) {
      return;
    }
    const ref = this.dialog.open(EditProfileDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data: { user: this.user }
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.userService.getUserInfo().subscribe({
          next: (raw) => {
            this.user = this.normalizeProfile(raw);
          },
          error: () => this.reload()
        });
      }
    });
  }

  openChangePasswordDialog(): void {
    const ref = this.dialog.open(ChangePasswordDialogComponent, {
      width: '440px',
      disableClose: true
    });
    ref.afterClosed().subscribe();
  }

  avatarInitials(fullname: string | undefined): string {
    const name = (fullname ?? '').trim();
    if (!name) {
      return '?';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0].charAt(0);
      const b = parts[parts.length - 1].charAt(0);
      return `${a}${b}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private normalizeProfile(raw: unknown): UserProfile {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const schoolsRaw = o['schools'];
    const schools: ProfileSchoolSummary[] = Array.isArray(schoolsRaw)
      ? schoolsRaw
          .map((s) => {
            if (!s || typeof s !== 'object') {
              return null;
            }
            const r = s as Record<string, unknown>;
            const id = typeof r['id'] === 'number' ? r['id'] : Number(r['id']);
            const name = typeof r['name'] === 'string' ? r['name'] : '';
            return Number.isFinite(id) ? { id, name } : null;
          })
          .filter((x): x is ProfileSchoolSummary => x != null)
      : [];
    const lastLoginAt = o['lastLoginAt'];
    const affRaw = o['activeAffiliations'];
    const activeAffiliations: UserAffiliationVm[] = Array.isArray(affRaw)
      ? affRaw
          .map((item): UserAffiliationVm | null => {
            if (!item || typeof item !== 'object') {
              return null;
            }
            const r = item as Record<string, unknown>;
            const schoolId =
              typeof r['schoolId'] === 'number' ? r['schoolId'] : Number(r['schoolId']);
            const schoolName = typeof r['schoolName'] === 'string' ? r['schoolName'] : '';
            const role = typeof r['role'] === 'string' ? r['role'] : '';
            const active = r['active'] === undefined ? true : !!r['active'];
            const invitationPending = r['invitationPending'] === true;
            const reactivationEligible = r['reactivationEligible'] === true;
            return Number.isFinite(schoolId) && role
              ? { schoolId, schoolName, role, active, invitationPending, reactivationEligible }
              : null;
          })
          .filter((x): x is UserAffiliationVm => x != null)
      : [];

    const birthRaw = o['birthDate'];
    let birthDate: string | null = null;
    if (typeof birthRaw === 'string' && birthRaw.trim()) {
      birthDate = birthRaw.trim();
    } else if (Array.isArray(birthRaw) && birthRaw.length >= 3) {
      const y = birthRaw[0];
      const m = birthRaw[1];
      const d = birthRaw[2];
      if (typeof y === 'number' && typeof m === 'number' && typeof d === 'number') {
        birthDate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    return {
      username: typeof o['username'] === 'string' ? o['username'] : '',
      fullname: typeof o['fullname'] === 'string' ? o['fullname'] : '',
      firstName: typeof o['firstName'] === 'string' ? o['firstName'] : null,
      lastName: typeof o['lastName'] === 'string' ? o['lastName'] : null,
      birthDate,
      gender: typeof o['gender'] === 'string' ? o['gender'] : null,
      phone: typeof o['phone'] === 'string' ? o['phone'] : null,
      biography: typeof o['biography'] === 'string' ? o['biography'] : null,
      email: typeof o['email'] === 'string' ? o['email'] : '',
      isActive: !!o['isActive'],
      roles: Array.isArray(o['roles']) ? (o['roles'] as string[]) : [],
      lastLoginAt:
        lastLoginAt == null || lastLoginAt === ''
          ? null
          : typeof lastLoginAt === 'string'
            ? lastLoginAt
            : String(lastLoginAt),
      schools,
      activeAffiliations
    };
  }

  private parseIsoDateToLocalDate(iso: string | null): Date | null {
    if (!iso) {
      return null;
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) {
      return null;
    }
    const y = +m[1];
    const mo = +m[2] - 1;
    const d = +m[3];
    return new Date(y, mo, d);
  }

  private ageFromDate(d: Date | null): number | null {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) {
      return null;
    }
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }
}
