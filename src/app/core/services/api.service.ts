import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService,
  ) {}

  private authHeaders(): HttpHeaders | undefined {
    const tokens = this.tokenService.getTokens?.();
    if (!tokens?.accessToken) return undefined;
    return new HttpHeaders({ Authorization: `Bearer ${tokens.accessToken}` });
  }

  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    // Add cache-busting for vendor list to prevent 304 responses
    const cacheBust = endpoint.includes('/vendors') ? { _t: Date.now() } : {};
    const mergedParams = { ...cacheBust, ...params };
    return this.request<T>('get', endpoint, { params: mergedParams });
  }

  post<T>(endpoint: string, body?: unknown): Observable<T> {
    return this.request<T>('post', endpoint, { body });
  }

  put<T>(endpoint: string, body?: unknown): Observable<T> {
    return this.request<T>('put', endpoint, { body });
  }

  patch<T>(endpoint: string, body?: unknown): Observable<T> {
    return this.request<T>('patch', endpoint, { body });
  }

  delete<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    return this.request<T>('delete', endpoint, { params });
  }

  download(endpoint: string, params?: Record<string, any>) {
    return this.http.get(`${this.baseUrl}${endpoint}`, {
      params: this.createParams(params),
      responseType: 'blob',
      headers: this.authHeaders(),
    });
  }

  postDownload(endpoint: string, body?: unknown) {
    return this.http.post(`${this.baseUrl}${endpoint}`, body, {
      responseType: 'blob',
      headers: this.authHeaders(),
    });
  }

  uploadFile(endpoint: string, file: File, additionalData?: Record<string, any>): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    return this.http.post(`${this.baseUrl}${endpoint}`, formData, {
      headers: this.authHeaders(),
    });
  }

  private request<T>(
    method: HttpMethod,
    endpoint: string,
    options: {
      body?: unknown;
      params?: Record<string, any>;
    } = {},
  ): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.createParams(options.params);
    const headers = this.authHeaders();
    switch (method) {
      case 'get':
        return this.http.get<T>(url, { params: httpParams, headers });
      case 'post':
        return this.http.post<T>(url, options.body, { headers });
      case 'put':
        return this.http.put<T>(url, options.body, { headers });
      case 'patch':
        return this.http.patch<T>(url, options.body, { headers });
      case 'delete':
        return this.http.delete<T>(url, { params: httpParams, headers });
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private createParams(params?: Record<string, any>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      httpParams = httpParams.set(key, value);
    });
    return httpParams;
  }
}
