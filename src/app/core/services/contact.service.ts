import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Submit contact form data
   * Endpoint: POST /api/contact (public endpoint, no auth required)
   */
  submitContactForm(data: ContactFormData): Observable<{ success: boolean; message?: string }> {
    // Contact endpoint is public, so we don't use ApiService (which adds auth headers)
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/contact`,
      data,
    );
  }
}

