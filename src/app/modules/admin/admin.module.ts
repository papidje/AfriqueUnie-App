import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchoolListComponent } from './school/school-list/school-list.component';
import { SchoolFormComponent } from './school/school-form/school-form.component';
import { SchoolDetailsComponent } from './school/school-details/school-details.component';
import {ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatDialogModule} from "@angular/material/dialog";
import {MatCardModule} from "@angular/material/card";
import {MatTableModule} from "@angular/material/table";
import {MatIconModule} from "@angular/material/icon";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatListModule} from "@angular/material/list";
import { AssignAdminDialogComponent } from './school/assign-admin-dialog/assign-admin-dialog.component';
import {AdminRoutingModule} from "./admin-routing.module";
import { SchoolDialogComponent } from './school/school-dialog/school-dialog.component';
import {MatProgressBarModule} from "@angular/material/progress-bar";
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import { StaffManagementComponent } from './staff-management/staff-management.component';


@NgModule({
  declarations: [
    AdminShellComponent,
    SchoolListComponent,
    SchoolFormComponent,
    SchoolDetailsComponent,
    AssignAdminDialogComponent,
    SchoolDialogComponent,
    StaffManagementComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDialogModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatProgressBarModule,
    MatSnackBarModule
  ]
})
export class AdminModule { }
