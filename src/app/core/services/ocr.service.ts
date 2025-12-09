import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OcrResponse {
  vendorName?: string;
  vendorTrn?: string;
  invoiceNumber?: string;
  amount?: number;
  vatAmount?: number;
  expenseDate?: string;
  description?: string;
  suggestedCategoryId?: string;
  confidence: number;
  fields: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  constructor(private readonly api: ApiService) {}

  processFile(file: File): Observable<OcrResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<OcrResponse>('/ocr/process', formData);
  }
}
