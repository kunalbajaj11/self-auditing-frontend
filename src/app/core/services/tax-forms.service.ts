import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  TaxForm,
  TaxFormType,
  GenerateVATReturnRequest,
  GenerateVATReturnResponse,
} from '../models/tax-form.model';

@Injectable({
  providedIn: 'root',
})
export class TaxFormsService {
  private readonly baseUrl = `${this.apiService.baseUrl}/tax-forms`;

  constructor(
    private readonly http: HttpClient,
    private readonly apiService: ApiService,
  ) {}

  getTaxForms(
    formType?: TaxFormType,
    period?: string,
  ): Observable<TaxForm[]> {
    let params = new HttpParams();
    if (formType) {
      params = params.set('formType', formType);
    }
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<TaxForm[]>(this.baseUrl, { params });
  }

  getTaxFormById(id: string): Observable<TaxForm> {
    return this.http.get<TaxForm>(`${this.baseUrl}/${id}`);
  }

  generateVATReturn(
    request: GenerateVATReturnRequest,
  ): Observable<GenerateVATReturnResponse> {
    return this.http.post<GenerateVATReturnResponse>(
      `${this.baseUrl}/generate-vat-return`,
      request,
    );
  }

  downloadVATReturn(request: GenerateVATReturnRequest): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/generate-vat-return/download`,
      request,
      { responseType: 'blob' },
    );
  }

  updateTaxForm(
    id: string,
    updates: Partial<TaxForm>,
  ): Observable<TaxForm> {
    return this.http.patch<TaxForm>(`${this.baseUrl}/${id}`, updates);
  }

  markFormAsFiled(
    id: string,
    filingReference: string,
  ): Observable<TaxForm> {
    return this.http.post<TaxForm>(`${this.baseUrl}/${id}/file`, {
      filingReference,
    });
  }
}

