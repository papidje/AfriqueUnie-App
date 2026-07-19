import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { FinanceApiService } from '../../../service/finance-api.service';
import { PaymentReceiptPrintData } from './payment-receipt-print-dialog.models';
import { formatDisplayDateTime } from '../../util/display-date.util';

@Component({
  selector: 'app-payment-receipt-print-dialog',
  templateUrl: './payment-receipt-print-dialog.component.html',
  styleUrls: ['./payment-receipt-print-dialog.component.scss']
})
export class PaymentReceiptPrintDialogComponent {
  loadingPdf = false;

  constructor(
    public readonly dialogRef: MatDialogRef<PaymentReceiptPrintDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PaymentReceiptPrintData,
    private readonly financeApi: FinanceApiService,
    private readonly snackBar: MatSnackBar
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
      return formatDisplayDateTime(new Date());
    }
    const formatted = formatDisplayDateTime(raw);
    return formatted === '—' ? String(raw) : formatted;
  }

  /**
   * Même principe que l’attestation d’inscription (fiche élève) : ouverture du PDF dans un nouvel onglet.
   */
  previewReceiptPdf(): void {
    if (!this.data.studentId) {
      this.snackBar.open('Aperçu du reçu indisponible (élève).', 'Fermer', { duration: 4000 });
      return;
    }
    const ref = (this.data.reference || '').trim();
    if (!ref) {
      this.snackBar.open('Référence du reçu manquante.', 'Fermer', { duration: 4000 });
      return;
    }
    this.loadingPdf = true;
    this.financeApi
      .getReceiptPdfBlob(this.data.studentId, ref, this.data.duplicate === true)
      .pipe(finalize(() => (this.loadingPdf = false)))
      .subscribe({
        next: (blob) => {
          if (blob.size === 0) {
            this.snackBar.open('Fichier PDF vide.', 'Fermer', { duration: 5000 });
            return;
          }
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(this.receiptPdfErrorMessage(err), 'Fermer', { duration: 6000 });
        }
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private receiptPdfErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Réseau indisponible ou requête bloquée.';
    }
    if (err.error instanceof Blob && err.error.type !== 'application/pdf') {
      return 'Impossible d’ouvrir le reçu PDF. Vérifiez la connexion et vos droits.';
    }
    const obj = err.error as { message?: string } | undefined;
    if (obj?.message) {
      return obj.message;
    }
    if (err.status === 400) {
      return 'Référence du reçu ou élève invalide.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Accès refusé à ce reçu.';
    }
    return 'Impossible d’ouvrir le reçu PDF.';
  }
}
