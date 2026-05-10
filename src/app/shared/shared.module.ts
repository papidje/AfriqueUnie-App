import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from './component/confirm-dialog/confirm-dialog.component';
import { PaymentReceiptPrintDialogComponent } from './component/payment-receipt-print-dialog/payment-receipt-print-dialog.component';
import { DisplayDatePipe } from './pipes/display-date.pipe';

@NgModule({
  declarations: [ConfirmDialogComponent, PaymentReceiptPrintDialogComponent, DisplayDatePipe],
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  exports: [ConfirmDialogComponent, PaymentReceiptPrintDialogComponent, DisplayDatePipe]
})
export class SharedModule {}
