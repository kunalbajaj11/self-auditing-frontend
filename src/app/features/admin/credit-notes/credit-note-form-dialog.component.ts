import { Component, Inject, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreditNotesService, CreditNote, CreditNoteLineItem } from '../../../core/services/credit-notes.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { SalesInvoicesService, SalesInvoice, InvoiceLineItem } from '../../../core/services/sales-invoices.service';
import { SUPPORTED_ORG_CURRENCIES } from '../../../core/constants/supported-currencies';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

@Component({
  selector: 'app-credit-note-form-dialog',
  templateUrl: './credit-note-form-dialog.component.html',
  styleUrls: ['./credit-note-form-dialog.component.scss'],
})
export class CreditNoteFormDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly orgContext = inject(OrganizationContextService);

  form: FormGroup;
  loading = false;
  customers: Customer[] = [];
  invoices: SalesInvoice[] = [];
  loadingCustomers = false;
  loadingInvoices = false;
  selectedInvoice: SalesInvoice | null = null;
  private amountSubscription: any;

  readonly creditNoteReasons = [
    { value: 'return', label: 'Return' },
    { value: 'refund', label: 'Refund' },
    { value: 'correction', label: 'Correction' },
    { value: 'discount', label: 'Discount' },
    { value: 'other', label: 'Other' },
  ];

  readonly creditNoteStatuses = ['draft', 'issued', 'cancelled'];
  /** Status options for create: draft or issue. Edit shows all including cancelled. */
  get statusOptions(): string[] {
    return this.data ? this.creditNoteStatuses : ['draft', 'issued'];
  }
  readonly currencies = [...SUPPORTED_ORG_CURRENCIES];
  defaultVatRate = 5;

  get lineItems(): FormArray {
    return this.form.get('lineItems')! as FormArray;
  }

  get totalAmount(): number {
    if (this.lineItems?.length > 0) {
      const sub = this.lineItems.controls.reduce((sum, c) => sum + parseFloat(c.get('amount')?.value || '0'), 0);
      const vat = this.lineItems.controls.reduce((sum, c) => sum + parseFloat(c.get('vatAmount')?.value || '0'), 0);
      return sub + vat;
    }
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const vatAmount = parseFloat(this.form.get('vatAmount')?.value || '0');
    return amount + vatAmount;
  }

  get useLineItems(): boolean {
    return this.lineItems?.length > 0;
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
      invoiceId: [null, Validators.required],
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      creditNoteDate: [new Date().toISOString().substring(0, 10), Validators.required],
      reason: ['return', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      vatAmount: [0, [Validators.min(0)]],
      currency: [this.orgContext.currency()],
      status: ['draft'],
      description: [''],
      notes: [''],
      lineItems: this.fb.array([]),
      applyToInvoiceNow: [false],
      applyToInvoiceId: [null as string | null],
      applyAmount: [0, [Validators.min(0)]],
    });
  }

  /** True when status is issued (create or edit) so we show "Apply to invoice" option. */
  get showApplyToInvoiceOption(): boolean {
    return (this.form.get('status')?.value || 'draft') === 'issued';
  }

  /** Max amount that can be applied (min of credit note total and selected invoice outstanding). */
  get maxApplyAmount(): number {
    const total = this.totalAmount;
    const invId = this.form.get('applyToInvoiceId')?.value;
    if (!invId) return total;
    const inv = this.invoices.find((i) => i.id === invId);
    if (!inv) return total;
    const outstanding = this.getInvoiceOutstanding(inv);
    return Math.min(total, outstanding);
  }

  getInvoiceOutstanding(invoice: SalesInvoice): number {
    const total = parseFloat(invoice.totalAmount || '0');
    const paid = parseFloat(invoice.paidAmount || '0');
    return Math.max(0, total - paid);
  }

  private createLineItemGroup(li: Partial<CreditNoteLineItem> = {}): FormGroup {
    const qty = parseFloat(String(li.quantity ?? 1));
    const unitPrice = parseFloat(String(li.unitPrice ?? 0));
    const vatRate = parseFloat(String(li.vatRate ?? this.defaultVatRate));
    const amount = li.amount != null ? parseFloat(String(li.amount)) : qty * unitPrice;
    const vatAmount = li.vatAmount != null ? parseFloat(String(li.vatAmount)) : amount * (vatRate / 100);
    return this.fb.group({
      itemName: [li.itemName ?? '', Validators.required],
      quantity: [qty, [Validators.required, Validators.min(0.001)]],
      unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
      vatRate: [vatRate, [Validators.min(0)]],
      amount: [amount],
      vatAmount: [vatAmount],
    });
  }

  addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup({ itemName: '', quantity: 1, unitPrice: 0 }));
  }

  removeLineItem(index: number): void {
    this.lineItems.removeAt(index);
    this.syncAmountAndVatFromLines();
  }

  onLineItemChange(index: number): void {
    const g = this.lineItems.at(index);
    const qty = parseFloat(g.get('quantity')?.value || '0');
    const unitPrice = parseFloat(g.get('unitPrice')?.value || '0');
    const vatRate = parseFloat(g.get('vatRate')?.value || String(this.defaultVatRate));
    const amount = qty * unitPrice;
    const vatAmount = amount * (vatRate / 100);
    g.patchValue({ amount, vatAmount }, { emitEvent: false });
    this.syncAmountAndVatFromLines();
  }

  syncAmountAndVatFromLines(): void {
    if (this.lineItems.length === 0) return;
    const amount = this.lineItems.controls.reduce((sum, c) => sum + parseFloat(c.get('amount')?.value || '0'), 0);
    const vatAmount = this.lineItems.controls.reduce((sum, c) => sum + parseFloat(c.get('vatAmount')?.value || '0'), 0);
    this.form.patchValue({ amount, vatAmount }, { emitEvent: false });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadInvoices();
    if (this.data) {
      this.loadCreditNoteData();
    } else {
      // When creating, auto-recalculate VAT when amount changes (e.g. 5% of 2500 = 125)
      this.amountSubscription = this.form.get('amount')?.valueChanges?.subscribe(() => {
        this.calculateVat();
      });
    }
    // When status becomes "issued", default apply-to-invoice to related invoice and suggested amount
    this.form.get('status')?.valueChanges?.subscribe((status) => {
      if (status === 'issued') {
        const invoiceId = this.form.get('invoiceId')?.value;
        if (invoiceId) {
          this.form.patchValue(
            { applyToInvoiceId: invoiceId },
            { emitEvent: false },
          );
          this.updateDefaultApplyAmount();
        }
      } else {
        this.form.patchValue(
          { applyToInvoiceNow: false, applyToInvoiceId: null, applyAmount: 0 },
          { emitEvent: false },
        );
      }
    });
    this.form.get('applyToInvoiceId')?.valueChanges?.subscribe(() => this.updateDefaultApplyAmount());
    this.form.get('invoiceId')?.valueChanges?.subscribe(() => {
      if (this.form.get('status')?.value === 'issued') {
        const invoiceId = this.form.get('invoiceId')?.value;
        this.form.patchValue({ applyToInvoiceId: invoiceId }, { emitEvent: false });
        this.updateDefaultApplyAmount();
      }
    });
  }

  private updateDefaultApplyAmount(): void {
    const total = this.totalAmount;
    const invId = this.form.get('applyToInvoiceId')?.value;
    if (!invId) return;
    const inv = this.invoices.find((i) => i.id === invId);
    if (!inv) return;
    const maxApply = Math.min(total, this.getInvoiceOutstanding(inv));
    const current = parseFloat(this.form.get('applyAmount')?.value || '0');
    const suggested = Number.isFinite(current) && current > 0 ? Math.min(current, maxApply) : maxApply;
    this.form.patchValue({ applyAmount: suggested }, { emitEvent: false });
  }

  ngOnDestroy(): void {
    this.amountSubscription?.unsubscribe();
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

  /** Tax invoice statuses only (exclude proforma and quotation). */
  private readonly taxInvoiceStatuses = [
    'tax_invoice_receivable',
    'tax_invoice_bank_received',
    'tax_invoice_cash_received',
  ];

  loadInvoices(): void {
    this.loadingInvoices = true;
    this.invoicesService.listInvoices().subscribe({
      next: (invoices) => {
        this.loadingInvoices = false;
        // Only show tax invoices in dropdown (exclude proforma and quotation)
        this.invoices = (invoices || []).filter((inv) =>
          this.taxInvoiceStatuses.includes((inv.status || '').toLowerCase()),
        );
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
          const total = parseFloat(creditNote.totalAmount || '0');
          const outstanding = this.getInvoiceOutstanding(invoice);
          const suggestedApply = creditNote.status === 'issued' ? Math.min(total, outstanding) : 0;
          this.form.patchValue({
            invoiceId: invoice.id,
            customerId: invoice.customerId || '',
            customerName: invoice.customerName || '',
            customerTrn: invoice.customerTrn || '',
            currency: invoice.currency || this.orgContext.currency(),
            applyToInvoiceId: creditNote.status === 'issued' ? invoice.id : null,
            applyAmount: suggestedApply,
          });
        },
      });
    }

    const resolvedInvId = creditNote.invoiceId || creditNote.invoice?.id;
    this.form.patchValue({
      creditNoteDate: creditNote.creditNoteDate,
      reason: creditNote.reason,
      amount: parseFloat(creditNote.amount || '0'),
      vatAmount: parseFloat(creditNote.vatAmount || '0'),
      currency: creditNote.currency || this.orgContext.currency(),
      status: creditNote.status,
      description: creditNote.description || '',
      notes: creditNote.notes || '',
      applyToInvoiceId: resolvedInvId || null,
    });
    if (creditNote.lineItems && creditNote.lineItems.length > 0) {
      this.lineItems.clear();
      creditNote.lineItems.forEach((li: CreditNoteLineItem) => {
        this.lineItems.push(this.createLineItemGroup(li));
      });
      this.syncAmountAndVatFromLines();
    }
  }

  onInvoiceChange(invoiceId: string): void {
    const invoice = this.invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    this.selectedInvoice = invoice;
    const isNewCreditNote = !this.data;
    this.form.patchValue({
      customerId: invoice.customerId || '',
      customerName: invoice.customerName || '',
      customerTrn: invoice.customerTrn || '',
      currency: invoice.currency || this.orgContext.currency(),
    });
    if (!isNewCreditNote) return;
    // Load full invoice to get line items (product name, rate) for credit note
    this.invoicesService.getInvoice(invoice.id).subscribe({
      next: (fullInvoice) => {
        if (fullInvoice.lineItems && fullInvoice.lineItems.length > 0) {
          this.lineItems.clear();
          fullInvoice.lineItems.forEach((li: InvoiceLineItem, idx: number) => {
            this.lineItems.push(
              this.createLineItemGroup({
                itemName: li.itemName,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                vatRate: li.vatRate ?? this.defaultVatRate,
                amount: li.amount,
                vatAmount: li.vatAmount,
                lineNumber: idx + 1,
              }),
            );
          });
          this.syncAmountAndVatFromLines();
        } else {
          this.lineItems.clear();
          const invoiceAmount = parseFloat(fullInvoice.amount || '0');
          const calculatedVat = invoiceAmount > 0 ? invoiceAmount * (this.getDefaultVatRate() / 100) : 0;
          this.form.patchValue({
            amount: invoiceAmount > 0 ? invoiceAmount : 0,
            vatAmount: calculatedVat,
            description: fullInvoice.description || '',
          });
        }
      },
      error: () => {
        const invoiceAmount = parseFloat(invoice.amount || '0');
        const calculatedVat = invoiceAmount > 0 ? invoiceAmount * (this.getDefaultVatRate() / 100) : 0;
        this.form.patchValue({
          amount: invoiceAmount > 0 ? invoiceAmount : 0,
          vatAmount: calculatedVat,
          description: invoice.description || '',
        });
      },
    });
  }

  /** Default VAT rate (e.g. UAE 5%). Used to recalc VAT from credit note amount. */
  private getDefaultVatRate(): number {
    return 5;
  }

  onCustomerChange(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId);
    if (customer) {
      this.form.patchValue({
        customerName: customer.name,
        customerTrn: customer.customerTrn || '',
        currency: customer.preferredCurrency || this.orgContext.currency(),
      });
    }
  }

  /** Recalculate VAT from amount using default rate (e.g. 5%). Call when amount changes or user clicks calculate. */
  calculateVat(): void {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    if (amount <= 0) return;
    const rate = this.getDefaultVatRate();
    const vat = amount * (rate / 100);
    this.form.patchValue({ vatAmount: Number(vat.toFixed(2)) });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    if (
      formValue.applyToInvoiceNow &&
      (!formValue.applyToInvoiceId || !Number(formValue.applyAmount) || Number(formValue.applyAmount) <= 0)
    ) {
      this.snackBar.open(
        'Please select an invoice and enter an amount to apply when applying to invoice.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      this.form.get('applyToInvoiceId')?.markAsTouched();
      this.form.get('applyAmount')?.markAsTouched();
      return;
    }
    if (
      formValue.applyToInvoiceNow &&
      Number(formValue.applyAmount) > this.maxApplyAmount
    ) {
      this.snackBar.open(
        `Apply amount cannot exceed ${this.maxApplyAmount.toFixed(2)} (credit note total or invoice outstanding).`,
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }

    this.loading = true;
    const lines = formValue.lineItems || [];
    const hasLineItems = Array.isArray(lines) && lines.length > 0;

    const payload: any = {
      invoiceId: formValue.invoiceId || undefined,
      customerId: formValue.customerId || undefined,
      customerName: formValue.customerName || undefined,
      customerTrn: formValue.customerTrn || undefined,
      creditNoteDate: formValue.creditNoteDate,
      reason: formValue.reason,
      amount: hasLineItems
        ? lines.reduce((s: number, li: any) => s + parseFloat(li.amount || '0'), 0)
        : parseFloat(formValue.amount),
      vatAmount: hasLineItems
        ? lines.reduce((s: number, li: any) => s + parseFloat(li.vatAmount || '0'), 0)
        : parseFloat(formValue.vatAmount || '0'),
      currency: formValue.currency || this.orgContext.currency(),
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
    };
    if (hasLineItems) {
      payload.lineItems = lines.map((li: any, idx: number) => ({
        itemName: li.itemName,
        quantity: parseFloat(li.quantity),
        unitPrice: parseFloat(li.unitPrice),
        vatRate: parseFloat(li.vatRate ?? this.defaultVatRate),
        amount: parseFloat(li.amount),
        vatAmount: parseFloat(li.vatAmount || '0'),
        lineNumber: idx + 1,
      }));
    }

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
                if (
                  desiredStatus === 'issued' &&
                  formValue.applyToInvoiceNow &&
                  formValue.applyToInvoiceId &&
                  Number(formValue.applyAmount) > 0
                ) {
                  this.creditNotesService
                    .applyCreditNote(
                      creditNoteId,
                      formValue.applyToInvoiceId,
                      parseFloat(formValue.applyAmount),
                    )
                    .subscribe({
                      next: () => {
                        this.loading = false;
                        this.dialogRef.close(true);
                        this.snackBar.open(
                          'Credit note issued and applied to invoice',
                          'Close',
                          { duration: 3000 },
                        );
                      },
                      error: (err) => {
                        this.loading = false;
                        this.snackBar.open(
                          err?.error?.message || 'Issued but failed to apply to invoice',
                          'Close',
                          { duration: 4000, panelClass: ['snack-error'] },
                        );
                      },
                    });
                } else {
                  this.loading = false;
                  this.dialogRef.close(true);
                }
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
                if (
                  desiredStatus === 'issued' &&
                  formValue.applyToInvoiceNow &&
                  formValue.applyToInvoiceId &&
                  Number(formValue.applyAmount) > 0
                ) {
                  this.creditNotesService
                    .applyCreditNote(
                      creditNoteId,
                      formValue.applyToInvoiceId,
                      parseFloat(formValue.applyAmount),
                    )
                    .subscribe({
                      next: () => {
                        this.loading = false;
                        this.dialogRef.close(true);
                        this.snackBar.open(
                          'Credit note created, issued and applied to invoice',
                          'Close',
                          { duration: 3000 },
                        );
                      },
                      error: (err) => {
                        this.loading = false;
                        this.snackBar.open(
                          err?.error?.message || 'Created and issued, but failed to apply to invoice',
                          'Close',
                          { duration: 4000, panelClass: ['snack-error'] },
                        );
                      },
                    });
                } else {
                  this.loading = false;
                  this.dialogRef.close(true);
                }
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

