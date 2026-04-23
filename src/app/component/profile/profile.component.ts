import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../service/user.service';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';

export interface UserProfile {
  id: number;
  username: string;
  fullname: string;
  email: string;
  isActive: boolean;
  roles: string[];
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
      next: (user) => {
        this.user = user as UserProfile;
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

  openChangePasswordDialog(): void {
    const ref = this.dialog.open(ChangePasswordDialogComponent, {
      width: '440px',
      disableClose: true
    });
    ref.afterClosed().subscribe();
  }
}
