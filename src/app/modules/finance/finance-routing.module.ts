import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';
import { RoleGuard } from '../../guards/role.guard';
import { AppRoles } from '../../core/app-roles';
import { FinancePageComponent } from './finance-page/finance-page.component';
import { FinancialSettingsPageComponent } from '../../component/financial-settings-page/financial-settings-page.component';
import { StudentPaymentComponent } from './student-payment/student-payment.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [AppRoles.SUPER_ADMIN, AppRoles.ADMIN_ECOLE, AppRoles.STAFF] },
    children: [
      { path: '', component: FinancePageComponent },
      { path: 'settings', component: FinancialSettingsPageComponent },
      { path: 'payment/:studentId', component: StudentPaymentComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}

