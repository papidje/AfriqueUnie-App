import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { FinanceRoutingModule } from './finance-routing.module';
import { FinancePageComponent } from './finance-page/finance-page.component';
import { FinancialSettingsPageComponent } from '../../component/financial-settings-page/financial-settings-page.component';
import { FeeStructureDialogComponent } from '../../component/financial-settings-page/fee-structure-dialog/fee-structure-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { StudentPaymentComponent } from './student-payment/student-payment.component';
import { PaymentReceiptPromptDialogComponent } from './student-payment/payment-receipt-prompt-dialog.component';

@NgModule({
  declarations: [
    FinancePageComponent,
    StudentPaymentComponent,
    PaymentReceiptPromptDialogComponent,
    FinancialSettingsPageComponent,
    FeeStructureDialogComponent
  ],
  imports: [
    CommonModule,
    FinanceRoutingModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSelectModule
  ]
})
export class FinanceModule {}

