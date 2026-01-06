import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComplianceService } from '../../../core/services/compliance.service';
import { ComplianceType, FilingFrequency } from '../../../core/models/compliance.model';

@Component({
  selector: 'app-create-deadline-dialog',
  templateUrl: './create-deadline-dialog.component.html',
  styleUrls: ['./create-deadline-dialog.component.scss'],
})
export class CreateDeadlineDialogComponent {
  form: FormGroup;
  loading = false;

  complianceTypes = [
    { value: ComplianceType.VAT_RETURN, label: 'VAT Return' },
    { value: ComplianceType.TDS_RETURN, label: 'TDS Return' },
    { value: ComplianceType.EPF_CHALLAN, label: 'EPF Challan' },
    { value: ComplianceType.ESI_CHALLAN, label: 'ESI Challan' },
    { value: ComplianceType.PROFESSIONAL_TAX, label: 'Professional Tax' },
    { value: ComplianceType.GSTR_1, label: 'GSTR-1' },
    { value: ComplianceType.GSTR_3B, label: 'GSTR-3B' },
    { value: ComplianceType.ANNUAL_RETURN, label: 'Annual Return' },
  ];

  filingFrequencies = [
    { value: FilingFrequency.MONTHLY, label: 'Monthly' },
    { value: FilingFrequency.QUARTERLY, label: 'Quarterly' },
    { value: FilingFrequency.ANNUAL, label: 'Annual' },
    { value: FilingFrequency.AD_HOC, label: 'Ad-hoc' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly complianceService: ComplianceService,
    private readonly dialogRef: MatDialogRef<CreateDeadlineDialogComponent>,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      complianceType: ['', Validators.required],
      period: ['', Validators.required],
      dueDate: ['', Validators.required],
      filingFrequency: [FilingFrequency.MONTHLY, Validators.required],
    });
  }

  create(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    const formValue = this.form.value;
    const dueDate = formValue.dueDate instanceof Date
      ? formValue.dueDate.toISOString().split('T')[0]
      : formValue.dueDate;

    this.complianceService
      .createDeadline({
        complianceType: formValue.complianceType,
        period: formValue.period,
        dueDate,
        filingFrequency: formValue.filingFrequency,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Deadline created successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error creating deadline:', error);
          this.snackBar.open('Error creating deadline', 'Close', {
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

