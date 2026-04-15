import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SchoolService } from '../school.service';
import {UserService} from "../../../../service/user.service";

@Component({
  selector: 'app-assign-admin-dialog',
  templateUrl: './assign-admin-dialog.component.html',
  styleUrls: ['./assign-admin-dialog.component.scss']
})
export class AssignAdminDialogComponent {
  searchCtrl = new FormControl('');
  results: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { schoolId: number },
    private service: SchoolService,
    private userService: UserService,
    protected dialogRef: MatDialogRef<AssignAdminDialogComponent>
  ) {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        switchMap((term) => this.userService.searchAdmins(term ?? ''))
      )
      .subscribe((res) => (this.results = res));
  }

  assign(adminId: number) {
    this.service.assignAdministrator(this.data.schoolId, adminId).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => console.error(err)
    });
  }
}
