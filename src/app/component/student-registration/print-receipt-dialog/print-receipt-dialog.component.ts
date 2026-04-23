import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PrintReceiptDialogData {
  schoolName: string;
  studentName: string;
  classLabel: string;
  dateLabel: string;
  currency: string;
  paymentModeLabel: string;
  amountPaid: number;
  remainingToPay: number;
}

@Component({
  selector: 'app-print-receipt-dialog',
  templateUrl: './print-receipt-dialog.component.html',
  styleUrls: ['./print-receipt-dialog.component.scss']
})
export class PrintReceiptDialogComponent {
  @ViewChild('receipt', { static: true }) receiptRef!: ElementRef<HTMLElement>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: PrintReceiptDialogData,
    private readonly dialogRef: MatDialogRef<PrintReceiptDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  print(): void {
    const receiptEl = this.receiptRef.nativeElement;
    const html = `
      <html>
        <head>
          <title>Reçu</title>
          <style>
            body { font-family: Roboto, Arial, sans-serif; padding: 16px; }
            .receipt { max-width: 680px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
            h2 { margin-top: 0; }
            .row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; border-bottom: 1px dashed #eee; }
            .row:last-child { border-bottom: none; }
            .label { color: #607d8b; }
            .value { font-weight: 600; }
            .foot { margin-top: 12px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          ${receiptEl.innerHTML}
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=820,height=650');
    if (!win) {
      // Fallback : impression standard
      window.print();
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  money(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.data.currency,
      maximumFractionDigits: 0
    }).format(value);
  }
}

