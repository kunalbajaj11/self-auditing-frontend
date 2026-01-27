import { Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreditNotesService, CreditNote } from '../../../core/services/credit-notes.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-credit-note-form-dialog',
  templateUrl: './credit-note-form-dialog.component.html',
  styleUrls: ['./credit-note-form-dialog.component.scss'],
})
export class CreditNoteFormDialogComponent implements OnInit, AfterViewInit {
  form: FormGroup;
  loading = false;
  customers: Customer[] = [];
  invoices: SalesInvoice[] = [];
  loadingCustomers = false;
  loadingInvoices = false;
  selectedInvoice: SalesInvoice | null = null;

  readonly creditNoteReasons = [
    { value: 'return', label: 'Return' },
    { value: 'refund', label: 'Refund' },
    { value: 'correction', label: 'Correction' },
    { value: 'discount', label: 'Discount' },
    { value: 'other', label: 'Other' },
  ];

  readonly creditNoteStatuses = ['draft', 'issued', 'cancelled'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  get totalAmount(): number {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const vatAmount = parseFloat(this.form.get('vatAmount')?.value || '0');
    return amount + vatAmount;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CreditNoteFormDialogComponent>,
    private readonly creditNotesService: CreditNotesService,
    private readonly customersService: CustomersService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: CreditNote | null,
  ) {
    this.form = this.fb.group({
      invoiceId: [null],
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      creditNoteDate: [new Date().toISOString().substring(0, 10), Validators.required],
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
      this.loadCreditNoteData();
    }
  }

  ngAfterViewInit(): void {
    // Ensure invoiceId field is not focused/highlighted when dialog opens
    setTimeout(() => {
      const invoiceIdControl = this.form.get('invoiceId');
      if (invoiceIdControl && invoiceIdControl.value === null) {
        // Blur any focused elements to prevent highlighting
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    }, 100);
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

  loadCreditNoteData(): void {
    if (!this.data) return;

    const creditNote = this.data;

    // Resolve customer ID from either flat field or nested relation
    const resolvedCustomerId =
      creditNote.customerId || (creditNote.customer && creditNote.customer.id);

    if (resolvedCustomerId) {
      // Load full customer to ensure latest name/TRN
      this.customersService.getCustomer(resolvedCustomerId).subscribe({
        next: (customer) => {
          this.form.patchValue({
            customerId: customer.id,
            customerName: customer.name,
            customerTrn: customer.customerTrn || '',
          });
        },
        error: () => {
          // Fallback to whatever is already on the credit note
          this.form.patchValue({
            customerName:
              creditNote.customerName ||
              (creditNote.customer && creditNote.customer.name) ||
              '',
            customerTrn:
              creditNote.customerTrn ||
              (creditNote.customer && creditNote.customer.customerTrn) ||
              '',
          });
        },
      });
    } else {
      // No customer id, just use the values on the credit note (if any)
      this.form.patchValue({
        customerName:
          creditNote.customerName ||
          (creditNote.customer && creditNote.customer.name) ||
          '',
        customerTrn:
          creditNote.customerTrn ||
          (creditNote.customer && creditNote.customer.customerTrn) ||
          '',
      });
    }

    // Resolve invoice ID from either flat field or nested relation
    const resolvedInvoiceId =
      creditNote.invoiceId || (creditNote.invoice && creditNote.invoice.id);

    if (resolvedInvoiceId) {
      this.invoicesService.getInvoice(resolvedInvoiceId).subscribe({
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
      creditNoteDate: creditNote.creditNoteDate,
      reason: creditNote.reason,
      amount: parseFloat(creditNote.amount || '0'),
      vatAmount: parseFloat(creditNote.vatAmount || '0'),
      currency: creditNote.currency || 'AED',
      status: creditNote.status,
      description: creditNote.description || '',
      notes: creditNote.notes || '',
    });
  }

  onInvoiceChange(invoiceId: string): void {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      this.selectedInvoice = invoice;
      
      // Parse invoice amounts (they come as strings)
      const invoiceAmount = parseFloat(invoice.amount || '0');
      const invoiceVatAmount = parseFloat(invoice.vatAmount || '0');
      
      // Only populate if creating a new credit note (not editing)
      const isNewCreditNote = !this.data;
      
      this.form.patchValue({
        customerId: invoice.customerId || '',
        customerName: invoice.customerName || '',
        customerTrn: invoice.customerTrn || '',
        currency: invoice.currency || 'AED',
        // Populate amount and VAT if creating new credit note
        ...(isNewCreditNote && {
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
      creditNoteDate: formValue.creditNoteDate,
      reason: formValue.reason,
      amount: parseFloat(formValue.amount),
      vatAmount: parseFloat(formValue.vatAmount || '0'),
      currency: formValue.currency || 'AED',
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
    };

    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const desiredStatus: string = formValue.status || 'draft';

    // Editing existing credit note
    if (this.data) {
      const creditNoteId = this.data.id;
      const originalStatus = this.data.status;
      const statusChanged = originalStatus !== desiredStatus;

      // First update core fields (date, reason, amounts, etc.)
      this.creditNotesService.updateCreditNote(creditNoteId, payload).subscribe({
        next: (updatedNote) => {
          // If status did not change, we're done
          if (!statusChanged) {
            this.loading = false;
            this.dialogRef.close(true);
            return;
          }

          // If status changed, call dedicated status endpoint
          this.creditNotesService
            .updateCreditNoteStatus(creditNoteId, desiredStatus)
            .subscribe({
              next: () => {
                this.loading = false;
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message ||
                    'Credit note updated, but failed to update status',
                  'Close',
                  { duration: 4000, panelClass: ['snack-error'] },
                );
              },
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to save credit note',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
    } else {
      // Creating new credit note: backend always starts as DRAFT,
      // then we optionally update status if user chose a different one.
      this.creditNotesService.createCreditNote(payload).subscribe({
        next: (created) => {
          const creditNoteId = created.id;

          if (!creditNoteId || desiredStatus === 'draft') {
            this.loading = false;
            this.dialogRef.close(true);
            return;
          }

          this.creditNotesService
            .updateCreditNoteStatus(creditNoteId, desiredStatus)
            .subscribe({
              next: () => {
                this.loading = false;
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message ||
                    'Credit note created, but failed to update status',
                  'Close',
                  { duration: 4000, panelClass: ['snack-error'] },
                );
              },
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to save credit note',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

