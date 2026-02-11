import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice, InvoiceLineItem } from '../../../core/services/sales-invoices.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { SettingsService, TaxRate, InvoiceTemplateSettings } from '../../../core/services/settings.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { ApiService } from '../../../core/services/api.service';
import { Organization } from '../../../core/models/organization.model';
import { Observable, of, forkJoin } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

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
  taxRates: TaxRate[] = [];
  defaultTaxRate = 5; // Fallback default

  readonly vatTaxTypes = ['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE'];
  /** Status options for Tax Invoice screen only (Receivable, Bank Received, Cash Received). */
  readonly invoiceStatuses = [
    'tax_invoice_receivable',
    'tax_invoice_bank_received',
    'tax_invoice_cash_received',
  ];
  readonly statusDisplayMap: Record<string, string> = {
    'proforma_invoice': 'Proforma Invoice',
    'quotation': 'Quotation',
    'tax_invoice_receivable': 'Receivable',
    'tax_invoice_bank_received': 'Bank Received',
    'tax_invoice_cash_received': 'Cash Received',
  };
  /** When opened from Proforma or Quotation screen, status is fixed; no dropdown. */
  documentType: 'invoice' | 'proforma' | 'quotation' = 'invoice';
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  organization: Organization | null = null;
  nextInvoiceNumber = '';
  allowManualInvoiceNumber = false;
  templateDefaults: InvoiceTemplateSettings | null = null;
  logoDataUrl: string | null = null;
  signatureDataUrl: string | null = null;
  /** Advanced options panel starts collapsed; user expands to see header/footer/display checkboxes */
  advancedOptionsExpanded = false;

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

  /** Sum of line-item VAT amounts (before discount scaling). */
  get totalVat(): number {
    const lineVatSum = this.lineItems.controls.reduce((sum, control) => {
      const vatAmount = parseFloat(control.get('vatAmount')?.value || '0');
      return sum + vatAmount;
    }, 0);
    // VAT is calculated on (amount - discount): scale VAT by taxable base / subtotal
    const sub = this.subtotal;
    const discount = this.discountAmount;
    if (sub <= 0) return 0;
    const taxableBase = Math.max(0, sub - discount);
    return lineVatSum * (taxableBase / sub);
  }

  get discountAmount(): number {
    return parseFloat(this.form.get('discountAmount')?.value || '0');
  }

  get totalAmount(): number {
    return Math.max(0, this.subtotal - this.discountAmount + this.totalVat);
  }

  get totalInWords(): string {
    const n = Math.floor(this.totalAmount);
    const curr = this.form.get('currency')?.value || 'AED';
    const suffix = curr === 'AED' ? 'Dirham Only' : curr + ' Only';
    if (n === 0) return 'Zero ' + suffix;
    if (n > 999999) return this.totalAmount.toFixed(2) + ' ' + curr;
    return this.numberToWords(n) + ' ' + suffix;
  }

  private numberToWords(n: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return (tens[Math.floor(n / 10)] + ' ' + ones[n % 10]).trim();
    if (n < 1000) return (ones[Math.floor(n / 100)] + ' Hundred ' + (n % 100 ? this.numberToWords(n % 100) : '')).trim();
    if (n < 1000000) return (this.numberToWords(Math.floor(n / 1000)) + ' Thousand ' + (n % 1000 ? this.numberToWords(n % 1000) : '')).trim();
    return (this.numberToWords(Math.floor(n / 1000000)) + ' Million ' + (n % 1000000 ? this.numberToWords(n % 1000000) : '')).trim();
  }

  getStatusDisplayLabel(status: string): string {
    return this.statusDisplayMap[status] || status;
  }

  /** Labels and placeholders by document type (Invoice, Proforma Invoice, Quotation). */
  get documentTitleLabel(): string {
    return this.documentType === 'proforma' ? 'Proforma Invoice' : this.documentType === 'quotation' ? 'Quotation' : 'Invoice';
  }
  get documentNumberLabel(): string {
    return this.documentType === 'proforma' ? 'Proforma invoice No' : this.documentType === 'quotation' ? 'Quotation No' : 'Invoice No';
  }
  get documentDetailsSectionLabel(): string {
    return this.documentType === 'proforma' ? 'Proforma invoice details' : this.documentType === 'quotation' ? 'Quotation details' : 'Invoice details';
  }
  get documentTitleFieldLabel(): string {
    return this.documentType === 'proforma' ? 'Proforma invoice title' : this.documentType === 'quotation' ? 'Quotation title' : 'Invoice title';
  }
  get documentTitlePlaceholder(): string {
    return this.documentType === 'proforma' ? 'Proforma Invoice' : this.documentType === 'quotation' ? 'Quotation' : 'Tax Invoice';
  }
  get documentTitlePlaceholderShort(): string {
    return this.documentType === 'proforma' ? 'e.g. Proforma Invoice' : this.documentType === 'quotation' ? 'e.g. Quotation' : 'e.g. TAX INVOICE';
  }
  get nextNumberHintLabel(): string {
    return this.documentType === 'proforma' ? 'Next proforma invoice no:' : this.documentType === 'quotation' ? 'Next quotation no:' : 'Next:';
  }
  get documentWord(): string {
    return this.documentType === 'proforma' ? 'proforma invoice' : this.documentType === 'quotation' ? 'quotation' : 'invoice';
  }
  get dateRequiredError(): string {
    return this.documentType === 'invoice' ? 'Invoice date is required' : 'Date is required';
  }
  get dueDateLabel(): string {
    return this.documentType === 'quotation' ? 'Valid until' : 'Due date';
  }

  /** Resolve document type from dialog data (invoice = tax invoice screen, proforma, quotation). */
  private resolveDocumentType(
    data: (SalesInvoice & { documentType?: 'proforma' | 'quotation' }) | { documentType: 'proforma' | 'quotation' } | null,
  ): 'invoice' | 'proforma' | 'quotation' {
    if (!data) return 'invoice';
    const docType = (data as { documentType?: 'proforma' | 'quotation' }).documentType;
    if (docType === 'proforma' || docType === 'quotation') return docType;
    const status = (data as SalesInvoice).status;
    if (status === 'quotation') return 'quotation';
    if (status === 'proforma_invoice') return 'proforma';
    return 'invoice';
  }

  /** Invoice entity when editing (data may be wrapped with documentType). */
  get invoice(): SalesInvoice | null {
    const d = this.data;
    if (!d || typeof (d as any).id !== 'string') return null;
    return d as SalesInvoice;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<InvoiceFormDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
    private readonly organizationService: OrganizationService,
    private readonly api: ApiService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: (SalesInvoice & { documentType?: 'proforma' | 'quotation' }) | { documentType: 'proforma' | 'quotation' } | null,
  ) {
    this.documentType = this.resolveDocumentType(data);
    const defaultStatus = this.documentType === 'quotation' ? 'quotation' : this.documentType === 'proforma' ? 'proforma_invoice' : 'tax_invoice_receivable';
    this.form = this.fb.group({
      invoiceNumber: [''],
      customerId: [''],
      customerName: [''],
      customerTrn: [''],
      invoiceDate: [new Date().toISOString().substring(0, 10), Validators.required],
      supplyDate: [''],
      dueDate: [''],
      discountAmount: [0],
      currency: ['AED'],
      status: [defaultStatus],
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
      // Per-invoice display/template overrides (defaults loaded from template)
      displayOptions: this.fb.group({
        invoiceTitle: [''],
        invoiceHeaderText: [''],
        invoiceShowCompanyDetails: [true],
        invoiceShowVatDetails: [true],
        invoiceShowPaymentTerms: [true],
        invoiceShowPaymentMethods: [true],
        invoiceShowBankDetails: [false],
        invoiceShowTermsConditions: [true],
        invoiceDefaultPaymentTerms: ['Net 30'],
        invoiceCustomPaymentTerms: [''],
        invoiceDefaultNotes: [''],
        invoiceTermsConditions: [''],
        invoiceFooterText: [''],
        invoiceShowFooter: [true],
        invoiceShowItemDescription: [true],
        invoiceShowItemQuantity: [true],
        invoiceShowItemUnitPrice: [true],
        invoiceShowItemTotal: [true],
      }),
    });
  }

  get displayOptions(): FormGroup {
    return this.form.get('displayOptions') as FormGroup;
  }

  get invoiceTitleControl(): FormControl {
    return this.displayOptions.get('invoiceTitle') as FormControl;
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadTaxSettings();
    if (this.invoice) {
      this.loadInvoiceData();
    } else {
      this.loadTemplateOrgAndNextNumber();
      this.addLineItem();
    }
    this.filteredItems$ = this.invoicesService.getItemSuggestions();
  }

  loadTemplateOrgAndNextNumber(): void {
    forkJoin({
      org: this.organizationService.getMyOrganization(),
      template: this.settingsService.getInvoiceTemplate(),
      nextNumber: this.invoicesService.getNextInvoiceNumber(),
      numbering: this.settingsService.getNumberingSettings(),
    }).subscribe({
      next: (result) => {
        this.organization = result.org;
        this.templateDefaults = result.template;
        this.nextInvoiceNumber = result.nextNumber?.invoiceNumber ?? '';
        this.allowManualInvoiceNumber = result.numbering?.settings?.numberingAllowManual ?? false;
        this.form.patchValue({
          invoiceNumber: this.allowManualInvoiceNumber ? this.nextInvoiceNumber : '',
        });
        if (result.template) {
          const defaultTitle =
            this.documentType === 'proforma'
              ? 'Proforma Invoice'
              : this.documentType === 'quotation'
                ? 'Quotation'
                : (result.template.invoiceTitle ?? 'TAX INVOICE');
          this.displayOptions.patchValue({
            invoiceTitle: defaultTitle,
            invoiceHeaderText: result.template.invoiceHeaderText ?? '',
            invoiceShowCompanyDetails: result.template.invoiceShowCompanyDetails ?? true,
            invoiceShowVatDetails: result.template.invoiceShowVatDetails ?? true,
            invoiceShowPaymentTerms: result.template.invoiceShowPaymentTerms ?? true,
            invoiceShowPaymentMethods: result.template.invoiceShowPaymentMethods ?? true,
            invoiceShowBankDetails: result.template.invoiceShowBankDetails ?? false,
            invoiceShowTermsConditions: result.template.invoiceShowTermsConditions ?? true,
            invoiceDefaultPaymentTerms: result.template.invoiceDefaultPaymentTerms ?? 'Net 30',
            invoiceCustomPaymentTerms: result.template.invoiceCustomPaymentTerms ?? '',
            invoiceDefaultNotes: result.template.invoiceDefaultNotes ?? '',
            invoiceTermsConditions: result.template.invoiceTermsConditions ?? '',
            invoiceFooterText: result.template.invoiceFooterText ?? '',
            invoiceShowFooter: result.template.invoiceShowFooter ?? true,
            invoiceShowItemDescription: result.template.invoiceShowItemDescription ?? true,
            invoiceShowItemQuantity: result.template.invoiceShowItemQuantity ?? true,
            invoiceShowItemUnitPrice: result.template.invoiceShowItemUnitPrice ?? true,
            invoiceShowItemTotal: result.template.invoiceShowItemTotal ?? true,
          });
        } else {
          // No template: set default title by document type for new proforma/quotation
          if (this.documentType === 'proforma') {
            this.displayOptions.patchValue({ invoiceTitle: 'Proforma Invoice' });
          } else if (this.documentType === 'quotation') {
            this.displayOptions.patchValue({ invoiceTitle: 'Quotation' });
          }
        }
        this.loadLogoFromSettings();
        this.loadSignatureFromSettings();
      },
    });
  }

  /** Load logo image from settings (invoice template). Call whenever org/template is available. */
  loadLogoFromSettings(): void {
    this.api.download('/settings/invoice-template/logo').subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoDataUrl = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: () => {},
    });
  }

  /** Load signature image from settings (invoice template). */
  loadSignatureFromSettings(): void {
    this.api.download('/settings/invoice-template/signature').subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.signatureDataUrl = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: () => {},
    });
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
    const invoice = this.invoice;
    if (!invoice) return;

    this.organizationService.getMyOrganization().subscribe({
      next: (org) => {
        this.organization = org;
      },
    });
    this.settingsService.getInvoiceTemplate().subscribe({
      next: (t) => {
        this.templateDefaults = t;
        this.loadLogoFromSettings();
        this.loadSignatureFromSettings();
      },
    });
    
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
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceDate: invoice.invoiceDate,
      supplyDate: (invoice as any).supplyDate || '',
      dueDate: invoice.dueDate || '',
      discountAmount: parseFloat((invoice as any).discountAmount || '0'),
      currency: invoice.currency || 'AED',
      status: invoice.status,
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

    const opts = (invoice as any).displayOptions;
    if (opts && typeof opts === 'object') {
      this.displayOptions.patchValue({
        invoiceTitle: opts.invoiceTitle ?? '',
        invoiceHeaderText: opts.invoiceHeaderText ?? '',
        invoiceShowCompanyDetails: opts.invoiceShowCompanyDetails ?? true,
        invoiceShowVatDetails: opts.invoiceShowVatDetails ?? true,
        invoiceShowPaymentTerms: opts.invoiceShowPaymentTerms ?? true,
        invoiceShowPaymentMethods: opts.invoiceShowPaymentMethods ?? true,
        invoiceShowBankDetails: opts.invoiceShowBankDetails ?? false,
        invoiceShowTermsConditions: opts.invoiceShowTermsConditions ?? true,
        invoiceDefaultPaymentTerms: opts.invoiceDefaultPaymentTerms ?? 'Net 30',
        invoiceCustomPaymentTerms: opts.invoiceCustomPaymentTerms ?? '',
        invoiceDefaultNotes: opts.invoiceDefaultNotes ?? '',
        invoiceTermsConditions: opts.invoiceTermsConditions ?? '',
        invoiceFooterText: opts.invoiceFooterText ?? '',
        invoiceShowFooter: opts.invoiceShowFooter ?? true,
        invoiceShowItemDescription: opts.invoiceShowItemDescription ?? true,
        invoiceShowItemQuantity: opts.invoiceShowItemQuantity ?? true,
        invoiceShowItemUnitPrice: opts.invoiceShowItemUnitPrice ?? true,
        invoiceShowItemTotal: opts.invoiceShowItemTotal ?? true,
      });
    }

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
      notes: [item?.notes || ''],
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

  save(asDraft = false): void {
    if (this.lineItems.length === 0) {
      this.snackBar.open('Please add at least one line item', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }
    if (!asDraft && this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill in required fields (e.g. item name for each line, invoice date).', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    const lineItems = this.lineItems.controls.map((control) => {
      const value = control.getRawValue();
      return {
        itemName: value.itemName,
        description: value.description || undefined,
        notes: value.notes || undefined,
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

    const status = asDraft
      ? 'draft'
      : this.documentType === 'proforma'
        ? 'proforma_invoice'
        : this.documentType === 'quotation'
          ? 'quotation'
          : (formValue.status || 'tax_invoice_receivable');
    const displayOpts = formValue.displayOptions || {};
    const displayOptionsPayload: Record<string, unknown> = {};
    const keys = [
      'invoiceTitle', 'invoiceHeaderText', 'invoiceShowCompanyDetails', 'invoiceShowVatDetails',
      'invoiceShowPaymentTerms', 'invoiceShowPaymentMethods', 'invoiceShowBankDetails',
      'invoiceShowTermsConditions', 'invoiceDefaultPaymentTerms', 'invoiceCustomPaymentTerms',
      'invoiceDefaultNotes', 'invoiceTermsConditions', 'invoiceFooterText', 'invoiceShowFooter',
      'invoiceShowItemDescription', 'invoiceShowItemQuantity', 'invoiceShowItemUnitPrice', 'invoiceShowItemTotal',
    ];
    keys.forEach((k) => {
      if (displayOpts[k] !== undefined && displayOpts[k] !== null && displayOpts[k] !== '') {
        displayOptionsPayload[k] = displayOpts[k];
      }
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
      status,
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
      deliveryNote: formValue.deliveryNote || undefined,
      suppliersRef: formValue.suppliersRef || undefined,
      otherReference: formValue.otherReference || undefined,
      buyerOrderNo: formValue.buyerOrderNo || undefined,
      buyerOrderDate: formValue.buyerOrderDate || undefined,
      despatchedThrough: formValue.despatchedThrough || undefined,
      destination: formValue.destination || undefined,
      termsOfDelivery: formValue.termsOfDelivery || undefined,
      lineItems,
      displayOptions: Object.keys(displayOptionsPayload).length > 0 ? displayOptionsPayload : undefined,
    };

    if (!this.invoice && formValue.invoiceNumber?.trim()) {
      payload.invoiceNumber = formValue.invoiceNumber.trim();
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const operation = this.invoice
      ? this.invoicesService.updateInvoice(this.invoice.id, payload)
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

  duplicateLineItem(index: number): void {
    const control = this.lineItems.at(index);
    if (!control) return;
    const value = control.getRawValue();
    this.addLineItem({
      itemName: value.itemName,
      description: value.description,
      notes: value.notes,
      quantity: value.quantity,
      unitPrice: value.unitPrice,
      unitOfMeasure: value.unitOfMeasure,
      vatRate: value.vatRate,
      vatTaxType: value.vatTaxType,
      amount: value.amount,
      vatAmount: value.vatAmount,
      totalAmount: value.totalAmount,
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

