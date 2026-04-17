import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthGuard} from "../../guards/auth.guard";
import {RoleGuard} from "../../guards/role.guard";
import {AppRoles} from "../../core/app-roles";
import {AdminShellComponent} from "./admin-shell/admin-shell.component";
import {SchoolDetailsComponent} from "./school/school-details/school-details.component";
import { UserManagementComponent } from './user-management/user-management.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [AuthGuard, RoleGuard],
    canActivateChild: [RoleGuard],
    data: { roles: [AppRoles.ADMIN_ECOLE] },
    children: [
      { path: '', component: UserManagementComponent },
      { path: 'staff', component: UserManagementComponent },
      { path: 'schools/:id', component: SchoolDetailsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
