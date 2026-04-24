import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import {SchoolService} from "../school.service";
import {ConfirmDialogComponent} from "../../../../shared/component/confirm-dialog/confirm-dialog.component";
import {SchoolDialogComponent} from "../school-dialog/school-dialog.component";
import { MatSnackBar } from '@angular/material/snack-bar';
import {Router} from "@angular/router";
import { API_BASE_URL } from '../../../../core/api-base';

export interface School {
  id: number;
  name: string;
  adress: string;
  contact: string;
  openDate: string;
  logo?: string | null;
  /** Thème white label (clé : classique, emeraude, …). */
  themeName?: string;
  /** Police (clé : inter, montserrat, …). */
  fontName?: string;
  created_at: string;
  updated_at?: string;
  active?: boolean;
}

@Component({
  selector: 'app-school-list',
  templateUrl: './school-list.component.html',
  styleUrls: ['./school-list.component.scss']
})
export class SchoolListComponent implements OnInit {

  displayedColumns: string[] = ['id', 'logo', 'name', 'adress', 'contact', 'openDate', 'actions'];
  dataSource = new MatTableDataSource<School>([]);
  loading = false;

  constructor(
    private schoolService: SchoolService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.loading = true;
    this.schoolService.getAll().subscribe({
      next: (data: School[]) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur lors du chargement des écoles', 'Fermer', { duration: 3000 });
      }
    });
  }

  openDialog(school?: School): void {
    const dialogRef = this.dialog.open(SchoolDialogComponent, {
      width: '500px',
      data: school ? { ...school } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSchools();
    });
  }

  toggleActivation(school: School): void {
    const newState = !school.active;
    this.schoolService.toggleActive(school.id, newState).subscribe({
      next: () => {
        this.snackBar.open(`École ${newState ? 'activée' : 'désactivée'}`, 'Fermer', { duration: 2000 });
        this.loadSchools();
      },
      error: () => {
        this.snackBar.open(`Erreur lors de la mise à jour`, 'Fermer', { duration: 2000 });
      }
    });
  }

  deleteSchool(school: School): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Suppression',
        message: `Voulez-vous vraiment supprimer "${school.name}" ?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.schoolService.delete(school.id).subscribe({
          next: () => {
            this.snackBar.open('École supprimée', 'Fermer', { duration: 2000 });
            this.loadSchools();
          },
          error: () => {
            this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 2000 });
          }
        });
      }
    });
  }

  viewDetails(school: School) {
    this.router.navigate(['/admin', 'schools', school.id]);
  }

  logoDisplayUrl(logo: string | null | undefined): string | null {
    if (!logo) {
      return null;
    }
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    if (logo.startsWith('/')) {
      return `${API_BASE_URL}${logo}`;
    }
    return logo;
  }
}
