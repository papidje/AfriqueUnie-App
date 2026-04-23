import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from './component/confirm-dialog/confirm-dialog.component';
import { PaymentReceiptPrintDialogComponent } from './component/payment-receipt-print-dialog/payment-receipt-print-dialog.component';

@NgModule({
  declarations: [ConfirmDialogComponent, PaymentReceiptPrintDialogComponent],
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  exports: [ConfirmDialogComponent, PaymentReceiptPrintDialogComponent]
})
export class SharedModule {}
