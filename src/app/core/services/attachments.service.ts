import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

export interface UploadResult {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  constructor(
    private readonly api: ApiService,
    private readonly tokenService: TokenService,
  ) {}

  uploadFile(file: File, folder?: string): Observable<UploadResult> {
    return this.api.uploadFile('/attachments/upload', file, folder ? { folder } : undefined);
  }

  getSignedUrl(fileKey: string, expiresIn?: number): Observable<{ url: string }> {
    return this.api.get<{ url: string }>('/attachments/signed-url', {
      fileKey,
      expiresIn: expiresIn?.toString(),
    });
  }

  viewAttachment(attachmentId: string): Observable<{ url: string }> {
    // Request JSON response with signed URL. Also include token fallback for cross-tab flows.
    const token = this.tokenService.getTokens?.()?.accessToken;
    const params: Record<string, any> = { json: '1' };
    if (token) params['access_token'] = token;
    return this.api.get<{ url: string }>(`/attachments/view/${attachmentId}`, params);
  }

  downloadAttachment(attachmentId: string): Observable<{ url: string; fileName?: string; fileType?: string }> {
    // Request JSON response with signed URL. Also include token fallback for cross-tab flows.
    const token = this.tokenService.getTokens?.()?.accessToken;
    const params: Record<string, any> = { json: '1' };
    if (token) params['access_token'] = token;
    return this.api.get<{ url: string; fileName?: string; fileType?: string }>(`/attachments/download/${attachmentId}`, params);
  }

  deleteFile(fileKey: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/attachments/${fileKey}`);
  }
}

