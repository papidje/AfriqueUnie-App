export interface PaymentReceiptLine {
  paymentType: string;
  amount: number;
  /** Mois couvert pour une ligne SCOLARITE (reçu / duplicata). */
  tuitionMonthLabel?: string | null;
}

/** Données pour impression / duplicata (reçu unique ou groupe de lignes même référence). */
export interface PaymentReceiptPrintData {
  /** Obligatoire pour l’aperçu PDF côté serveur (même ressource que l’impression Thymeleaf). */
  studentId: number;
  studentName: string;
  matricule?: string | null;
  schoolYearLabel?: string | null;
  reference: string;
  recordedBy?: string | null;
  paymentMode?: string | null;
  currency?: string | null;
  paymentDate?: string | null;
  lines: PaymentReceiptLine[];
  totalCollected: number;
  /** Affiche « DUPLICATA » sur le document. */
  duplicate?: boolean;
}
