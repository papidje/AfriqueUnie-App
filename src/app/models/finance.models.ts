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
  /** Si défini (> 0), le serveur répartit ce montant (inscription → fournitures complètes → mois). */
  totalDeclaredAmount?: number | null;
  payInsReins: boolean;
  insReinsAmount: number;
  paySupplies: boolean;
  months: string[];
}

export interface CreateStudentPaymentResponse {
  studentId: number;
  /** Présent après encaissement : retour `/finance?classId=`. */
  schoolClassId?: number | null;
  totalCollected: number;
  paymentMode: string;
  receiptReference: string;
}

