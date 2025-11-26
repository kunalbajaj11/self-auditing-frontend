import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-invoice-payment-dialog',
  templateUrl: './invoice-payment-dialog.component.html',
  styleUrls: ['./invoice-payment-dialog.component.scss'],
})
export class InvoicePaymentDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  invoice: SalesInvoice;
  maxPaymentAmount = 0;
  outstandingAmount = 0;

  readonly paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InvoicePaymentDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { invoice: SalesInvoice },
  ) {
    this.invoice = data.invoice;
    
    const totalAmount = parseFloat(this.invoice.totalAmount || '0');
    const paidAmount = parseFloat(this.invoice.paidAmount || '0');
    this.outstandingAmount = Math.max(0, totalAmount - paidAmount);
    this.maxPaymentAmount = this.outstandingAmount;

    this.form = this.fb.group({
      amount: [this.outstandingAmount, [Validators.required, Validators.min(0.01), Validators.max(this.outstandingAmount)]],
      paymentDate: [new Date().toISOString().substring(0, 10), Validators.required],
      paymentMethod: ['bank_transfer'],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    // Watch for amount changes to validate max
    this.form.get('amount')?.valueChanges.subscribe((value) => {
      const amount = parseFloat(value || '0');
      if (amount > this.outstandingAmount) {
        this.form.get('amount')?.setValue(this.outstandingAmount, { emitEvent: false });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    // Record payment via API
    this.invoicesService.recordPayment(this.invoice.id, {
      amount: parseFloat(formValue.amount),
      paymentDate: formValue.paymentDate,
      paymentMethod: formValue.paymentMethod,
      referenceNumber: formValue.referenceNumber || undefined,
      notes: formValue.notes || undefined,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Payment recorded successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to record payment',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

