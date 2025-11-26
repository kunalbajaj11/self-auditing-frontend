import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice, InvoiceLineItem } from '../../../core/services/sales-invoices.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';

@Component({
  selector: 'app-invoice-form-dialog',
  templateUrl: './invoice-form-dialog.component.html',
  styleUrls: ['./invoice-form-dialog.component.scss'],
})
export class InvoiceFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  customers: Customer[] = [];
  loadingCustomers = false;

  readonly vatTaxTypes = ['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE'];
  readonly invoiceStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  get subtotal(): number {
    return this.lineItems.controls.reduce((sum, control) => {
      const amount = parseFloat(control.get('amount')?.value || '0');
      return sum + amount;
    }, 0);
  }

  get totalVat(): number {
    return this.lineItems.controls.reduce((sum, control) => {
      const vatAmount = parseFloat(control.get('vatAmount')?.value || '0');
      return sum + vatAmount;
    }, 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.totalVat;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InvoiceFormDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly customersService: CustomersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: SalesInvoice | null,
  ) {
    this.form = this.fb.group({
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      invoiceDate: [new Date().toISOString().substring(0, 10), Validators.required],
      dueDate: [''],
      currency: ['AED'],
      status: ['draft'],
      description: [''],
      notes: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    if (this.data) {
      this.loadInvoiceData();
    } else {
      // Add one empty line item for new invoice
      this.addLineItem();
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

  loadInvoiceData(): void {
    if (!this.data) return;

    const invoice = this.data;
    
    // Load customer data if customerId exists
    if (invoice.customerId) {
      this.customersService.getCustomer(invoice.customerId).subscribe({
        next: (customer) => {
          this.form.patchValue({
            customerId: customer.id,
            customerName: customer.name,
            customerTrn: customer.customerTrn || '',
          });
        },
        error: () => {
          // Fallback to invoice data
          this.form.patchValue({
            customerName: invoice.customerName || '',
            customerTrn: invoice.customerTrn || '',
          });
        },
      });
    }

    this.form.patchValue({
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate || '',
      currency: invoice.currency || 'AED',
      status: invoice.status,
      description: invoice.description || '',
      notes: invoice.notes || '',
    });

    // Load line items
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      invoice.lineItems.forEach((item) => {
        this.addLineItem(item);
      });
    } else {
      // Legacy: create line item from amount/vatAmount
      if (parseFloat(invoice.amount || '0') > 0) {
        this.addLineItem({
          itemName: invoice.description || 'Invoice Item',
          quantity: 1,
          unitPrice: parseFloat(invoice.amount),
          vatRate: parseFloat(invoice.vatAmount || '0') > 0 ? 5 : 0,
          vatTaxType: 'STANDARD',
          amount: parseFloat(invoice.amount),
          vatAmount: parseFloat(invoice.vatAmount || '0'),
          totalAmount: parseFloat(invoice.totalAmount || invoice.amount),
        });
      }
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

      // Auto-set due date based on payment terms
      if (customer.paymentTerms) {
        const invoiceDate = new Date(this.form.get('invoiceDate')?.value || new Date());
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + customer.paymentTerms);
        this.form.patchValue({
          dueDate: dueDate.toISOString().substring(0, 10),
        });
      }
    }
  }

  addLineItem(item?: Partial<InvoiceLineItem>): void {
    const lineItemGroup = this.fb.group({
      productId: [item?.productId || ''],
      itemName: [item?.itemName || '', Validators.required],
      description: [item?.description || ''],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.001)]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      unitOfMeasure: [item?.unitOfMeasure || 'unit'],
      vatRate: [item?.vatRate || 5, [Validators.min(0), Validators.max(100)]],
      vatTaxType: [item?.vatTaxType || 'STANDARD'],
      amount: [{ value: item?.amount || (item?.quantity || 1) * (item?.unitPrice || 0), disabled: true }],
      vatAmount: [{ value: item?.vatAmount || 0, disabled: true }],
      totalAmount: [{ value: item?.totalAmount || 0, disabled: true }],
    });

    // Auto-calculate when quantity, unitPrice, vatRate, or vatTaxType changes
    lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatTaxType')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));

    // Initial calculation
    this.calculateLineItem(lineItemGroup);

    this.lineItems.push(lineItemGroup);
  }

  removeLineItem(index: number): void {
    this.lineItems.removeAt(index);
  }

  calculateLineItem(lineItemGroup: FormGroup): void {
    const quantity = parseFloat(lineItemGroup.get('quantity')?.value || '0');
    const unitPrice = parseFloat(lineItemGroup.get('unitPrice')?.value || '0');
    const vatRate = parseFloat(lineItemGroup.get('vatRate')?.value || '0');
    const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'STANDARD';

    const amount = quantity * unitPrice;
    
    // Calculate VAT based on tax type
    let vatAmount = 0;
    if (vatTaxType === 'STANDARD' && vatRate > 0) {
      vatAmount = amount * (vatRate / 100);
    } else if (vatTaxType === 'REVERSE_CHARGE' && vatRate > 0) {
      vatAmount = amount * (vatRate / 100); // For reverse charge, VAT is still calculated but handled differently
    }
    // ZERO_RATED and EXEMPT have vatAmount = 0

    const totalAmount = amount + vatAmount;

    lineItemGroup.patchValue({
      amount: amount.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    }, { emitEvent: false });
  }

  save(): void {
    if (this.form.invalid || this.lineItems.length === 0) {
      this.form.markAllAsTouched();
      if (this.lineItems.length === 0) {
        this.snackBar.open('Please add at least one line item', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      }
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    // Prepare line items
    const lineItems = this.lineItems.controls.map((control) => {
      const value = control.getRawValue();
      return {
        itemName: value.itemName,
        description: value.description || undefined,
        quantity: parseFloat(value.quantity),
        unitPrice: parseFloat(value.unitPrice),
        unitOfMeasure: value.unitOfMeasure || 'unit',
        vatRate: parseFloat(value.vatRate || '5'),
        vatTaxType: value.vatTaxType || 'STANDARD',
        amount: parseFloat(value.amount),
        vatAmount: parseFloat(value.vatAmount),
        productId: value.productId || undefined,
        accountId: value.accountId || undefined,
      };
    });

    const payload: any = {
      customerId: formValue.customerId || undefined,
      customerName: formValue.customerName || undefined,
      customerTrn: formValue.customerTrn || undefined,
      invoiceDate: formValue.invoiceDate,
      dueDate: formValue.dueDate || undefined,
      currency: formValue.currency || 'AED',
      status: formValue.status || 'draft',
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
      lineItems: lineItems,
    };

    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const operation = this.data
      ? this.invoicesService.updateInvoice(this.data.id, payload)
      : this.invoicesService.createInvoice(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to save invoice',
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

