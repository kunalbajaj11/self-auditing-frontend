import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice, InvoiceLineItem } from '../../../core/services/sales-invoices.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { SettingsService, TaxRate } from '../../../core/services/settings.service';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-proforma-invoice-form-dialog',
  templateUrl: './proforma-invoice-form-dialog.component.html',
  styleUrls: ['./proforma-invoice-form-dialog.component.scss'],
})
export class ProformaInvoiceFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  customers: Customer[] = [];
  loadingCustomers = false;
  taxRates: TaxRate[] = [];
  defaultTaxRate = 5; // Fallback default

  readonly vatTaxTypes = ['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  // Item suggestions autocomplete
  itemSuggestionsMap = new Map<number, Observable<Array<{
    itemName: string;
    description?: string;
    unitPrice: number;
    vatRate: number;
    vatTaxType: string;
    unitOfMeasure?: string;
    usageCount: number;
  }>>>();
  activeItemIndex: number | null = null;
  filteredItems$: Observable<Array<{
    itemName: string;
    description?: string;
    unitPrice: number;
    vatRate: number;
    vatTaxType: string;
    unitOfMeasure?: string;
    usageCount: number;
  }>> = of([]);

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
    private readonly dialogRef: MatDialogRef<ProformaInvoiceFormDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: SalesInvoice | null,
  ) {
    this.form = this.fb.group({
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      invoiceDate: [new Date().toISOString().substring(0, 10), Validators.required],
      supplyDate: [''],
      dueDate: [''],
      discountAmount: [0],
      currency: ['AED'],
      status: ['proforma_invoice'], // Always proforma_invoice for this component
      description: [''],
      notes: [''],
      deliveryNote: [''],
      suppliersRef: [''],
      otherReference: [''],
      buyerOrderNo: [''],
      buyerOrderDate: [''],
      despatchedThrough: [''],
      destination: [''],
      termsOfDelivery: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadTaxSettings();
    if (this.data) {
      this.loadInvoiceData();
    } else {
      // Add one empty line item for new proforma invoice
      this.addLineItem();
    }
    // Initialize filteredItems$ with empty suggestions
    this.filteredItems$ = this.invoicesService.getItemSuggestions();
  }

  loadTaxSettings(): void {
    // Load tax settings for default rate
    this.settingsService.getTaxSettings().subscribe({
      next: (settings) => {
        this.defaultTaxRate = settings.taxDefaultRate || 5;
      },
      error: () => {
        // Use fallback if settings fail to load
        this.defaultTaxRate = 5;
      },
    });

    // Load tax rates for selection
    this.settingsService.getTaxRates().subscribe({
      next: (rates) => {
        this.taxRates = rates.filter((rate) => rate.isActive);
      },
      error: () => {
        this.taxRates = [];
      },
    });
  }

  getTaxRateForType(taxType: string): number {
    const matchingRate = this.taxRates.find(
      (rate) => rate.type.toLowerCase() === taxType.toLowerCase(),
    );
    return matchingRate ? matchingRate.rate : this.defaultTaxRate;
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
    
    // Resolve customerId from either flat field or nested relation
    const customerId = invoice.customerId || invoice.customer?.id;
    if (customerId) {
      this.customersService.getCustomer(customerId).subscribe({
        next: (customer) => {
          this.form.patchValue({
            customerId: customer.id,
            customerName: customer.name,
            customerTrn: customer.customerTrn || '',
          });
        },
        error: () => {
          // Fallback to invoice data (from nested customer or flat fields)
          this.form.patchValue({
            customerId: customerId,
            customerName: invoice.customerName || invoice.customer?.name || '',
            customerTrn: invoice.customerTrn || invoice.customer?.customerTrn || '',
          });
        },
      });
    } else {
      // No customerId, but might have customer name/TRN from flat fields
      this.form.patchValue({
        customerName: invoice.customerName || '',
        customerTrn: invoice.customerTrn || '',
      });
    }

    this.form.patchValue({
      invoiceDate: invoice.invoiceDate,
      supplyDate: (invoice as any).supplyDate || '',
      dueDate: invoice.dueDate || '',
      discountAmount: parseFloat((invoice as any).discountAmount || '0'),
      currency: invoice.currency || 'AED',
      status: 'proforma_invoice', // Always set to proforma_invoice
      description: invoice.description || '',
      notes: invoice.notes || '',
      deliveryNote: (invoice as any).deliveryNote || '',
      suppliersRef: (invoice as any).suppliersRef || '',
      otherReference: (invoice as any).otherReference || '',
      buyerOrderNo: (invoice as any).buyerOrderNo || '',
      buyerOrderDate: (invoice as any).buyerOrderDate || '',
      despatchedThrough: (invoice as any).despatchedThrough || '',
      destination: (invoice as any).destination || '',
      termsOfDelivery: (invoice as any).termsOfDelivery || '',
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
          itemName: invoice.description || 'Proforma Invoice Item',
          quantity: 1,
          unitPrice: parseFloat(invoice.amount),
          vatRate: parseFloat(invoice.vatAmount || '0') > 0 ? this.defaultTaxRate : 0,
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
      vatRate: [item?.vatRate || this.defaultTaxRate, [Validators.min(0), Validators.max(100)]],
      vatTaxType: [item?.vatTaxType || 'STANDARD'],
      amount: [{ value: item?.amount || (item?.quantity || 1) * (item?.unitPrice || 0), disabled: true }],
      vatAmount: [{ value: item?.vatAmount || 0, disabled: true }],
      totalAmount: [{ value: item?.totalAmount || 0, disabled: true }],
    });

    // Auto-calculate when quantity, unitPrice, vatRate, or vatTaxType changes
    lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatTaxType')?.valueChanges.subscribe((taxType) => {
      // Auto-set VAT rate based on tax type if rate is default
      const vatRateValue = lineItemGroup.get('vatRate')?.value;
      const currentRate = typeof vatRateValue === 'number' ? vatRateValue : parseFloat(String(vatRateValue || '0'));
      if (currentRate === this.defaultTaxRate || currentRate === 0) {
        const rateForType = this.getTaxRateForType(taxType || 'STANDARD');
        lineItemGroup.patchValue({ vatRate: rateForType }, { emitEvent: false });
      }
      this.calculateLineItem(lineItemGroup);
    });

    // Initial calculation
    this.calculateLineItem(lineItemGroup);

    const index = this.lineItems.length;
    this.lineItems.push(lineItemGroup);

    // Setup autocomplete for item name
    this.setupItemNameAutocomplete(index, lineItemGroup);
  }

  setupItemNameAutocomplete(index: number, lineItemGroup: FormGroup): void {
    const itemNameControl = lineItemGroup.get('itemName');
    if (!itemNameControl) return;

    const filteredItems$ = itemNameControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = (searchTerm || '').trim();
        if (search.length < 1) {
          // Show top suggestions when empty
          return this.invoicesService.getItemSuggestions();
        }
        return this.invoicesService.getItemSuggestions(search);
      }),
      map((suggestions) => suggestions.slice(0, 10)), // Limit to 10 suggestions
    );

    this.itemSuggestionsMap.set(index, filteredItems$);
  }

  onItemNameFocus(index: number): void {
    this.activeItemIndex = index;
    const lineItemGroup = this.lineItems.at(index) as FormGroup;
    if (lineItemGroup) {
      const itemNameControl = lineItemGroup.get('itemName');
      if (itemNameControl) {
        this.filteredItems$ = itemNameControl.valueChanges.pipe(
          startWith(itemNameControl.value || ''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((searchTerm: string | null) => {
            const search = (searchTerm || '').trim();
            if (search.length < 1) {
              return this.invoicesService.getItemSuggestions();
            }
            return this.invoicesService.getItemSuggestions(search);
          }),
          map((suggestions) => suggestions.slice(0, 10)),
        );
      }
    }
  }

  getItemSuggestions(index: number): Observable<Array<{
    itemName: string;
    description?: string;
    unitPrice: number;
    vatRate: number;
    vatTaxType: string;
    unitOfMeasure?: string;
    usageCount: number;
  }>> {
    return this.itemSuggestionsMap.get(index) || of([]);
  }

  onItemSelected(index: number, selectedItem: {
    itemName: string;
    description?: string;
    unitPrice: number;
    vatRate: number;
    vatTaxType: string;
    unitOfMeasure?: string;
  }): void {
    const lineItemGroup = this.lineItems.at(index) as FormGroup;
    if (!lineItemGroup) return;

    // Auto-fill fields from selected suggestion
    lineItemGroup.patchValue({
      itemName: selectedItem.itemName,
      description: selectedItem.description || lineItemGroup.get('description')?.value || '',
      unitPrice: selectedItem.unitPrice || lineItemGroup.get('unitPrice')?.value || 0,
      vatRate: selectedItem.vatRate || this.defaultTaxRate,
      vatTaxType: selectedItem.vatTaxType || 'STANDARD',
      unitOfMeasure: selectedItem.unitOfMeasure || lineItemGroup.get('unitOfMeasure')?.value || 'unit',
    }, { emitEvent: true }); // Emit events to trigger calculations

    // Recalculate line item
    this.calculateLineItem(lineItemGroup);
  }

  displayItemName(item: { itemName: string } | string | null): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.itemName || '';
  }

  removeLineItem(index: number): void {
    this.itemSuggestionsMap.delete(index);
    this.lineItems.removeAt(index);
    // Re-index remaining items
    this.itemSuggestionsMap.clear();
    this.lineItems.controls.forEach((control, idx) => {
      this.setupItemNameAutocomplete(idx, control as FormGroup);
    });
  }

  calculateLineItem(lineItemGroup: FormGroup): void {
    const quantityValue = lineItemGroup.get('quantity')?.value;
    const unitPriceValue = lineItemGroup.get('unitPrice')?.value;
    const vatRateValue = lineItemGroup.get('vatRate')?.value;
    const quantity = typeof quantityValue === 'number' ? quantityValue : parseFloat(String(quantityValue || '0'));
    const unitPrice = typeof unitPriceValue === 'number' ? unitPriceValue : parseFloat(String(unitPriceValue || '0'));
    const vatRate = typeof vatRateValue === 'number' ? vatRateValue : parseFloat(String(vatRateValue || '0'));
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
        vatRate: parseFloat(value.vatRate || String(this.defaultTaxRate)),
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
      supplyDate: formValue.supplyDate || undefined,
      dueDate: formValue.dueDate || undefined,
      discountAmount: parseFloat(formValue.discountAmount || '0'),
      currency: formValue.currency || 'AED',
      status: 'proforma_invoice', // Always proforma_invoice for this component
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
      // Commercial header fields
      deliveryNote: formValue.deliveryNote || undefined,
      suppliersRef: formValue.suppliersRef || undefined,
      otherReference: formValue.otherReference || undefined,
      buyerOrderNo: formValue.buyerOrderNo || undefined,
      buyerOrderDate: formValue.buyerOrderDate || undefined,
      despatchedThrough: formValue.despatchedThrough || undefined,
      destination: formValue.destination || undefined,
      termsOfDelivery: formValue.termsOfDelivery || undefined,
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
          error?.error?.message || 'Failed to save proforma invoice',
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
