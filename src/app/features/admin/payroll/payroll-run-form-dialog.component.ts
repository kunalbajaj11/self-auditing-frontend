import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PayrollService, PayrollRun, CreatePayrollRunPayload } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-payroll-run-form-dialog',
  templateUrl: './payroll-run-form-dialog.component.html',
  styleUrls: ['./payroll-run-form-dialog.component.scss'],
})
export class PayrollRunFormDialogComponent {
  form: FormGroup;
  loading = false;
  readonly isEdit: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PayrollRunFormDialogComponent>,
    private readonly payrollService: PayrollService,
    @Inject(MAT_DIALOG_DATA) public data: PayrollRun | null,
  ) {
    this.isEdit = Boolean(data);
    
    // Get default payroll period (current month in YYYY-MM format)
    const now = new Date();
    const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    this.form = this.fb.group({
      payrollPeriod: [
        data?.payrollPeriod || defaultPeriod,
        [
          Validators.required,
          Validators.pattern(/^\d{4}-\d{2}$/),
        ],
      ],
      payDate: [data?.payDate ? new Date(data.payDate) : '', Validators.required],
      notes: [data?.notes || ''],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;
    
    // Format date if it's a Date object
    let payDate = formValue.payDate;
    if (payDate instanceof Date) {
      payDate = payDate.toISOString().split('T')[0];
    } else if (typeof payDate === 'string' && payDate.includes('T')) {
      payDate = payDate.split('T')[0];
    }
    
    // Normalize payroll period: trim and ensure YYYY-MM format
    let payrollPeriod = formValue.payrollPeriod.trim();
    
    // If user entered something like "2024-1", convert to "2024-01"
    const periodMatch = payrollPeriod.match(/^(\d{4})-(\d{1,2})$/);
    if (periodMatch) {
      const year = periodMatch[1];
      const month = String(parseInt(periodMatch[2], 10)).padStart(2, '0');
      payrollPeriod = `${year}-${month}`;
    }
    
    const payload: CreatePayrollRunPayload = {
      payrollPeriod: payrollPeriod,
      payDate: payDate,
      notes: formValue.notes || undefined,
    };

    const operation = this.isEdit
      ? this.payrollService.updatePayrollRun(this.data!.id, payload)
      : this.payrollService.createPayrollRun(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatPayrollPeriod(): void {
    const periodControl = this.form.get('payrollPeriod');
    if (!periodControl) return;
    
    let value = periodControl.value?.trim() || '';
    
    // If empty, set to current month
    if (!value) {
      const now = new Date();
      value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      periodControl.setValue(value);
      return;
    }
    
    // Try to parse and format
    // Handle formats like "2024-1", "2024/01", "Jan 2024", etc.
    const patterns = [
      /^(\d{4})-(\d{1,2})$/, // 2024-1 or 2024-01
      /^(\d{4})\/(\d{1,2})$/, // 2024/1 or 2024/01
      /^(\d{4})(\d{2})$/, // 202401
    ];
    
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        const year = match[1];
        const month = String(parseInt(match[2], 10)).padStart(2, '0');
        if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
          const formatted = `${year}-${month}`;
          periodControl.setValue(formatted, { emitEvent: false });
          return;
        }
      }
    }
    
    // If it doesn't match any pattern, validate the current value
    if (!/^\d{4}-\d{2}$/.test(value)) {
      periodControl.setErrors({ pattern: true });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

