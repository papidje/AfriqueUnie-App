import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SchoolService } from '../../modules/admin/school/school.service';
import { School } from '../../modules/admin/school/school-list/school-list.component';
import { CreateSchoolDialogComponent } from './create-school-dialog/create-school-dialog.component';

@Component({
  selector: 'app-my-establishments',
  templateUrl: './my-establishments.component.html',
  styleUrls: ['./my-establishments.component.scss']
})
export class MyEstablishmentsComponent implements OnInit {
  schools: School[] = [];
  loading = true;
  error = false;

  constructor(
    private readonly schoolService: SchoolService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.schoolService.getAll().subscribe({
      next: (data) => {
        this.schools = data;
        this.loading = false;
      },
      error: () => {
        this.schools = [];
        this.error = true;
        this.loading = false;
      }
    });
  }

  openCreateSchool(): void {
    const ref = this.dialog.open(CreateSchoolDialogComponent, {
      width: '520px',
      disableClose: true
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.load();
      }
    });
  }
}
