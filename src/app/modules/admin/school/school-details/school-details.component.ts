import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SchoolService } from '../school.service';
import { MatDialog } from '@angular/material/dialog';
import { AssignAdminDialogComponent } from '../assign-admin-dialog/assign-admin-dialog.component';
import {School} from "../school-list/school-list.component";
import {UserService} from "../../../../service/user.service";

@Component({
  selector: 'app-school-details',
  templateUrl: './school-details.component.html',
  styleUrls: ['./school-details.component.scss']
})
export class SchoolDetailsComponent implements OnInit {
  school: School | undefined;
  loading = true;
  admins: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private schoolService: SchoolService,
    private userService: UserService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSchool(id);
      this.loadAdmins(id);
    }
  }

  loadSchool(id: string) {
    this.schoolService.getById(+id).subscribe(s => this.school = s);
  }

  loadAdmins(id: string) {
    this.userService.getAdminsBySchool(id).subscribe(a => this.admins = a);
  }

  openAssignDialog(): void {
    if (this.school) {
      const dialogRef = this.dialog.open(AssignAdminDialogComponent, {
        width: '600px',
        data: { schoolId: this.school.id }
      });

      dialogRef.afterClosed().subscribe((updated) => {
        if (updated) this.ngOnInit(); // recharge les données
      });
    }
  }

  removeAdmin(adminId: number) {
    if (!confirm('Retirer cet administrateur ?')) return;
    if (this.school) {
      this.schoolService.removeAdministrator(this.school.id, adminId).subscribe({
        next: () => this.ngOnInit(),
        error: (err: any) => console.error(err)
      });
    }
  }
}
