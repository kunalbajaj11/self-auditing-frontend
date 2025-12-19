import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { forkJoin } from 'rxjs';

interface InvoiceWithOutstanding extends SalesInvoice {
  outstandingAmount: number;
}

@Component({
  selector: 'app-invoice-payment-dialog',
  templateUrl: './invoice-payment-dialog.component.html',
  styleUrls: ['./invoice-payment-dialog.component.scss'],
})
export class InvoicePaymentDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  invoicesWithOutstanding: InvoiceWithOutstanding[] = [];
  selectedInvoice: InvoiceWithOutstanding | null = null;
  loadingInvoices = true;

  readonly paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank' },
    { value: 'adjustment', label: 'Adjustments' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InvoicePaymentDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data?: { invoice?: SalesInvoice },
  ) {
    this.form = this.fb.group({
      invoiceId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentDate: [new Date().toISOString().substring(0, 10), Validators.required],
      paymentMethod: ['bank_transfer'],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    // If invoice is provided in data, pre-select it
    if (this.data?.invoice) {
      this.loadInvoicesWithOutstanding(this.data.invoice.id);
    } else {
      this.loadInvoicesWithOutstanding();
    }
    
    // Watch for invoice selection changes
    this.form.get('invoiceId')?.valueChanges.subscribe((invoiceId) => {
      this.onInvoiceSelected(invoiceId);
    });
  }

  loadInvoicesWithOutstanding(preSelectInvoiceId?: string): void {
    this.loadingInvoices = true;
    
    // Load invoices list
    const invoicesLoad$ = this.invoicesService.listInvoices({});
    
    // If we have a pre-selected invoice, load it separately to get full details including credit notes
    if (preSelectInvoiceId) {
      forkJoin({
        invoices: invoicesLoad$,
        preSelectedInvoice: this.invoicesService.getInvoice(preSelectInvoiceId),
      }).subscribe({
        next: ({ invoices, preSelectedInvoice }) => {
          this.processInvoices(invoices, preSelectedInvoice, preSelectInvoiceId);
        },
        error: (error) => {
          console.error('Failed to load invoices:', error);
          this.loadingInvoices = false;
          this.snackBar.open('Failed to load invoices', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
    } else {
      invoicesLoad$.subscribe({
        next: (invoices) => {
          this.processInvoices(invoices, null, undefined);
        },
        error: (error) => {
          console.error('Failed to load invoices:', error);
          this.loadingInvoices = false;
          this.snackBar.open('Failed to load invoices', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
    }
  }

  private processInvoices(
    invoices: SalesInvoice[],
    preSelectedInvoice: SalesInvoice | null,
    preSelectInvoiceId?: string,
  ): void {
    // Filter invoices with outstanding balance > 0
    // Note: This calculation doesn't account for credit notes, but backend will validate
    const invoicesWithOutstanding: InvoiceWithOutstanding[] = invoices
      .map(invoice => {
        const totalAmount = parseFloat(invoice.totalAmount || '0');
        const paidAmount = parseFloat(invoice.paidAmount || '0');
        // Calculate outstanding: totalAmount - paidAmount
        // Note: Credit notes are not included here, but backend validates the actual outstanding balance
        const outstanding = Math.max(0, totalAmount - paidAmount);
        
        return {
          ...invoice,
          outstandingAmount: outstanding,
        } as InvoiceWithOutstanding;
      })
      .filter(inv => inv.outstandingAmount > 0.01); // Only include invoices with outstanding balance
    
    // If we have a pre-selected invoice, calculate its outstanding balance correctly
    if (preSelectedInvoice) {
      const totalAmount = parseFloat(preSelectedInvoice.totalAmount || '0');
      const paidAmount = parseFloat(preSelectedInvoice.paidAmount || '0');
      
      // Calculate outstanding including credit notes if available
      let outstanding = Math.max(0, totalAmount - paidAmount);
      if ((preSelectedInvoice as any).creditNoteApplications) {
        const appliedCreditAmount = (preSelectedInvoice as any).creditNoteApplications.reduce(
          (sum: number, app: any) => sum + parseFloat(app.appliedAmount || '0'),
          0,
        );
        outstanding = Math.max(0, totalAmount - paidAmount - appliedCreditAmount);
      }
      
      // Check if it's already in the list
      const existingIndex = invoicesWithOutstanding.findIndex(
        inv => inv.id === preSelectedInvoice.id
      );
      
      if (outstanding > 0.01) {
        const invoiceWithOutstanding: InvoiceWithOutstanding = {
          ...preSelectedInvoice,
          outstandingAmount: outstanding,
        };
        
        if (existingIndex >= 0) {
          // Update existing entry with correct outstanding balance
          invoicesWithOutstanding[existingIndex] = invoiceWithOutstanding;
        } else {
          // Add to list if not already present
          invoicesWithOutstanding.unshift(invoiceWithOutstanding);
        }
      } else if (existingIndex >= 0) {
        // Remove if outstanding balance is 0 or less
        invoicesWithOutstanding.splice(existingIndex, 1);
      }
    }
    
    this.invoicesWithOutstanding = invoicesWithOutstanding;
    this.loadingInvoices = false;

    // Pre-select invoice if provided
    if (preSelectInvoiceId) {
      const invoiceToSelect = this.invoicesWithOutstanding.find(
        inv => inv.id === preSelectInvoiceId
      );
      if (invoiceToSelect) {
        this.form.get('invoiceId')?.setValue(preSelectInvoiceId, { emitEvent: false });
        this.onInvoiceSelected(preSelectInvoiceId);
      } else {
        // If invoice has no outstanding balance, show a message
        this.snackBar.open('This invoice has no outstanding balance', 'Close', {
          duration: 3000,
          panelClass: ['snack-warn'],
        });
      }
    }
  }

  onInvoiceSelected(invoiceId: string): void {
    if (!invoiceId) {
      this.selectedInvoice = null;
      this.resetAmountField();
      return;
    }

    const invoice = this.invoicesWithOutstanding.find((inv) => inv.id === invoiceId);
    if (invoice) {
      this.selectedInvoice = invoice;
      
      // Auto-fill payment amount with outstanding balance
      const amount = Math.round(invoice.outstandingAmount * 100) / 100;
      this.form.get('amount')?.setValue(amount, { emitEvent: false });
      
      // Update validators
      this.form.get('amount')?.setValidators([
        Validators.required,
        Validators.min(0.01),
        this.maxAmountValidator(invoice.outstandingAmount),
      ]);
      this.form.get('amount')?.updateValueAndValidity();
    } else {
      this.selectedInvoice = null;
      this.resetAmountField();
    }
  }

  resetAmountField(): void {
    this.form.get('amount')?.setValue(0, { emitEvent: false });
    this.form.get('amount')?.setValidators([
      Validators.required,
      Validators.min(0.01),
    ]);
    this.form.get('amount')?.updateValueAndValidity();
  }

  clearInvoiceSelection(): void {
    this.form.get('invoiceId')?.setValue('', { emitEvent: false });
    this.selectedInvoice = null;
    this.resetAmountField();
  }

  save(): void {
    this.form.markAllAsTouched();
    
    if (this.form.invalid) {
      this.snackBar.open('Please fix the form errors before submitting', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    if (!this.selectedInvoice) {
      this.snackBar.open('Please select an invoice', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();
    const amount = parseFloat(formValue.amount);
    
    if (isNaN(amount) || amount <= 0) {
      this.loading = false;
      this.snackBar.open('Please enter a valid payment amount', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    // Record payment via API
    this.invoicesService.recordPayment(this.selectedInvoice.id, {
      amount: amount,
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
        console.error('Error recording payment:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to record payment';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  // Custom validator to handle floating point precision
  private maxAmountValidator(maxAmount: number) {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      const value = parseFloat(control.value);
      if (isNaN(value)) {
        return null;
      }
      // Use a small tolerance (0.01) for floating point comparison
      if (value > maxAmount + 0.01) {
        return { max: { max: maxAmount, actual: value } };
      }
      return null;
    };
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

