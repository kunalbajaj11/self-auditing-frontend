import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface InvoiceTemplateSettings {
  invoiceLogoUrl?: string | null;
  invoiceHeaderText?: string | null;
  invoiceColorScheme?: string | null;
  invoiceCustomColor?: string | null;
  invoiceTitle?: string | null;
  invoiceShowCompanyDetails?: boolean | null;
  invoiceShowVatDetails?: boolean | null;
  invoiceShowPaymentTerms?: boolean | null;
  invoiceShowPaymentMethods?: boolean | null;
  invoiceShowBankDetails?: boolean | null;
  invoiceShowTermsConditions?: boolean | null;
  invoiceDefaultPaymentTerms?: string | null;
  invoiceCustomPaymentTerms?: string | null;
  invoiceDefaultNotes?: string | null;
  invoiceTermsConditions?: string | null;
  invoiceFooterText?: string | null;
  invoiceShowFooter?: boolean | null;
  invoiceShowItemDescription?: boolean | null;
  invoiceShowItemQuantity?: boolean | null;
  invoiceShowItemUnitPrice?: boolean | null;
  invoiceShowItemTotal?: boolean | null;
  invoiceEmailSubject?: string | null;
  invoiceEmailMessage?: string | null;
}

export interface TaxSettings {
  taxRegistrationNumber?: string | null;
  taxRegistrationDate?: string | null;
  taxAuthority?: string | null;
  taxCalculationMethod?: string | null;
  taxDefaultRate?: number | null;
  taxRoundingMethod?: string | null;
  taxDefaultCode?: string | null;
  taxReportingPeriod?: string | null;
  taxYearEnd?: string | null;
  taxEnableReverseCharge?: boolean | null;
  taxReverseChargeRate?: number | null;
  taxCalculateOnShipping?: boolean | null;
  taxCalculateOnDiscounts?: boolean | null;
  taxShowOnInvoices?: boolean | null;
  taxShowBreakdown?: boolean | null;
}

export interface TaxRate {
  id?: string;
  code: string;
  name: string;
  rate: number;
  type: 'standard' | 'reduced' | 'zero' | 'exempt';
  description?: string;
  isActive: boolean;
}

export interface CurrencySettings {
  currencyExchangeRateSource?: string | null;
  currencyAutoUpdateRates?: boolean | null;
  currencyUpdateFrequency?: string | null;
  currencyTrackFxGainLoss?: boolean | null;
  currencyFxGainLossAccount?: string | null;
  currencyDisplayFormat?: string | null;
  currencyRounding?: number | null;
  currencyRoundingMethod?: string | null;
  currencyShowOnInvoices?: boolean | null;
  currencyShowExchangeRate?: boolean | null;
}

export interface ExchangeRate {
  id?: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source: 'manual' | 'api' | 'auto';
  isActive: boolean;
}

export interface NumberingSettings {
  numberingUseSequential?: boolean | null;
  numberingAllowManual?: boolean | null;
  numberingWarnDuplicates?: boolean | null;
}

export interface NumberingSequence {
  id?: string;
  type: 'invoice' | 'credit_note' | 'quote' | 'purchase_order' | 'payment_receipt' | 'expense';
  prefix: string;
  suffix: string;
  nextNumber: number;
  numberLength: number;
  resetPeriod: 'never' | 'yearly' | 'quarterly' | 'monthly';
  lastResetDate?: string | null;
  format?: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly api: ApiService) {}

  // Invoice Template
  getInvoiceTemplate(): Observable<InvoiceTemplateSettings> {
    return this.api.get<InvoiceTemplateSettings>('/settings/invoice-template');
  }

  updateInvoiceTemplate(payload: Partial<InvoiceTemplateSettings>): Observable<InvoiceTemplateSettings> {
    return this.api.patch<InvoiceTemplateSettings>('/settings/invoice-template', payload);
  }

  // Tax Settings
  getTaxSettings(): Observable<TaxSettings> {
    return this.api.get<TaxSettings>('/settings/tax');
  }

  updateTaxSettings(payload: Partial<TaxSettings>): Observable<TaxSettings> {
    return this.api.patch<TaxSettings>('/settings/tax', payload);
  }

  // Tax Rates
  getTaxRates(): Observable<TaxRate[]> {
    return this.api.get<TaxRate[]>('/settings/tax/rates');
  }

  createTaxRate(payload: Omit<TaxRate, 'id'>): Observable<TaxRate> {
    return this.api.post<TaxRate>('/settings/tax/rates', payload);
  }

  updateTaxRate(id: string, payload: Partial<TaxRate>): Observable<TaxRate> {
    return this.api.patch<TaxRate>(`/settings/tax/rates/${id}`, payload);
  }

  deleteTaxRate(id: string): Observable<void> {
    return this.api.delete<void>(`/settings/tax/rates/${id}`);
  }

  // Currency Settings
  getCurrencySettings(): Observable<CurrencySettings> {
    return this.api.get<CurrencySettings>('/settings/currency');
  }

  updateCurrencySettings(payload: Partial<CurrencySettings>): Observable<CurrencySettings> {
    return this.api.patch<CurrencySettings>('/settings/currency', payload);
  }

  // Exchange Rates
  getExchangeRates(): Observable<ExchangeRate[]> {
    return this.api.get<ExchangeRate[]>('/settings/currency/exchange-rates');
  }

  createExchangeRate(payload: Omit<ExchangeRate, 'id'>): Observable<ExchangeRate> {
    return this.api.post<ExchangeRate>('/settings/currency/exchange-rates', payload);
  }

  updateExchangeRate(id: string, rate: number): Observable<ExchangeRate> {
    return this.api.patch<ExchangeRate>(`/settings/currency/exchange-rates/${id}`, { rate });
  }

  deleteExchangeRate(id: string): Observable<void> {
    return this.api.delete<void>(`/settings/currency/exchange-rates/${id}`);
  }

  updateExchangeRatesFromAPI(): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>('/settings/currency/exchange-rates/update-from-api', {});
  }

  // Numbering Sequences
  getNumberingSettings(): Observable<{ settings: NumberingSettings; sequences: NumberingSequence[] }> {
    return this.api.get<{ settings: NumberingSettings; sequences: NumberingSequence[] }>('/settings/numbering');
  }

  updateNumberingSettings(payload: Partial<NumberingSettings>): Observable<NumberingSettings> {
    return this.api.patch<NumberingSettings>('/settings/numbering', payload);
  }

  getNumberingSequences(): Observable<NumberingSequence[]> {
    return this.api.get<NumberingSequence[]>('/settings/numbering/sequences');
  }

  updateNumberingSequence(type: string, payload: Partial<NumberingSequence>): Observable<NumberingSequence> {
    return this.api.patch<NumberingSequence>(`/settings/numbering/sequences/${type}`, payload);
  }

  resetNumberingSequence(type: string): Observable<NumberingSequence> {
    return this.api.post<NumberingSequence>(`/settings/numbering/sequences/${type}/reset`, {});
  }
}

