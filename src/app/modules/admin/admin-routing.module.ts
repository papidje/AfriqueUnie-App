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
    canActivate: [AuthGuard],
    canActivateChild: [RoleGuard],
    children: [
      {
        path: '',
        component: UserManagementComponent,
        data: { roles: [AppRoles.ADMIN_ECOLE] }
      },
      {
        path: 'staff',
        component: UserManagementComponent,
        data: { roles: [AppRoles.DIRECTOR], directorStaff: true }
      },
      {
        path: 'schools/:id',
        component: SchoolDetailsComponent,
        data: { roles: [AppRoles.ADMIN_ECOLE] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
