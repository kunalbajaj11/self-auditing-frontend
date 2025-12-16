import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-debit-note-form-dialog',
  templateUrl: './debit-note-form-dialog.component.html',
  styleUrls: ['./debit-note-form-dialog.component.scss'],
})
export class DebitNoteFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  customers: Customer[] = [];
  invoices: SalesInvoice[] = [];
  loadingCustomers = false;
  loadingInvoices = false;
  selectedInvoice: SalesInvoice | null = null;

  readonly debitNoteReasons = [
    { value: 'return', label: 'Return' },
    { value: 'refund', label: 'Refund' },
    { value: 'correction', label: 'Correction' },
    { value: 'discount', label: 'Discount' },
    { value: 'other', label: 'Other' },
  ];

  readonly debitNoteStatuses = ['draft', 'issued', 'cancelled'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  get totalAmount(): number {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const vatAmount = parseFloat(this.form.get('vatAmount')?.value || '0');
    return amount + vatAmount;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DebitNoteFormDialogComponent>,
    private readonly debitNotesService: DebitNotesService,
    private readonly customersService: CustomersService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DebitNote | null,
  ) {
    this.form = this.fb.group({
      invoiceId: [''],
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      debitNoteDate: [new Date().toISOString().substring(0, 10), Validators.required],
      reason: ['return', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      vatAmount: [0, [Validators.min(0)]],
      currency: ['AED'],
      status: ['draft'],
      description: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadInvoices();
    
    if (this.data) {
      this.loadDebitNoteData();
    }
  }

  loadCustomers(): void {
    this.loadingCustomers = true;
    this.customersService.listCustomers(undefined, true).subscribe({
      next: (customers) => {
        this.loadingCustomers = false;
        this.customers = customers;
      },
      error: () => {
        this.loadingCustomers = false;
      },
    });
  }

  loadInvoices(): void {
    this.loadingInvoices = true;
    this.invoicesService.listInvoices().subscribe({
      next: (invoices) => {
        this.loadingInvoices = false;
        this.invoices = invoices;
      },
      error: () => {
        this.loadingInvoices = false;
      },
    });
  }

  loadDebitNoteData(): void {
    if (!this.data) return;

    const debitNote = this.data;

    // Load customer data if customerId exists
    if (debitNote.customerId) {
      this.customersService.getCustomer(debitNote.customerId).subscribe({
        next: (customer) => {
          this.form.patchValue({
            customerId: customer.id,
            customerName: customer.name,
            customerTrn: customer.customerTrn || '',
          });
        },
        error: () => {
          this.form.patchValue({
            customerName: debitNote.customerName || '',
            customerTrn: debitNote.customerTrn || '',
          });
        },
      });
    }

    if (debitNote.invoiceId) {
      this.invoicesService.getInvoice(debitNote.invoiceId).subscribe({
        next: (invoice) => {
          this.selectedInvoice = invoice;
          this.form.patchValue({
            invoiceId: invoice.id,
            customerId: invoice.customerId || '',
            customerName: invoice.customerName || '',
            customerTrn: invoice.customerTrn || '',
            currency: invoice.currency || 'AED',
          });
        },
      });
    }

    this.form.patchValue({
      debitNoteDate: debitNote.debitNoteDate,
      reason: debitNote.reason,
      amount: parseFloat(debitNote.amount || '0'),
      vatAmount: parseFloat(debitNote.vatAmount || '0'),
      currency: debitNote.currency || 'AED',
      status: debitNote.status,
      description: debitNote.description || '',
      notes: debitNote.notes || '',
    });
  }

  onInvoiceChange(invoiceId: string): void {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      this.selectedInvoice = invoice;
      
      // Parse invoice amounts (they come as strings)
      const invoiceAmount = parseFloat(invoice.amount || '0');
      const invoiceVatAmount = parseFloat(invoice.vatAmount || '0');
      
      // Only populate if creating a new debit note (not editing)
      const isNewDebitNote = !this.data;
      
      this.form.patchValue({
        customerId: invoice.customerId || '',
        customerName: invoice.customerName || '',
        customerTrn: invoice.customerTrn || '',
        currency: invoice.currency || 'AED',
        // Populate amount and VAT if creating new debit note
        ...(isNewDebitNote && {
          amount: invoiceAmount > 0 ? invoiceAmount : 0,
          vatAmount: invoiceVatAmount > 0 ? invoiceVatAmount : 0,
          description: invoice.description || '',
        }),
      });
    }
  }

  onCustomerChange(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId);
    if (customer) {
      this.form.patchValue({
        customerName: customer.name,
        customerTrn: customer.customerTrn || '',
        currency: customer.preferredCurrency || 'AED',
      });
    }
  }

  calculateVat(): void {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const currency = this.form.get('currency')?.value || 'AED';
    
    // Default VAT calculation (5% for UAE standard rate)
    // User can override manually
    if (currency === 'AED' && parseFloat(this.form.get('vatAmount')?.value || '0') === 0 && amount > 0) {
      const defaultVat = amount * 0.05;
      this.form.patchValue({
        vatAmount: defaultVat.toFixed(2),
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    const payload: any = {
      invoiceId: formValue.invoiceId || undefined,
      customerId: formValue.customerId || undefined,
      customerName: formValue.customerName || undefined,
      customerTrn: formValue.customerTrn || undefined,
      debitNoteDate: formValue.debitNoteDate,
      reason: formValue.reason,
      amount: parseFloat(formValue.amount),
      vatAmount: parseFloat(formValue.vatAmount || '0'),
      currency: formValue.currency || 'AED',
      status: formValue.status || 'draft',
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
    };

    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const operation = this.data
      ? this.debitNotesService.updateDebitNote(this.data.id, payload)
      : this.debitNotesService.createDebitNote(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to save debit note',
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

