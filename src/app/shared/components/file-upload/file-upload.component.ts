import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, Subscription } from 'rxjs';
import { AttachmentsService, UploadResult } from '../../../core/services/attachments.service';
import { OcrService } from '../../../core/services/ocr.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent implements OnDestroy {
  @Input() accept = 'image/*,.pdf';
  @Input() multiple = false;
  @Input() folder?: string;
  @Input() enableOcr = false;
  @Output() fileUploaded = new EventEmitter<UploadResult>();
  @Output() ocrResult = new EventEmitter<any>();

  isDragging = false;
  uploadedFiles: UploadResult[] = [];
  uploading = false;
  processingOcr = false;
  isMobile = false;
  loadingMessage = 'Uploading file...';
  private ocrSubscription?: Subscription;

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly ocrService: OcrService,
    private readonly snackBar: MatSnackBar,
  ) {
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth < 768;
    
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private async handleFiles(files: File[]): Promise<void> {
    const filesToUpload = this.multiple ? files : [files[0]];

    for (const file of filesToUpload) {
      await this.uploadFile(file);
    }
  }

  private async uploadFile(file: File): Promise<void> {
    this.uploading = true;
    this.loadingMessage = 'Uploading file...';

    try {
      // Upload file
      const uploadResult = await firstValueFrom(
        this.attachmentsService.uploadFile(file, this.folder)
      );

      if (uploadResult) {
        this.uploadedFiles.push(uploadResult);
        this.fileUploaded.emit(uploadResult);

        // Process OCR if enabled and file type is supported (images or PDFs)
        if (this.enableOcr && this.isOcrSupported(file)) {
          // Continue showing loader, just update message
          this.loadingMessage = 'Extracting data from document...';
          await this.processOcr(file);
          // Don't show "File uploaded" message if OCR is processing - OCR will show its own message
        } else {
          // Only show success message if OCR is not enabled or file type not supported
          this.uploading = false;
          if (this.enableOcr && !this.isOcrSupported(file)) {
            // OCR is enabled but file type not supported
            this.snackBar.open('File uploaded. OCR is only supported for images and PDFs.', 'Close', {
              duration: 4000,
            });
          } else {
            this.snackBar.open('File uploaded successfully', 'Close', {
              duration: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      this.uploading = false;
      this.snackBar.open('Failed to upload file', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
    }
  }

  private async processOcr(file: File): Promise<void> {
    // Keep uploading state true, just update message
    this.processingOcr = true;
    this.loadingMessage = 'Queuing OCR job...';

    try {
      // Process OCR with polling - this will emit status updates
      const ocrStatus$ = this.ocrService.processFile(file);
      
      // Unsubscribe from previous subscription if exists
      if (this.ocrSubscription) {
        this.ocrSubscription.unsubscribe();
      }
      
      // Subscribe to status updates
      this.ocrSubscription = ocrStatus$.subscribe({
        next: (status) => {
          // Update loading message based on status
          if (status.status === 'pending') {
            this.loadingMessage = 'OCR job queued, waiting to start...';
          } else if (status.status === 'processing') {
            const progress = status.progress || 0;
            this.loadingMessage = `Extracting data from document... ${progress}%`;
          } else if (status.status === 'completed') {
            this.loadingMessage = 'OCR completed!';
            if (status.result) {
              this.ocrResult.emit(status.result);
              // Don't show snackbar here - let the parent component handle the dialog opening
            }
            this.uploading = false;
            this.processingOcr = false;
          } else if (status.status === 'failed') {
            this.uploading = false;
            this.processingOcr = false;
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const errorMessage = status.error 
              ? `OCR failed: ${status.error}`
              : (isPdf 
                ? 'Failed to extract data from PDF. Please try again or enter details manually.'
                : 'OCR processing failed. Please try again or enter details manually.');
            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              panelClass: ['snack-error'],
            });
          }
        },
        error: (error: any) => {
          console.error('Error processing OCR:', error);
          this.uploading = false;
          this.processingOcr = false;
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          const errorMessage = error?.message 
            ? `OCR error: ${error.message}`
            : (isPdf 
              ? 'Failed to extract data from PDF. Please try again or enter details manually.'
              : 'OCR processing failed. Please try again or enter details manually.');
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
        complete: () => {
          // Observable completed
          if (this.processingOcr) {
            // If still processing, something went wrong
            this.uploading = false;
            this.processingOcr = false;
          }
        }
      });
    } catch (error: any) {
      console.error('Error starting OCR processing:', error);
      this.uploading = false;
      this.processingOcr = false;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const errorMessage = isPdf 
        ? 'Failed to start OCR processing. Please try again or enter details manually.'
        : 'Failed to start OCR processing. Please try again or enter details manually.';
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['snack-error'],
      });
    }
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file type is supported for OCR processing
   * Supports images (jpg, png, etc.) and PDFs
   */
  private isOcrSupported(file: File): boolean {
    // Check if it's an image file
    if (file.type.startsWith('image/')) {
      return true;
    }
    
    // Check if it's a PDF file
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    
    return false;
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  clearFiles(): void {
    this.uploadedFiles = [];
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.ocrSubscription) {
      this.ocrSubscription.unsubscribe();
    }
  }
}

