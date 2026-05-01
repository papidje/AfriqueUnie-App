import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {LoginComponent} from './component/login/login.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ActivateComponent} from './component/activate/activate.component';
import {AuthInterceptor} from "./interceptors/auth.interceptor";
import {HeaderComponent} from './component/header/header.component';
import {FooterComponent} from './component/footer/footer.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {ResetPasswordComponent} from './component/reset-password/reset-password.component';
import {UpdatePasswordComponent} from './component/update-password/update-password.component';
import {AuthLayoutComponent} from './component/auth-layout/auth-layout.component';
import {MainLayoutComponent} from './component/main-layout/main-layout.component';
import { ProfileComponent } from './component/profile/profile.component';
import { ChangePasswordDialogComponent } from './component/profile/change-password-dialog/change-password-dialog.component';
import {MatCardModule} from "@angular/material/card";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UnautorizedComponent } from './component/unautorized/unautorized.component';
import { DashboardPageComponent } from './component/dashboard-page/dashboard-page.component';
import { SharedModule } from './shared/shared.module';
import { ClassWorkspaceContextBarComponent } from './shared/component/class-workspace-context-bar/class-workspace-context-bar.component';
import {MatDialogModule} from "@angular/material/dialog";
import {MatTableModule} from "@angular/material/table";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatSelectModule} from "@angular/material/select";
import {MatInputModule} from "@angular/material/input";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatCheckboxModule} from "@angular/material/checkbox";
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ApiUnavailableComponent } from './component/api-unavailable/api-unavailable.component';
import { RegisterSchoolComponent } from './component/register-school/register-school.component';
import { SuperAdminDashboardComponent } from './component/super-admin-dashboard/super-admin-dashboard.component';
import { MyEstablishmentsComponent } from './component/my-establishments/my-establishments.component';
import { CreateSchoolDialogComponent } from './component/my-establishments/create-school-dialog/create-school-dialog.component';
import { AcademicContextBannerComponent } from './component/academic-context-banner/academic-context-banner.component';
import { SchoolClassesPageComponent } from './component/school-classes-page/school-classes-page.component';
import { SchoolYearCreatePageComponent } from './component/school-year-create-page/school-year-create-page.component';
import { SubjectsCatalogPageComponent } from './component/subjects-catalog-page/subjects-catalog-page.component';
import { ClassSubjectsPageComponent } from './component/class-subjects-page/class-subjects-page.component';
import { ClassSubjectFormDialogComponent } from './component/class-subject-form-dialog/class-subject-form-dialog.component';
import { ClassPlanningPageComponent } from './component/class-planning-page/class-planning-page.component';
import { ClassTimetablePageComponent } from './component/class-timetable-page/class-timetable-page.component';
import { ClassWorkspacePageComponent } from './component/class-workspace-page/class-workspace-page.component';
import { ClassEvaluationsPageComponent } from './component/class-evaluations-page/class-evaluations-page.component';
import { ClassPeriodsPageComponent } from './component/class-periods-page/class-periods-page.component';
import { NewEvaluationDialogComponent } from './component/class-evaluations-page/new-evaluation-dialog.component';
import { EvaluationGradesPageComponent } from './component/evaluation-grades-page/evaluation-grades-page.component';
import { GradeNoteEnterNextDirective } from './directives/grade-note-enter-next.directive';
import { StudentRegistrationComponent } from './component/student-registration/student-registration.component';
import { StudentListComponent } from './component/student-list/student-list.component';
import { StudentDetailPageComponent } from './component/student-detail-page/student-detail-page.component';
import { ParentDetailPageComponent } from './component/parent-detail-page/parent-detail-page.component';
import { ParentListPageComponent } from './component/parent-list-page/parent-list-page.component';
import { PeriodNotesPageComponent } from './component/period-notes-page/period-notes-page.component';
import { AuthService } from './service/auth.service';

export function initializeAuthFactory(authService: AuthService) {
  return () => authService.initializeAuthState();
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ActivateComponent,
    HeaderComponent,
    FooterComponent,
    ResetPasswordComponent,
    UpdatePasswordComponent,
    AuthLayoutComponent,
    MainLayoutComponent,
    ProfileComponent,
    ChangePasswordDialogComponent,
    UnautorizedComponent,
    DashboardPageComponent,
    ClassWorkspaceContextBarComponent,
    ApiUnavailableComponent,
    RegisterSchoolComponent,
    SuperAdminDashboardComponent,
    MyEstablishmentsComponent,
    CreateSchoolDialogComponent,
    AcademicContextBannerComponent,
    SchoolClassesPageComponent,
    SchoolYearCreatePageComponent,
    SubjectsCatalogPageComponent,
    ClassSubjectsPageComponent,
    ClassSubjectFormDialogComponent,
    ClassPlanningPageComponent,
    ClassTimetablePageComponent,
    ClassWorkspacePageComponent,
    StudentRegistrationComponent,
    StudentListComponent,
    StudentDetailPageComponent,
    ParentDetailPageComponent,
    ParentListPageComponent,
    PeriodNotesPageComponent,
    ClassEvaluationsPageComponent,
    ClassPeriodsPageComponent,
    NewEvaluationDialogComponent,
    EvaluationGradesPageComponent,
    GradeNoteEnterNextDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
    MatCheckboxModule,
    DragDropModule,
    MatStepperModule
    ,
    MatTabsModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatMenuModule,
    SharedModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthFactory,
      deps: [AuthService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
