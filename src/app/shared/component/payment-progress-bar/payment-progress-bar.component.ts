import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { StudentPaymentInfoDto } from '../../../models/finance.models';
import {
  buildPaymentProgressModel,
  formatMoneyGnf,
  PaymentProgressModel,
  PaymentProgressSegment
} from '../../util/payment-progress.util';

@Component({
  selector: 'app-payment-progress-bar',
  templateUrl: './payment-progress-bar.component.html',
  styleUrls: ['./payment-progress-bar.component.scss']
})
export class PaymentProgressBarComponent implements OnChanges {
  @Input() info: StudentPaymentInfoDto | null = null;
  /** Montant sur le point d’être encaissé (bleu). Ignoré si interactive=false. */
  @Input() collectAmount = 0;
  /** Affiche curseur + zone bleue. */
  @Input() interactive = false;
  @Input() helpText: string | null = null;

  model: PaymentProgressModel | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['info']) {
      this.model = this.info ? buildPaymentProgressModel(this.info) : null;
    }
  }

  get paidPct(): number {
    if (!this.model || this.model.totalDue <= 0) {
      return 0;
    }
    return (this.model.paidTotal / this.model.totalDue) * 100;
  }

  get pendingPct(): number {
    if (!this.interactive || !this.model || this.model.totalDue <= 0) {
      return 0;
    }
    const amount = Math.max(0, Math.min(this.model.maxRemaining, Number(this.collectAmount) || 0));
    return (amount / this.model.totalDue) * 100;
  }

  get summaryLine(): string {
    if (!this.model || this.model.totalDue <= 0) {
      return '';
    }
    const pct = Math.round((this.model.paidTotal / this.model.totalDue) * 100);
    return `${formatMoneyGnf(this.model.paidTotal)} / ${formatMoneyGnf(this.model.totalDue)} GNF · ${pct} %`;
  }

  asMoney(value: number): string {
    return formatMoneyGnf(value);
  }

  trackSegmentById(_index: number, seg: PaymentProgressSegment): string {
    return seg.id;
  }
}
