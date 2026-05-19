import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { RoleGuard } from '../../guards/role.guard';
import { AppRoles, ROLES_FEE_SETTINGS_NAV } from '../../core/app-roles';
import { FinancePageComponent } from './finance-page/finance-page.component';
import { FinancialSettingsPageComponent } from '../../component/financial-settings-page/financial-settings-page.component';
import { StudentPaymentComponent } from './student-payment/student-payment.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [AppRoles.ADMIN_ECOLE, AppRoles.STAFF, AppRoles.DIRECTOR]
    },
    children: [
      { path: '', component: FinancePageComponent },
      {
        path: 'settings',
        component: FinancialSettingsPageComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: [...ROLES_FEE_SETTINGS_NAV] }
      },
      { path: 'payment/:studentId', component: StudentPaymentComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}

