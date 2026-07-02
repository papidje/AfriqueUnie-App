export interface StudentPaymentStatusDto {
  studentId: number;
  lastName: string;
  firstName: string;
  matricule: string;
  phone: string;
  insReinsLabel: string;
  insReinsPaid: number;
  insReinsExpected: number;
  suppliesColumnEnabled: boolean;
  hasPaidSupplies: boolean;
  suppliesExpected: number;
  tuitionPaid: number;
  tuitionExpected: number;
  totalPaid: number;
  totalExpected: number;
  paymentPercentage: number;
  monthlyCoverage: Record<string, boolean>;
}

export interface MonthlyTuitionStatusDto {
  monthCode: string;
  monthLabel: string;
  dueAmount: number;
  paidAmount: number;
  status: 'COMPLET' | 'PARTIEL' | 'NON_PAYE' | string;
}

export interface StudentPaymentInfoDto {
  studentId: number;
  /** Classe de l’élève (pour retour liste après paiement). */
  schoolClassId?: number | null;
  studentName: string;
  matricule: string;
  insReinsType: string;
  insReinsExpected: number;
  insReinsPaid: number;
  insReinsRemaining: number;
  suppliesPaid: boolean;
  suppliesExpected: number;
  /** Aligné sur la structure de frais : si false, pas de ligne fournitures à l’encaissement. Absent (API ancienne) = activé. */
  suppliesColumnEnabled?: boolean;
  monthlyTuition: MonthlyTuitionStatusDto[];
}

export interface CreateStudentPaymentPayload {
  paymentMode: 'ESPECES' | 'ORANGE_MONEY' | 'MOOV_MONEY' | 'VIREMENT';
  currency: string;
  /** Personne ayant enregistré l’encaissement (obligatoire côté API). */
  recordedBy: string;
  /** Si défini (> 0), le serveur répartit ce montant (inscription → fournitures complètes → mois). */
  totalDeclaredAmount?: number | null;
  payInsReins: boolean;
  insReinsAmount: number;
  paySupplies: boolean;
  months: string[];
}

/** Ligne d’historique (fiche élève, tous comptes / années). */
export interface StudentPaymentLedgerRow {
  id: number;
  paymentType: string;
  amount: number;
  currency: string;
  paymentMode: string | null;
  paymentDate: string;
  schoolYearLabel: string;
  /** Même valeur pour toutes les lignes d’un même encaissement ; absent pour d’anciennes données. */
  receiptReference?: string | null;
  recordedBy?: string | null;
  /** Nom du compte ayant enregistré la ligne (historique fiche élève uniquement). */
  validatedByUserName?: string | null;
  /** Libellé du mois pour une ligne SCOLARITE (ex. « Octobre »). */
  tuitionMonthLabel?: string | null;
}

export interface PaymentReceiptLineDto {
  paymentType: string;
  amount: number;
  tuitionMonthLabel?: string | null;
}

export interface CreateStudentPaymentResponse {
  studentId: number;
  /** Présent après encaissement : retour `/finance?classId=`. */
  schoolClassId?: number | null;
  totalCollected: number;
  paymentMode: string;
  receiptReference: string;
  recordedBy: string;
  lines: PaymentReceiptLineDto[];
}

/** Réponse GET duplicata (alignée sur {@code PaymentReceiptView} backend). */
export interface PaymentReceiptViewDto {
  studentName: string;
  matricule: string;
  schoolYearLabel: string;
  receiptReference: string;
  recordedBy: string;
  paymentMode: string;
  currency: string;
  paymentDate: string;
  lines: PaymentReceiptLineDto[];
  totalCollected: number;
  balanceRemaining?: number | null;
  duplicate: boolean;
}

