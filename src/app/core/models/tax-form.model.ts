export enum TaxFormType {
  VAT_RETURN_UAE = 'vat_return_uae',
  VAT_RETURN_SAUDI = 'vat_return_saudi',
  VAT_RETURN_OMAN = 'vat_return_oman',
  VAT_RETURN_KUWAIT = 'vat_return_kuwait',
  VAT_RETURN_BAHRAIN = 'vat_return_bahrain',
  VAT_RETURN_QATAR = 'vat_return_qatar',
  TDS_RETURN_26Q = 'tds_return_26q',
  TDS_RETURN_27Q = 'tds_return_27q',
  TDS_RETURN_24Q = 'tds_return_24Q',
  EPF_CHALLAN = 'epf_challan',
  ESI_CHALLAN = 'esi_challan',
  GSTR_1 = 'gstr_1',
  GSTR_3B = 'gstr_3b',
}

export enum TaxFormStatus {
  DRAFT = 'draft',
  GENERATED = 'generated',
  VALIDATED = 'validated',
  FILED = 'filed',
  REJECTED = 'rejected',
}

export interface TaxForm {
  id: string;
  formType: TaxFormType;
  region?: string;
  period: string;
  formData?: any;
  status: TaxFormStatus;
  generatedAt?: string;
  filedAt?: string;
  generatedById?: string;
  filedById?: string;
  filePath?: string;
  fileFormat?: string;
  version: number;
  notes?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
  filingReference?: string;
  filingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VATReturnData {
  period: string;
  organization: {
    name: string;
    vatNumber?: string;
    address?: string;
  };
  sales: {
    standardRate: { amount: number; vatAmount: number; count: number };
    zeroRate: { amount: number; vatAmount: number; count: number };
    exempt: { amount: number; count: number };
    reverseCharge: { amount: number; vatAmount: number; count: number };
  };
  purchases: {
    standardRate: { amount: number; vatAmount: number; count: number };
    zeroRate: { amount: number; vatAmount: number; count: number };
    exempt: { amount: number; count: number };
    reverseCharge: { amount: number; vatAmount: number; count: number };
  };
  adjustments: {
    outputVAT: number;
    inputVAT: number;
    description?: string;
  };
  totals: {
    totalOutputVAT: number;
    totalInputVAT: number;
    netVATPayable: number;
    refundable: number;
  };
}

export interface GenerateVATReturnRequest {
  formType: TaxFormType;
  period: string;
  format?: 'pdf' | 'excel' | 'csv';
  notes?: string;
}

export interface GenerateVATReturnResponse {
  form: TaxForm;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  file: {
    buffer: string;
    format: string;
    filename: string;
  };
}

