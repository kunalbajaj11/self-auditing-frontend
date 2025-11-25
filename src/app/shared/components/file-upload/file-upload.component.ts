import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AttachmentsService, UploadResult } from '../../../core/services/attachments.service';
import { OcrService } from '../../../core/services/ocr.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent {
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

        // Process OCR if enabled
        if (this.enableOcr && this.isImageFile(file)) {
          // Continue showing loader, just update message
          this.loadingMessage = 'Extracting data from document...';
          await this.processOcr(file);
          // Don't show "File uploaded" message if OCR is processing - OCR will show its own message
        } else {
          // Only show success message if OCR is not enabled
          this.uploading = false;
          this.snackBar.open('File uploaded successfully', 'Close', {
            duration: 3000,
          });
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
    this.loadingMessage = 'Extracting data from document...';

    try {
      const ocrResult = await firstValueFrom(
        this.ocrService.processFile(file)
      );
      if (ocrResult) {
        this.ocrResult.emit(ocrResult);
        // Don't show snackbar here - let the parent component handle the dialog opening
      }
    } catch (error) {
      console.error('Error processing OCR:', error);
      this.uploading = false;
      this.snackBar.open('OCR processing failed', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
    } finally {
      // Only set uploading to false after OCR completes (success or failure)
      this.uploading = false;
    }
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  clearFiles(): void {
    this.uploadedFiles = [];
  }
}

