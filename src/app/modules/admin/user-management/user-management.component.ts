import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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

type QuickFilter = 'ALL' | 'TEACHER' | 'STAFF';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  loading = false;
  users: ManagedUser[] = [];
  quickFilter: QuickFilter = 'ALL';
  readonly displayedColumns = ['fullname', 'email', 'role', 'status'];

  constructor(
    private readonly userService: UserService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();
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
    return this.users.filter((u) => this.primaryRole(u) === this.quickFilter);
  }

  setQuickFilter(filter: QuickFilter): void {
    this.quickFilter = filter;
  }

  openInviteDialog(): void {
    const ref = this.dialog.open(InviteMemberDialogComponent, {
      width: '480px',
      disableClose: true
    });

    ref.afterClosed().subscribe((result: InviteMemberDialogResult | undefined) => {
      if (!result) {
        return;
      }
      this.userService.inviteMember({
        nom: result.fullname,
        email: result.email,
        role: result.role
      }).subscribe({
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
    if (role === UserRoleName.TEACHER) return 'TEACHER';
    return 'STAFF';
  }

  roleBadgeClass(user: ManagedUser): string {
    const role = this.primaryRole(user);
    if (role === UserRoleName.ADMIN_ECOLE) return 'role-admin';
    if (role === UserRoleName.TEACHER) return 'role-teacher';
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
    if (role === UserRoleName.ADMIN_ECOLE || role === UserRoleName.TEACHER || role === UserRoleName.STAFF) {
      return role;
    }
    return UserRoleName.STAFF;
  }
}
