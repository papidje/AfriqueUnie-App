import { Component, OnInit } from '@angular/core';
import { SchoolService } from '../../modules/admin/school/school.service';
import { School } from '../../modules/admin/school/school-list/school-list.component';

@Component({
  selector: 'app-my-establishments',
  templateUrl: './my-establishments.component.html',
  styleUrls: ['./my-establishments.component.scss']
})
export class MyEstablishmentsComponent implements OnInit {
  schools: School[] = [];
  loading = true;
  error = false;

  constructor(private readonly schoolService: SchoolService) {}

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
}
