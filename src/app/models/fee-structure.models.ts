export interface FeeStructureDto {
  id: number;
  tenantId: number;
  classLevelId: number;
  classLevelCode: string;
  classLevelName: string;
  schoolYearId: number;
  schoolYearLabel: string;
  registrationFee: number;
  reRegistrationFee: number;
  monthlyTuitionFee: number;
  suppliesFee: number;
  suppliesColumnEnabled: boolean;
  currency: string;
}

export interface FeeStructureWritePayload {
  classLevelId: number;
  schoolYearId: number;
  registrationFee: number;
  reRegistrationFee: number;
  monthlyTuitionFee: number;
  suppliesFee: number;
  suppliesColumnEnabled: boolean;
  currency: string;
}
