import { Injectable } from '@angular/core';
import { Observable, interval, throwError, of } from 'rxjs';
import { switchMap, takeWhile, catchError, map } from 'rxjs/operators';
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

export interface OcrJobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface OcrJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: OcrResponse;
  error?: string;
  fileName?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private readonly POLL_INTERVAL = 2000; // Poll every 2 seconds
  private readonly MAX_POLL_ATTEMPTS = 150; // Max 5 minutes (150 * 2s)

  constructor(private readonly api: ApiService) {}

  /**
   * Process file with OCR (async with polling)
   * Returns an Observable that emits progress updates and final result
   */
  processFile(file: File): Observable<OcrJobStatus> {
    const formData = new FormData();
    formData.append('file', file);

    // Step 1: Queue the job
    return this.api.post<OcrJobResponse>('/ocr/process', formData).pipe(
      switchMap((jobResponse) => {
        if (!jobResponse.jobId) {
          return throwError(() => new Error('Failed to create OCR job'));
        }

        // Step 2: Poll for job status
        return this.pollJobStatus(jobResponse.jobId);
      }),
      catchError((error) => {
        console.error('OCR processing error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Poll job status until completion or failure
   */
  private pollJobStatus(jobId: string): Observable<OcrJobStatus> {
    let attempts = 0;

    return interval(this.POLL_INTERVAL).pipe(
      switchMap(() => {
        attempts++;
        return this.getJobStatus(jobId);
      }),
      takeWhile((status) => {
        // Continue polling if job is pending or processing
        // Stop if completed, failed, or max attempts reached
        if (status.status === 'completed' || status.status === 'failed') {
          return false;
        }
        if (attempts >= this.MAX_POLL_ATTEMPTS) {
          return false;
        }
        return true;
      }, true), // Emit the last value before completing
      catchError((error) => {
        console.error('Error polling OCR job status:', error);
        // Return a failed status on error
        return of({
          jobId,
          status: 'failed' as const,
          progress: 0,
          error: error.message || 'Failed to check job status',
        });
      })
    );
  }

  /**
   * Get current job status
   */
  getJobStatus(jobId: string): Observable<OcrJobStatus> {
    return this.api.get<OcrJobStatus>(`/ocr/status/${jobId}`);
  }

  /**
   * Queue a file for OCR processing and return job ID immediately
   * Use this if you want to handle polling yourself
   */
  queueOcrJob(file: File): Observable<OcrJobResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<OcrJobResponse>('/ocr/process', formData);
  }
}
