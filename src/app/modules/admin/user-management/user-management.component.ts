import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserRoleName, UserRoleNameType } from '../../../core/app-roles';
import { UserService } from '../../../service/user.service';
import { InviteMemberDialogComponent, InviteMemberDialogResult } from './invite-member-dialog/invite-member-dialog.component';

interface ManagedUser {
  id: number;
  fullname: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

type QuickFilter = 'ALL' | 'TEACHER' | 'STAFF' | 'ACCOUNTANT';

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
  readonly displayedColumns = ['fullname', 'email', 'role', 'status'];

  constructor(
    private readonly userService: UserService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute
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
        const role = this.primaryRole(u);
        return role === UserRoleName.STAFF || role === UserRoleName.ADMIN_ECOLE;
      });
    }
    if (this.quickFilter === 'ACCOUNTANT') {
      return this.users.filter((u) => this.primaryRole(u) === UserRoleName.ACCOUNTANT);
    }
    return this.users.filter((u) => this.primaryRole(u) === this.quickFilter);
  }

  setQuickFilter(filter: QuickFilter): void {
    this.quickFilter = filter;
  }

  openInviteDialog(): void {
    const ref = this.dialog.open(InviteMemberDialogComponent, {
      width: '480px',
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
          schoolId: result.schoolId ?? undefined
        })
        .subscribe({
          next: (res) => {
            if (res?.activationCode) {
              console.log('Activation code (test):', res.activationCode);
            }
            this.snackBar.open('Invitation envoyée avec succès.', 'Fermer', { duration: 3500 });
            this.loadUsers();
          },
          error: () => {
            this.snackBar.open('Impossible d’inviter ce membre.', 'Fermer', { duration: 5000 });
          }
        });
    });
  }

  roleLabel(user: ManagedUser): string {
    const role = this.primaryRole(user);
    if (role === UserRoleName.ADMIN_ECOLE) return 'ADMIN_ECOLE';
    if (role === UserRoleName.DIRECTOR) return 'DIRECTOR';
    if (role === UserRoleName.TEACHER) return 'TEACHER';
    if (role === UserRoleName.ACCOUNTANT) return 'ACCOUNTANT';
    return 'STAFF';
  }

  roleBadgeClass(user: ManagedUser): string {
    const role = this.primaryRole(user);
    if (role === UserRoleName.ADMIN_ECOLE) return 'role-admin';
    if (role === UserRoleName.DIRECTOR) return 'role-director';
    if (role === UserRoleName.TEACHER) return 'role-teacher';
    if (role === UserRoleName.ACCOUNTANT) return 'role-accountant';
    return 'role-staff';
  }

  statusLabel(user: ManagedUser): string {
    return user.isActive ? 'Activé' : 'En attente';
  }

  statusClass(user: ManagedUser): string {
    return user.isActive ? 'status-active' : 'status-pending';
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger les utilisateurs.', 'Fermer', { duration: 5000 });
      }
    });
  }

  private primaryRole(user: ManagedUser): UserRoleNameType {
    const role = (user.roles && user.roles[0]) || UserRoleName.STAFF;
    if (
      role === UserRoleName.ADMIN_ECOLE ||
      role === UserRoleName.DIRECTOR ||
      role === UserRoleName.TEACHER ||
      role === UserRoleName.STAFF ||
      role === UserRoleName.ACCOUNTANT
    ) {
      return role;
    }
    return UserRoleName.STAFF;
  }
}
