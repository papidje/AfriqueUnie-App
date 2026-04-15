import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from "./component/login/login.component";
import { RegisterComponent } from "./component/register/register.component";
import { ActivateComponent } from "./component/activate/activate.component";
import { AuthGuard } from "./guards/auth.guard";
import { ResetPasswordComponent } from "./component/reset-password/reset-password.component";
import { UpdatePasswordComponent } from "./component/update-password/update-password.component";
import { AuthLayoutComponent } from "./component/auth-layout/auth-layout.component";
import { MainLayoutComponent } from "./component/main-layout/main-layout.component";
import { ProfileComponent } from "./component/profile/profile.component";
import { UnautorizedComponent } from "./component/unautorized/unautorized.component";
import { DashboardPageComponent } from "./component/dashboard-page/dashboard-page.component";
import { RoleGuard } from "./guards/role.guard";
import { RegisterSchoolComponent } from "./component/register-school/register-school.component";
import { ALL_APP_ROLES, AppRoles, ROLES_CLASSES_NAV, ROLES_SCHOOL_YEAR_NAV } from "./core/app-roles";
import { SuperAdminDashboardComponent } from "./component/super-admin-dashboard/super-admin-dashboard.component";
import { MyEstablishmentsComponent } from "./component/my-establishments/my-establishments.component";
import { SchoolClassesPageComponent } from "./component/school-classes-page/school-classes-page.component";
import { SchoolYearCreatePageComponent } from "./component/school-year-create-page/school-year-create-page.component";
import { SubjectsCatalogPageComponent } from "./component/subjects-catalog-page/subjects-catalog-page.component";
import { ClassSubjectsPageComponent } from "./component/class-subjects-page/class-subjects-page.component";
import { ClassPlanningPageComponent } from "./component/class-planning-page/class-planning-page.component";
import { ClassTimetablePageComponent } from "./component/class-timetable-page/class-timetable-page.component";

const routes: Routes = [
  // 🔒 Layout d’authentification
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: '/login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'register-school', component: RegisterSchoolComponent },
      { path: 'activate', component: ActivateComponent },
      { path: 'resetPwd', component: ResetPasswordComponent },
      { path: 'newPwd', component: UpdatePasswordComponent },
    ]
  },

  // ✅ Layout principal (protégé)
  {
    path: '',
    component: MainLayoutComponent,
    canActivateChild: [AuthGuard],
    children: [
      { path: 'home', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'profile', component: ProfileComponent },

      {
        path: 'dashboard',
        component: DashboardPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: {
          roles: [...ALL_APP_ROLES]
        }
      },
      {
        path: 'super-admin/dashboard',
        component: SuperAdminDashboardComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [AppRoles.SUPER_ADMIN] }
      },
      {
        path: 'mes-etablissements',
        component: MyEstablishmentsComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [AppRoles.ADMIN_ECOLE] }
      },
      {
        path: 'classes/:classId/matieres',
        component: ClassSubjectsPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] }
      },
      {
        path: 'classes/:classId/planning',
        component: ClassPlanningPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] }
      },
      {
        path: 'classes/:classId/emploi-du-temps',
        component: ClassTimetablePageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] }
      },
      {
        path: 'classes',
        component: SchoolClassesPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] }
      },
      {
        path: 'referentiel/matieres',
        component: SubjectsCatalogPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] }
      },
      {
        path: 'annee-scolaire/nouvelle',
        component: SchoolYearCreatePageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_SCHOOL_YEAR_NAV] }
      },
      {
        path: 'admin',
        loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule)
      },
    ]
  },

  // 🚫 Page d’accès refusé
  { path: 'unauthorized', component: UnautorizedComponent },

  // 🧭 Fallback
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
