import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PaymentReceiptPromptData {
  studentName: string;
  reference: string;
  totalCollected: number;
}

@Component({
  selector: 'app-payment-receipt-prompt-dialog',
  templateUrl: './payment-receipt-prompt-dialog.component.html',
  styleUrls: ['./payment-receipt-prompt-dialog.component.scss']
})
export class PaymentReceiptPromptDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<PaymentReceiptPromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PaymentReceiptPromptData
  ) {}

  asMoney(value: number): string {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  printReceipt(): void {
    const content = `
      <html>
      <head><title>Reçu ${this.data.reference}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Reçu de paiement</h2>
        <p><strong>Référence :</strong> ${this.data.reference}</p>
        <p><strong>Élève :</strong> ${this.data.studentName}</p>
        <p><strong>Montant encaissé :</strong> ${this.asMoney(this.data.totalCollected)} GNF</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </body>
      </html>`;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      return;
    }
    win.document.open();
    win.document.write(content);
    win.document.close();
    win.focus();
    win.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}
