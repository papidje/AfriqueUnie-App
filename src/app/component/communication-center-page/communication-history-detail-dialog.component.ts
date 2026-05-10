import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommunicationHistoryRow } from '../../service/communication-api.service';

export interface CommunicationHistoryDetailData {
  row: CommunicationHistoryRow;
}

@Component({
  selector: 'app-communication-history-detail-dialog',
  templateUrl: './communication-history-detail-dialog.component.html',
  styleUrls: ['./communication-history-detail-dialog.component.scss']
})
export class CommunicationHistoryDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: CommunicationHistoryDetailData) {}

  /** Texte archivé ; sinon extrait court ; sinon message par défaut. */
  bodyText(): string {
    const r = this.data.row;
    const full = r.bodyContent?.trim();
    if (full) {
      return full;
    }
    const prev = r.bodyPreview?.trim();
    if (prev) {
      return prev + (prev.endsWith('…') ? '' : ' (extrait — envoi antérieur sans archive complète)');
    }
    return 'Aucun contenu archivé pour cet envoi.';
  }
}
