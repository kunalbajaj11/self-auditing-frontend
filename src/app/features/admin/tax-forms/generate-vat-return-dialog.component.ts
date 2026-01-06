import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaxFormsService } from '../../../core/services/tax-forms.service';
import { TaxFormType } from '../../../core/models/tax-form.model';

@Component({
  selector: 'app-generate-vat-return-dialog',
  templateUrl: './generate-vat-return-dialog.component.html',
  styleUrls: ['./generate-vat-return-dialog.component.scss'],
})
export class GenerateVATReturnDialogComponent {
  form: FormGroup;
  loading = false;

  formTypes = [
    { value: TaxFormType.VAT_RETURN_UAE, label: 'UAE VAT Return' },
    { value: TaxFormType.VAT_RETURN_SAUDI, label: 'Saudi VAT Return' },
    { value: TaxFormType.VAT_RETURN_OMAN, label: 'Oman VAT Return' },
    { value: TaxFormType.VAT_RETURN_KUWAIT, label: 'Kuwait VAT Return' },
    { value: TaxFormType.VAT_RETURN_BAHRAIN, label: 'Bahrain VAT Return' },
    { value: TaxFormType.VAT_RETURN_QATAR, label: 'Qatar VAT Return' },
  ];

  formats = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly taxFormsService: TaxFormsService,
    private readonly dialogRef: MatDialogRef<GenerateVATReturnDialogComponent>,
    private readonly snackBar: MatSnackBar,
  ) {
    // Default to current month
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    this.form = this.fb.group({
      formType: [TaxFormType.VAT_RETURN_UAE, Validators.required],
      period: [period, Validators.required],
      format: ['pdf'],
      notes: [''],
    });
  }

  generate(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.taxFormsService.generateVATReturn(this.form.value).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.validation.isValid) {
          this.snackBar.open('VAT return generated successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        } else {
          let message = 'VAT return generated with warnings:\n';
          message += response.validation.warnings.join('\n');
          if (response.validation.errors.length > 0) {
            message += '\n\nErrors:\n';
            message += response.validation.errors.join('\n');
          }
          this.snackBar.open(message, 'Close', { duration: 5000 });
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        console.error('Error generating VAT return:', error);
        this.snackBar.open('Error generating VAT return', 'Close', {
          duration: 3000,
        });
        this.loading = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

