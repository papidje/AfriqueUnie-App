import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { AppRoles, UserRoleName, UserRoleNameType } from '../../../core/app-roles';
import { formatRoleLabel } from '../../../core/role-labels';
import { AuthUtilsService } from '../../../service/auth-utils.service';
import { UserService } from '../../../service/user.service';
import {
  EditUserAffiliationsDialogComponent,
  EditUserAffiliationsDialogData
} from './edit-user-affiliations-dialog/edit-user-affiliations-dialog.component';
import { InviteMemberDialogComponent, InviteMemberDialogResult } from './invite-member-dialog/invite-member-dialog.component';
import { UserAffiliationVm } from './user-affiliations.models';

interface ManagedUser {
  id: number;
  fullname: string;
  email: string;
  roles: string[];
  isActive: boolean;
  activeAffiliations?: UserAffiliationVm[];
  directoryPrivacyStatus?: string | null;
}

type QuickFilter = 'ALL' | 'TEACHER' | 'STAFF';

/** Annuaire admin : affiliations multi-écoles exposées par l’API (`activeAffiliations`). */
@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  loading = false;
  users: ManagedUser[] = [];
  quickFilter: QuickFilter = 'ALL';
  isDirectorStaff = false;
  readonly displayedColumns = ['fullname', 'email', 'affiliations', 'status', 'actions'];
  resendingUserId: number | null = null;
  readonly formatRoleLabel = formatRoleLabel;

  constructor(
    private readonly userService: UserService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
    private readonly authUtils: AuthUtilsService
  ) {}

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      this.isDirectorStaff = !!d['directorStaff'];
      this.quickFilter = 'ALL';
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredUsers(): ManagedUser[] {
    if (this.quickFilter === 'ALL') {
      return this.users;
    }
    if (this.quickFilter === 'STAFF') {
      return this.users.filter((u) => {
        if (this.primaryRole(u) === UserRoleName.ADMIN_ECOLE) {
          return true;
        }
        return this.userHasAffiliationRole(u, UserRoleName.STAFF);
      });
    }
    return this.users.filter((u) => this.userHasAffiliationRole(u, UserRoleName.TEACHER));
  }

  setQuickFilter(filter: QuickFilter): void {
    this.quickFilter = filter;
  }

  openInviteDialog(): void {
    const ref = this.dialog.open(InviteMemberDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      data: { directorMode: this.isDirectorStaff }
    });

    ref.afterClosed().subscribe((result: InviteMemberDialogResult | undefined) => {
      if (!result) {
        return;
      }
      this.userService
        .inviteMember({
          nom: result.fullname,
          email: result.email,
          role: result.role,
          schoolId: result.schoolId ?? undefined,
          schoolAssignments: result.schoolAssignments
        })
        .subscribe({
          next: (res: { message?: string; activationCode?: string | null }) => {
            if (res?.activationCode) {
              console.log('Activation code (test):', res.activationCode);
            }
            const msg = res?.message?.trim() || 'Invitation envoyée avec succès.';
            this.snackBar.open(msg, 'Fermer', { duration: 3500 });
            this.loadUsers();
          },
          error: (err: unknown) => {
            const backendMsg = this.extractHttpErrorMessage(err);
            this.snackBar.open(backendMsg || 'Impossible d’inviter ce membre.', 'Fermer', {
              duration: 6000
            });
          }
        });
    });
  }

  canEditAffiliations(user: ManagedUser): boolean {
    if (!this.authUtils.hasRole(AppRoles.ADMIN_ECOLE)) {
      return false;
    }
    if (this.isDirectorStaff) {
      return false;
    }
    const r = this.primaryRole(user);
    return (
      r === UserRoleName.TEACHER || r === UserRoleName.STAFF || r === UserRoleName.DIRECTOR
    );
  }

  openEditAffiliationsDialog(user: ManagedUser, event?: Event): void {
    /*
     * Sans blur : le bouton déclencheur (mat-tooltip-trigger) garde le focus pendant que le CDK pose
     * aria-hidden sur app-root → warning navigateur et piège à focus / clics dégradés dans la modale.
     */
    event?.preventDefault();
    event?.stopPropagation();
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }

    const data: EditUserAffiliationsDialogData = {
      userId: user.id,
      fullname: user.fullname,
      primaryRole: this.primaryRole(user),
      affiliations: user.activeAffiliations ? [...user.activeAffiliations] : [],
      canSuspendAffiliations: this.canEditAffiliations(user)
    };

    const open = (): void => {
      const ref = this.dialog.open(EditUserAffiliationsDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data
      });
      ref.afterClosed().subscribe((result: boolean | null | undefined) => {
        if (result === true) {
          this.loadUsers();
        } else if (result === false) {
          this.snackBar.open('Impossible d’enregistrer les affiliations.', 'Fermer', { duration: 5000 });
        }
      });
    };

    setTimeout(open, 0);
  }

  /** Badges établissements ; si aucune affiliation renvoyée, retombe sur le rôle du compte. */
  hasAffiliationBadges(user: ManagedUser): boolean {
    return !!user.activeAffiliations?.length;
  }

  roleLabel(user: ManagedUser): string {
    return formatRoleLabel(this.primaryRole(user));
  }

  roleBadgeClass(user: ManagedUser): string {
    const role = this.primaryRole(user);
    if (role === UserRoleName.ADMIN_ECOLE) return 'role-admin';
    if (role === UserRoleName.DIRECTOR) return 'role-director';
    if (role === UserRoleName.TEACHER) return 'role-teacher';
    return 'role-staff';
  }

  statusLabel(user: ManagedUser): string {
    const d = user.directoryPrivacyStatus?.trim();
    if (d) {
      return d;
    }
    return user.isActive ? 'Activé' : 'En attente';
  }

  statusClass(user: ManagedUser): string {
    return user.isActive ? 'status-active' : 'status-pending';
  }

  resendActivation(user: ManagedUser): void {
    if (user.isActive || this.resendingUserId != null) {
      return;
    }
    this.resendingUserId = user.id;
    this.userService
      .resendActivationEmail(user.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.resendingUserId = null;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Un nouveau code d’activation a été envoyé par e-mail.', 'Fermer', { duration: 4000 });
        },
        error: (err: { error?: { message?: string; detail?: string } }) => {
          const msg = err?.error?.message || err?.error?.detail;
          this.snackBar.open(msg || 'Impossible d’envoyer le code d’activation.', 'Fermer', { duration: 6000 });
        }
      });
  }

  private extractHttpErrorMessage(err: unknown): string | undefined {
    if (!err || typeof err !== 'object' || !('error' in err)) {
      return undefined;
    }
    const payload = (err as { error?: unknown }).error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
    if (payload && typeof payload === 'object') {
      const o = payload as { message?: unknown; detail?: unknown };
      if (typeof o.message === 'string' && o.message.trim()) {
        return o.message.trim();
      }
      if (typeof o.detail === 'string' && o.detail.trim()) {
        return o.detail.trim();
      }
    }
    return undefined;
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = (users || []) as ManagedUser[];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les utilisateurs.', 'Fermer', { duration: 5000 });
      }
    });
  }

  private userHasAffiliationRole(user: ManagedUser, target: UserRoleNameType): boolean {
    const aff = user.activeAffiliations;
    if (aff?.length) {
      return aff.some((a) => this.normalizeApiRole(a.role) === target);
    }
    return this.primaryRole(user) === target;
  }

  private normalizeApiRole(raw: string): string {
    return raw.replace(/^ROLE_/, '');
  }

  private primaryRole(user: ManagedUser): UserRoleNameType {
    const raw = ((user.roles && user.roles[0]) || UserRoleName.STAFF).replace(/^ROLE_/, '');
    if (raw === 'ACCOUNTANT') {
      return UserRoleName.STAFF;
    }
    const role = raw as UserRoleNameType;
    if (
      role === UserRoleName.ADMIN_ECOLE ||
      role === UserRoleName.DIRECTOR ||
      role === UserRoleName.TEACHER ||
      role === UserRoleName.STAFF
    ) {
      return role;
    }
    return UserRoleName.STAFF;
  }
}
