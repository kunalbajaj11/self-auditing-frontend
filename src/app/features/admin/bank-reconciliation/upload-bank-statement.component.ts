import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BankReconciliationService } from '../../../core/services/bank-reconciliation.service';
import { LicenseService } from '../../../core/services/license.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-upload-bank-statement',
  templateUrl: './upload-bank-statement.component.html',
  styleUrls: ['./upload-bank-statement.component.scss'],
})
export class UploadBankStatementComponent implements OnInit {
  form: FormGroup;
  loading = false;
  selectedFile: File | null = null;
  dragOver = false;
  isEnterprise$: Observable<boolean>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly reconciliationService: BankReconciliationService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
    this.form = this.fb.group({
      statementPeriodStart: [''],
      statementPeriodEnd: [''],
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  upload(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Please select a file', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
    const fileExtension = this.selectedFile.name
      .toLowerCase()
      .substring(this.selectedFile.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      this.snackBar.open(
        'Invalid file format. Please upload CSV, XLSX, or PDF files only.',
        'Close',
        {
          duration: 4000,
          panelClass: ['snack-error'],
        },
      );
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.reconciliationService
      .uploadStatement(
        this.selectedFile,
        formValue.statementPeriodStart || undefined,
        formValue.statementPeriodEnd || undefined,
      )
      .subscribe({
        next: (record) => {
          this.loading = false;
          this.snackBar.open('Bank statement uploaded successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/admin/bank-reconciliation', record.id]);
        },
        error: (error) => {
          this.loading = false;
          const message =
            error.error?.message ||
            'Failed to upload bank statement. Please verify the file format.';
          this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  removeFile(): void {
    this.selectedFile = null;
  }
}

