import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaymentReceiptPrintData } from './payment-receipt-print-dialog.models';

@Component({
  selector: 'app-payment-receipt-print-dialog',
  templateUrl: './payment-receipt-print-dialog.component.html',
  styleUrls: ['./payment-receipt-print-dialog.component.scss']
})
export class PaymentReceiptPrintDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<PaymentReceiptPrintDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PaymentReceiptPrintData
  ) {}

  asMoney(value: number): string {
    const cur = (this.data.currency || 'GNF').trim();
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0))} ${cur}`;
  }

  typeLabel(code: string | null | undefined): string {
    if (!code) {
      return '—';
    }
    const labels: Record<string, string> = {
      INSCRIPTION: 'Inscription',
      REINSCRIPTION: 'Réinscription',
      SCOLARITE: 'Scolarité',
      FOURNITURES: 'Fournitures'
    };
    return labels[code] ?? code;
  }

  /** Libellé type + mois pour les lignes de scolarité. */
  lineTypeLabel(line: { paymentType: string; tuitionMonthLabel?: string | null }): string {
    const base = this.typeLabel(line.paymentType);
    if (line.paymentType === 'SCOLARITE' && line.tuitionMonthLabel) {
      return `${base} [${line.tuitionMonthLabel}]`;
    }
    return base;
  }

  modeLabel(mode: string | null | undefined): string {
    if (!mode) {
      return '—';
    }
    const labels: Record<string, string> = {
      ESPECES: 'Espèces',
      ORANGE_MONEY: 'Orange Money',
      MOOV_MONEY: 'Moov Money',
      VIREMENT: 'Virement'
    };
    return labels[mode] ?? mode;
  }

  formatDate(raw: string | null | undefined): string {
    if (!raw) {
      return new Date().toLocaleString('fr-FR');
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('fr-FR');
  }

  printReceipt(): void {
    const dup = this.data.duplicate ? '<div class="dup-banner">DUPLICATA</div>' : '';
    const rows = (this.data.lines ?? [])
      .map(
        (l) =>
          `<tr><td>${this.lineTypeLabel(l)}</td><td style="text-align:right">${this.asMoney(l.amount)}</td></tr>`
      )
      .join('');
    const meta = `
      <p><strong>Référence :</strong> ${this.data.reference}</p>
      <p><strong>Élève :</strong> ${this.data.studentName}${this.data.matricule ? ` · ${this.data.matricule}` : ''}</p>
      ${this.data.schoolYearLabel ? `<p><strong>Année scolaire :</strong> ${this.data.schoolYearLabel}</p>` : ''}
      <p><strong>Auteur de l’enregistrement :</strong> ${this.data.recordedBy || '—'}</p>
      <p><strong>Mode de paiement :</strong> ${this.modeLabel(this.data.paymentMode)}</p>
      <p><strong>Date :</strong> ${this.formatDate(this.data.paymentDate)}</p>
      <table class="lines" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;margin-top:12px">
        <thead><tr><th align="left">Type</th><th align="right">Montant</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th align="left">Total encaissé</th><th align="right">${this.asMoney(this.data.totalCollected)}</th></tr></tfoot>
      </table>`;
    const content = `
      <html>
      <head>
        <title>Reçu ${this.data.reference}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          .dup-banner { background:#fee; color:#b71c1c; font-weight:bold; text-align:center; padding:10px; margin-bottom:16px; border:2px solid #b71c1c; }
        </style>
      </head>
      <body>
        <h2>Reçu de paiement</h2>
        ${dup}
        ${meta}
      </body>
      </html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
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
