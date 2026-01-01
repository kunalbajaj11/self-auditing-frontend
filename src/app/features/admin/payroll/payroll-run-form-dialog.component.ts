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
    this.form = this.fb.group({
      payrollPeriod: [data?.payrollPeriod || '', Validators.required],
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
    
    const payload: CreatePayrollRunPayload = {
      payrollPeriod: formValue.payrollPeriod,
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

  cancel(): void {
    this.dialogRef.close(false);
  }
}

