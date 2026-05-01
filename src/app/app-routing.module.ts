import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from "./component/login/login.component";
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
import {
  AppRoles,
  SCHOOL_PORTAL_ROLES,
  ROLES_ADMIN_MODULE,
  ROLES_CLASSES_NAV,
  ROLES_FINANCIAL_NAV,
  ROLES_SCHOOL_YEAR_NAV,
  ROLES_STUDENT_REGISTRATION,
  ROLES_STUDENTS_NAV,
  ROLES_STUDENT_WRITE,
} from "./core/app-roles";
import { SuperAdminDashboardComponent } from "./component/super-admin-dashboard/super-admin-dashboard.component";
import { MyEstablishmentsComponent } from "./component/my-establishments/my-establishments.component";
import { SchoolClassesPageComponent } from "./component/school-classes-page/school-classes-page.component";
import { SchoolYearCreatePageComponent } from "./component/school-year-create-page/school-year-create-page.component";
import { SubjectsCatalogPageComponent } from "./component/subjects-catalog-page/subjects-catalog-page.component";
import { ClassSubjectsPageComponent } from "./component/class-subjects-page/class-subjects-page.component";
import { ClassPlanningPageComponent } from "./component/class-planning-page/class-planning-page.component";
import { ClassTimetablePageComponent } from "./component/class-timetable-page/class-timetable-page.component";
import { ClassWorkspacePageComponent } from "./component/class-workspace-page/class-workspace-page.component";
import { ClassEvaluationsPageComponent } from "./component/class-evaluations-page/class-evaluations-page.component";
import { ClassPeriodsPageComponent } from "./component/class-periods-page/class-periods-page.component";
import { EvaluationGradesPageComponent } from "./component/evaluation-grades-page/evaluation-grades-page.component";
import { StudentRegistrationComponent } from "./component/student-registration/student-registration.component";
import { StudentListComponent } from "./component/student-list/student-list.component";
import { StudentDetailPageComponent } from "./component/student-detail-page/student-detail-page.component";
import { ParentDetailPageComponent } from "./component/parent-detail-page/parent-detail-page.component";
import { ParentListPageComponent } from "./component/parent-list-page/parent-list-page.component";
import { PeriodNotesPageComponent } from "./component/period-notes-page/period-notes-page.component";

const routes: Routes = [
  // 🔒 Layout d’authentification
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: '/login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
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
          roles: [...SCHOOL_PORTAL_ROLES]
        }
      },
      { path: 'super-admin', pathMatch: 'full', redirectTo: 'super-admin/dashboard' },
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
        path: 'classes/:classId',
        component: ClassWorkspacePageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_CLASSES_NAV] },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'matieres' },
          {
            path: 'matieres',
            component: ClassSubjectsPageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          },
          {
            path: 'emploi-du-temps',
            component: ClassTimetablePageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          },
          {
            path: 'periodes',
            component: ClassPeriodsPageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          },
          {
            path: 'planning',
            component: ClassPlanningPageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          },
          {
            path: 'evaluations/:evaluationId/notes',
            component: EvaluationGradesPageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          },
          {
            path: 'evaluations',
            component: ClassEvaluationsPageComponent,
            canActivate: [AuthGuard, RoleGuard],
            data: { roles: [...ROLES_CLASSES_NAV], workspaceChild: true }
          }
        ]
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
        path: 'notes',
        component: PeriodNotesPageComponent,
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
        path: 'finance',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_FINANCIAL_NAV] },
        loadChildren: () => import('./modules/finance/finance.module').then(m => m.FinanceModule)
      },
      { path: 'parametres-financiers', redirectTo: 'finance/settings', pathMatch: 'full' },
      {
        path: 'students/inscription',
        component: StudentRegistrationComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_STUDENT_REGISTRATION] }
      },
      {
        path: 'students/:studentId',
        component: StudentDetailPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_STUDENTS_NAV] }
      },
      {
        path: 'parents',
        component: ParentListPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_STUDENTS_NAV] }
      },
      {
        path: 'parents/:parentId',
        component: ParentDetailPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_STUDENT_WRITE] }
      },
      {
        path: 'students',
        component: StudentListComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_STUDENTS_NAV] }
      },
      {
        path: 'admin',
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_ADMIN_MODULE] },
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
