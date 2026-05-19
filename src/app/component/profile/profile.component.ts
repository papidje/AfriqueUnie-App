import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../service/user.service';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';
import { EditProfileDialogComponent } from './edit-profile-dialog/edit-profile-dialog.component';
import { formatRoleLabel, formatRoleLabelsList } from '../../core/role-labels';
import { UserAffiliationVm } from '../../modules/admin/user-management/user-affiliations.models';

export interface ProfileSchoolSummary {
  id: number;
  name: string;
}

export interface UserProfile {
  username: string;
  fullname: string;
  email: string;
  isActive: boolean;
  roles: string[];
  /** ISO-8601 ou équivalent renvoyé par l’API */
  lastLoginAt: string | null;
  schools: ProfileSchoolSummary[];
  /** Rôles par établissement (affiliations actives), comme l’annuaire admin. */
  activeAffiliations: UserAffiliationVm[];
}

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
    return {
      username: typeof o['username'] === 'string' ? o['username'] : '',
      fullname: typeof o['fullname'] === 'string' ? o['fullname'] : '',
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

  openChangePasswordDialog(): void {
    const ref = this.dialog.open(ChangePasswordDialogComponent, {
      width: '440px',
      disableClose: true
    });
    ref.afterClosed().subscribe();
  }

  openEditProfileDialog(): void {
    if (!this.user) {
      return;
    }
    const ref = this.dialog.open(EditProfileDialogComponent, {
      width: '440px',
      disableClose: true,
      data: { fullname: this.user.fullname }
    });
    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.reload();
      }
    });
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
}
