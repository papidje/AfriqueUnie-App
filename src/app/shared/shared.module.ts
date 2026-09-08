import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from './component/confirm-dialog/confirm-dialog.component';
import { PaymentReceiptPrintDialogComponent } from './component/payment-receipt-print-dialog/payment-receipt-print-dialog.component';
import { DisplayDatePipe } from './pipes/display-date.pipe';
import { KaransoBrandComponent } from './component/karanso-brand/karanso-brand.component';

@NgModule({
  declarations: [
    ConfirmDialogComponent,
    PaymentReceiptPrintDialogComponent,
    DisplayDatePipe,
    KaransoBrandComponent
  ],
  imports: [CommonModule, RouterModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  exports: [
    ConfirmDialogComponent,
    PaymentReceiptPrintDialogComponent,
    DisplayDatePipe,
    KaransoBrandComponent
  ]
})
export class SharedModule {}
