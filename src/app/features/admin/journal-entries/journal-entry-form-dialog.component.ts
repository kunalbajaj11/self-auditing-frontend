import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  JournalEntriesService,
  JournalEntry,
  JournalEntryAccount,
  ACCOUNT_METADATA,
  getAccountsByCategory,
} from '../../../core/services/journal-entries.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { ExpensePaymentsService, ExpenseWithOutstanding } from '../../../core/services/expense-payments.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { Observable, of, forkJoin } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap, tap, catchError, finalize } from 'rxjs/operators';

interface JournalEntryTemplate {
  name: string;
  description: string;
  debitAccount: JournalEntryAccount;
  creditAccount: JournalEntryAccount;
}

@Component({
  selector: 'app-journal-entry-form-dialog',
  templateUrl: './journal-entry-form-dialog.component.html',
  styleUrls: ['./journal-entry-form-dialog.component.scss'],
})
export class JournalEntryFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  isEditMode = false;
  selectedTemplate: JournalEntryTemplate | null = null;

  readonly accountsByCategory = getAccountsByCategory();
  readonly allAccounts = Object.values(ACCOUNT_METADATA);

  // Vendor/Customer autocomplete
  vendors: Vendor[] = [];
  filteredVendors$!: Observable<Vendor[]>;
  selectedVendor: Vendor | null = null;

  customers: Customer[] = [];
  filteredCustomers$!: Observable<Customer[]>;
  selectedCustomer: Customer | null = null;

  // Pending invoices
  pendingExpenseInvoices: Array<ExpenseWithOutstanding> = [];
  loadingPendingExpenseInvoices = false;
  pendingSalesInvoices: SalesInvoice[] = [];
  loadingPendingSalesInvoices = false;

  // Track if vendor or customer is selected
  isVendorSelected = false;
  isCustomerSelected = false;

  // Track when Accounts Payable/Receivable are selected
  showAccountsPayableSection = false;
  showAccountsReceivableSection = false;
  
  // Grouped data for display
  vendorsWithInvoices: Array<{ vendor: Vendor; invoices: ExpenseWithOutstanding[] }> = [];
  customersWithInvoices: Array<{ customer: Customer; invoices: SalesInvoice[] }> = [];
  loadingVendorsWithInvoices = false;
  loadingCustomersWithInvoices = false;

  readonly templates: JournalEntryTemplate[] = [
    {
      name: 'Owner Introduced Capital',
      description: 'Owner invested capital into the business',
      debitAccount: JournalEntryAccount.CASH,
      creditAccount: JournalEntryAccount.SHARE_CAPITAL,
    },
    {
      name: 'Owner Withdrew',
      description: 'Owner withdrew funds from the business',
      debitAccount: JournalEntryAccount.OWNER_SHAREHOLDER_ACCOUNT,
      creditAccount: JournalEntryAccount.CASH,
    },
    {
      name: 'Accrued Income',
      description: 'Income earned but not yet received',
      debitAccount: JournalEntryAccount.ACCOUNTS_RECEIVABLE,
      creditAccount: JournalEntryAccount.SALES_REVENUE,
    },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<JournalEntryFormDialogComponent>,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly snackBar: MatSnackBar,
    private readonly vendorsService: VendorsService,
    private readonly customersService: CustomersService,
    private readonly expensePaymentsService: ExpensePaymentsService,
    private readonly salesInvoicesService: SalesInvoicesService,
    @Inject(MAT_DIALOG_DATA) readonly data: JournalEntry | null,
  ) {
    this.isEditMode = Boolean(data);
    this.form = this.fb.group(
      {
        entryStyle: ['simple'], // Simple journal (1 debit, 1 credit) - default
        debitAccount: [null, Validators.required],
        creditAccount: [null, Validators.required],
        amount: [0, [Validators.required, Validators.min(0.01)]],
        entryDate: [
          new Date().toISOString().substring(0, 10),
          Validators.required,
        ],
        description: [''],
        customerVendorName: [''],
        vendorTrn: [''],
        vendorId: [''],
        customerId: [''],
        expenseId: [''], // Selected expense invoice
        invoiceId: [''], // Selected sales invoice
        vatAmount: [0, [Validators.min(0)]],
        vatTaxType: ['standard'],
        subAccount: [''],
        referenceNumber: [''],
        attachmentId: [''],
        notes: [''],
      },
      { validators: [this.accountMismatchValidator, this.retainedEarningsValidator] },
    );
  }

  ngOnInit(): void {
    this.setupVendorAutocomplete();
    this.setupCustomerAutocomplete();

    // Load vendors and customers, then handle edit mode
    this.loadVendors();
    this.loadCustomers().subscribe({
      next: () => {
        // After both are loaded, handle edit mode
        if (this.data) {
          this.handleEditMode();
        }
        // Check account selection on initial load (for both edit and create mode)
        // Use setTimeout to ensure form values are set
        setTimeout(() => {
          this.checkAccountSelection();
        }, 0);
      },
      error: () => {
        // Even if error, try to handle edit mode
        if (this.data) {
          this.handleEditMode();
        }
        // Still check account selection even if there was an error
        setTimeout(() => {
          this.checkAccountSelection();
        }, 0);
      },
    });

    // Watch for vendor/customer name changes to clear selection
    this.form.get('customerVendorName')?.valueChanges.subscribe((name) => {
      if (!name) {
        this.isVendorSelected = false;
        this.isCustomerSelected = false;
        this.selectedVendor = null;
        this.selectedCustomer = null;
        this.pendingExpenseInvoices = [];
        this.pendingSalesInvoices = [];
        this.form.patchValue({
          vendorId: '',
          customerId: '',
          expenseId: '',
          invoiceId: '',
        });
      }
    });

    // Watch for debit/credit account changes to show vendors/customers
    this.form.get('debitAccount')?.valueChanges.subscribe((account) => {
      this.checkAccountSelection();
    });

    this.form.get('creditAccount')?.valueChanges.subscribe((account) => {
      this.checkAccountSelection();
    });
  }

  checkAccountSelection(): void {
    const debitAccount = this.form.get('debitAccount')?.value;
    const creditAccount = this.form.get('creditAccount')?.value;
    
    const hasAccountsPayable = 
      debitAccount === JournalEntryAccount.ACCOUNTS_PAYABLE ||
      creditAccount === JournalEntryAccount.ACCOUNTS_PAYABLE;
    
    const hasAccountsReceivable = 
      debitAccount === JournalEntryAccount.ACCOUNTS_RECEIVABLE ||
      creditAccount === JournalEntryAccount.ACCOUNTS_RECEIVABLE;

    // Track if section is being shown for the first time or becoming visible again
    const wasPayableSectionHidden = !this.showAccountsPayableSection;
    const wasReceivableSectionHidden = !this.showAccountsReceivableSection;

    this.showAccountsPayableSection = hasAccountsPayable;
    this.showAccountsReceivableSection = hasAccountsReceivable;

    // Load vendors if Accounts Payable is selected and:
    // - Section was previously hidden (just became visible), OR
    // - Data hasn't been loaded yet
    if (hasAccountsPayable && !this.loadingVendorsWithInvoices && 
        (wasPayableSectionHidden || this.vendorsWithInvoices.length === 0)) {
      this.loadAllVendorsWithInvoices();
    }

    // Load customers if Accounts Receivable is selected and:
    // - Section was previously hidden (just became visible), OR
    // - Data hasn't been loaded yet
    if (hasAccountsReceivable && !this.loadingCustomersWithInvoices && 
        (wasReceivableSectionHidden || this.customersWithInvoices.length === 0)) {
      this.loadAllCustomersWithInvoices();
    }

    // Hide sections if accounts are deselected
    if (!hasAccountsPayable) {
      this.vendorsWithInvoices = [];
    }
    if (!hasAccountsReceivable) {
      this.customersWithInvoices = [];
    }
  }

  private handleEditMode(): void {
    if (!this.data) return;

    // Editing existing entry
    this.form.patchValue({
      debitAccount: this.data.debitAccount,
      creditAccount: this.data.creditAccount,
      amount: parseFloat(this.data.amount.toString()),
      entryDate: this.data.entryDate,
      description: this.data.description || '',
      customerVendorName: this.data.customerVendorName || '',
      vendorTrn: (this.data as any).vendorTrn || '',
      vatAmount: (this.data as any).vatAmount ? parseFloat((this.data as any).vatAmount.toString()) : 0,
      vatTaxType: (this.data as any).vatTaxType || 'standard',
      subAccount: (this.data as any).subAccount || '',
      referenceNumber: this.data.referenceNumber || '',
      attachmentId: this.data.attachmentId || '',
      notes: this.data.notes || '',
      expenseId: (this.data as any).expenseId || '',
      invoiceId: (this.data as any).invoiceId || '',
    });

    // Check if Accounts Payable/Receivable is selected and load vendors/customers accordingly
    // This will be called after form values are set, so use setTimeout
    setTimeout(() => {
      this.checkAccountSelection();
    }, 0);

    // If editing and has customerVendorName, try to load pending invoices
    if (this.data.customerVendorName) {
      // Try to find if it's a vendor or customer
      const vendor = this.vendors.find(v => v.name === this.data!.customerVendorName);
      if (vendor) {
        this.selectedVendor = vendor;
        this.isVendorSelected = true;
        this.form.patchValue({ vendorId: vendor.id });
        this.loadPendingExpenseInvoices(vendor.name);
      } else {
        const customer = this.customers.find(c => c.name === this.data!.customerVendorName);
        if (customer) {
          this.selectedCustomer = customer;
          this.isCustomerSelected = true;
          this.form.patchValue({ customerId: customer.id });
          this.loadPendingSalesInvoices(customer.id || customer.name);
        }
      }
    }
  }

  loadVendors(): void {
    this.vendorsService.listVendors().subscribe({
      next: (vendors) => {
        this.vendors = vendors;
        // If editing and vendors just loaded, try to find vendor
        if (this.data && this.data.customerVendorName && !this.selectedVendor && !this.selectedCustomer) {
          const vendor = this.vendors.find(v => v.name === this.data!.customerVendorName);
          if (vendor) {
            this.selectedVendor = vendor;
            this.isVendorSelected = true;
            this.form.patchValue({ vendorId: vendor.id });
            this.loadPendingExpenseInvoices(vendor.name);
          }
        }
      },
      error: (error) => {
        console.error('Error loading vendors:', error);
      },
    });
  }

  loadCustomers(): Observable<Customer[]> {
    return this.customersService.listCustomers().pipe(
      map((customers) => {
        this.customers = customers;
        // If editing and customers just loaded, try to find customer
        if (this.data && this.data.customerVendorName && !this.selectedVendor && !this.selectedCustomer) {
          const customer = this.customers.find(c => c.name === this.data!.customerVendorName);
          if (customer) {
            this.selectedCustomer = customer;
            this.isCustomerSelected = true;
            this.form.patchValue({ customerId: customer.id });
            this.loadPendingSalesInvoices(customer.id || customer.name);
          }
        }
        return customers;
      }),
    );
  }

  private setupVendorAutocomplete(): void {
    const initialValue = this.form.get('customerVendorName')?.value || '';
    this.filteredVendors$ = this.form.get('customerVendorName')!.valueChanges.pipe(
      startWith(initialValue),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (this.selectedVendor && this.selectedVendor.name === search) {
          return of([this.selectedVendor]);
        }
        if (!search || search.length < 2) {
          return of(this.vendors.slice(0, 10));
        }
        const filtered = this.vendors.filter((v) =>
          v.name.toLowerCase().includes(search.toLowerCase())
        );
        return of(filtered.slice(0, 10));
      }),
    );
  }

  private setupCustomerAutocomplete(): void {
    const initialValue = this.form.get('customerVendorName')?.value || '';
    this.filteredCustomers$ = this.form.get('customerVendorName')!.valueChanges.pipe(
      startWith(initialValue),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (this.selectedCustomer && this.selectedCustomer.name === search) {
          return of([this.selectedCustomer]);
        }
        if (!search || search.length < 2) {
          return of(this.customers.slice(0, 10));
        }
        return this.customersService.listCustomers(search, true).pipe(
          map((customers) => customers.slice(0, 10)),
        );
      }),
    );
  }

  onVendorSelected(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.selectedCustomer = null;
    this.isVendorSelected = true;
    this.isCustomerSelected = false;
    this.form.patchValue({
      vendorId: vendor.id,
      customerVendorName: vendor.name,
      vendorTrn: vendor.vendorTrn || '',
      customerId: '',
      expenseId: '',
      invoiceId: '',
    });
    this.loadPendingExpenseInvoices(vendor.name);
  }

  onCustomerSelected(customer: Customer): void {
    this.selectedCustomer = customer;
    this.selectedVendor = null;
    this.isCustomerSelected = true;
    this.isVendorSelected = false;
    this.form.patchValue({
      customerId: customer.id,
      customerVendorName: customer.name,
      vendorId: '',
      expenseId: '',
      invoiceId: '',
    });
    const customerIdentifier = customer.id && customer.id.trim() ? customer.id : customer.name;
    this.loadPendingSalesInvoices(customerIdentifier);
  }

  displayVendorOrCustomer(value: Vendor | Customer | string | null): string {
    if (!value) {
      return this.form.get('customerVendorName')?.value || '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.name;
  }

  loadPendingExpenseInvoices(vendorName: string): void {
    if (!vendorName) {
      this.pendingExpenseInvoices = [];
      return;
    }

    this.loadingPendingExpenseInvoices = true;
    this.expensePaymentsService.getPendingInvoicesByVendor(vendorName).subscribe({
      next: (invoices) => {
        this.pendingExpenseInvoices = invoices;
        this.loadingPendingExpenseInvoices = false;
      },
      error: (error) => {
        console.error('Error loading pending expense invoices:', error);
        this.pendingExpenseInvoices = [];
        this.loadingPendingExpenseInvoices = false;
      },
    });
  }

  loadPendingSalesInvoices(customerIdOrName: string): void {
    if (!customerIdOrName) {
      this.pendingSalesInvoices = [];
      return;
    }

    this.loadingPendingSalesInvoices = true;
    const filters: any = {};
    
    if (customerIdOrName.length === 36 && customerIdOrName.includes('-')) {
      filters.customerId = customerIdOrName;
    }

    this.salesInvoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.pendingSalesInvoices = invoices.filter((inv) => {
          const matchesCustomer = 
            (filters.customerId && inv.customerId === filters.customerId) ||
            (!filters.customerId && this.selectedCustomer && inv.customerName === this.selectedCustomer.name);
          const isPending = inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial';
          const outstanding = this.getInvoiceOutstanding(inv);
          return matchesCustomer && isPending && outstanding > 0.01;
        });
        this.loadingPendingSalesInvoices = false;
      },
      error: (error) => {
        console.error('Error loading pending sales invoices:', error);
        this.pendingSalesInvoices = [];
        this.loadingPendingSalesInvoices = false;
      },
    });
  }

  getInvoiceOutstanding(invoice: SalesInvoice): number {
    const total = parseFloat(invoice.totalAmount || '0');
    const paid = parseFloat(invoice.paidAmount || '0');
    return total - paid;
  }

  selectExpenseInvoice(expense: ExpenseWithOutstanding): void {
    const outstandingAmount = expense.outstandingAmount || parseFloat(String(expense.totalAmount || '0'));
    this.form.patchValue({
      expenseId: expense.id,
      amount: outstandingAmount,
      description: expense.description || `Settlement for ${expense.vendorName || 'vendor'}`,
      referenceNumber: expense.invoiceNumber || '',
      vendorTrn: expense.vendorTrn || this.form.get('vendorTrn')?.value || '',
    });
    this.snackBar.open(
      `Invoice ${expense.invoiceNumber || 'N/A'} selected. Amount set to ${outstandingAmount.toFixed(2)} AED`,
      'Close',
      { duration: 3000 }
    );
  }

  selectSalesInvoice(invoice: SalesInvoice): void {
    const outstanding = this.getInvoiceOutstanding(invoice);
    this.form.patchValue({
      invoiceId: invoice.id,
      amount: outstanding,
      description: invoice.description || `Settlement for ${invoice.customerName || 'customer'}`,
      referenceNumber: invoice.invoiceNumber || '',
    });
    this.snackBar.open(
      `Invoice ${invoice.invoiceNumber || 'N/A'} selected. Amount set to ${outstanding.toFixed(2)} AED`,
      'Close',
      { duration: 3000 }
    );
  }

  onVendorCustomerFocus(): void {
    // Trigger autocomplete when field is focused
    const currentValue = this.form.get('customerVendorName')?.value || '';
    if (!currentValue) {
      this.form.get('customerVendorName')?.setValue('');
    }
  }

  onVendorOrCustomerSelected(event: any): void {
    const selected = event.option.value;
    if (!selected || !selected.id) {
      return;
    }
    // Check if it's a vendor
    const vendor = this.vendors.find(v => v.id === selected.id);
    if (vendor) {
      this.onVendorSelected(selected);
      return;
    }
    // Check if it's a customer
    const customer = this.customers.find(c => c.id === selected.id);
    if (customer) {
      this.onCustomerSelected(selected);
      return;
    }
    // If not found in either, it might be a string (manual entry)
    // In that case, just set the name
    if (typeof selected === 'string') {
      this.form.patchValue({ customerVendorName: selected });
    }
  }

  loadAllVendorsWithInvoices(): void {
    this.loadingVendorsWithInvoices = true;
    this.vendorsWithInvoices = [];

    // Use already loaded vendors if available, otherwise load them
    const vendorsToProcess = this.vendors.length > 0 
      ? of(this.vendors.filter(v => v.isActive))
      : this.vendorsService.listVendors({ isActive: true });

    vendorsToProcess.subscribe({
      next: (allVendors) => {
        // Update vendors array if it was empty
        if (this.vendors.length === 0) {
          this.vendors = allVendors;
        }

        if (allVendors.length === 0) {
          this.loadingVendorsWithInvoices = false;
          return;
        }

        // For each vendor, get their pending invoices
        const vendorInvoiceRequests = allVendors.map(vendor =>
          this.expensePaymentsService.getPendingInvoicesByVendor(vendor.name).pipe(
            catchError(() => of([])),
            map((invoices: ExpenseWithOutstanding[]) => ({
              vendor,
              invoices: invoices.filter(inv => (inv.outstandingAmount || 0) > 0.01)
            }))
          )
        );

        forkJoin(vendorInvoiceRequests).subscribe({
          next: (results) => {
            // Only include vendors that have pending invoices
            this.vendorsWithInvoices = results.filter(result => result.invoices.length > 0);
            this.loadingVendorsWithInvoices = false;
          },
          error: (error) => {
            console.error('Error loading vendors with invoices:', error);
            this.loadingVendorsWithInvoices = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading vendors:', error);
        this.loadingVendorsWithInvoices = false;
      }
    });
  }

  loadAllCustomersWithInvoices(): void {
    this.loadingCustomersWithInvoices = true;
    this.customersWithInvoices = [];

    // Ensure customers are loaded first
    const customersToProcess = this.customers.length > 0
      ? of(this.customers.filter(c => c.isActive))
      : this.customersService.listCustomers(undefined, true);

    customersToProcess.subscribe({
      next: (loadedCustomers) => {
        // Update customers array if it was empty
        if (this.customers.length === 0) {
          this.customers = loadedCustomers;
        }

        // Get all pending sales invoices (unpaid and partial)
        forkJoin([
          this.salesInvoicesService.listInvoices({ paymentStatus: 'unpaid' }),
          this.salesInvoicesService.listInvoices({ paymentStatus: 'partial' })
        ]).subscribe({
          next: ([unpaidInvoices, partialInvoices]) => {
            const allPendingInvoices = [...unpaidInvoices, ...partialInvoices].filter(inv => {
              const outstanding = this.getInvoiceOutstanding(inv);
              return outstanding > 0.01;
            });

            // Group invoices by customer
            const customerMap = new Map<string, { customer: Customer; invoices: SalesInvoice[] }>();

            allPendingInvoices.forEach(invoice => {
              const customerIdentifier = invoice.customerId || invoice.customerName;
              if (!customerIdentifier) return;

              // Try to find the customer in our loaded customers
              let customer = this.customers.find(c => 
                (c.id && c.id === invoice.customerId) || 
                c.name === invoice.customerName
              );

              // If customer not found in loaded list but we have the invoice data, create a placeholder
              if (!customer && invoice.customerName) {
                customer = {
                  id: invoice.customerId || '',
                  name: invoice.customerName,
                  customerTrn: invoice.customerTrn || undefined,
                  preferredCurrency: invoice.currency || 'AED',
                  isActive: true,
                  createdAt: invoice.createdAt,
                  updatedAt: invoice.updatedAt,
                } as Customer;
              }

              if (customer) {
                const key = customer.id || customer.name;
                if (!customerMap.has(key)) {
                  customerMap.set(key, { customer, invoices: [] });
                }
                customerMap.get(key)!.invoices.push(invoice);
              }
            });

            this.customersWithInvoices = Array.from(customerMap.values());
            this.loadingCustomersWithInvoices = false;
          },
          error: (error) => {
            console.error('Error loading pending invoices:', error);
            this.loadingCustomersWithInvoices = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.loadingCustomersWithInvoices = false;
      }
    });
  }

  selectVendorFromAccountsPayable(vendor: Vendor): void {
    // Set vendor without reloading invoices (they're already loaded)
    this.selectedVendor = vendor;
    this.selectedCustomer = null;
    this.isVendorSelected = true;
    this.isCustomerSelected = false;
    this.form.patchValue({
      vendorId: vendor.id,
      customerVendorName: vendor.name,
      vendorTrn: vendor.vendorTrn || '',
      customerId: '',
      invoiceId: '',
    });
    // Use the invoices already loaded in vendorsWithInvoices
    const vendorData = this.vendorsWithInvoices.find(v => v.vendor.id === vendor.id);
    if (vendorData) {
      this.pendingExpenseInvoices = vendorData.invoices;
    }
  }

  selectCustomerFromAccountsReceivable(customer: Customer): void {
    // Set customer without reloading invoices (they're already loaded)
    this.selectedCustomer = customer;
    this.selectedVendor = null;
    this.isCustomerSelected = true;
    this.isVendorSelected = false;
    this.form.patchValue({
      customerId: customer.id,
      customerVendorName: customer.name,
      vendorId: '',
      expenseId: '',
    });
    // Use the invoices already loaded in customersWithInvoices
    const customerData = this.customersWithInvoices.find(c => 
      (c.customer.id && customer.id && c.customer.id === customer.id) || 
      c.customer.name === customer.name
    );
    if (customerData) {
      this.pendingSalesInvoices = customerData.invoices;
    }
  }

  selectVendorAndInvoice(vendor: Vendor, invoice: ExpenseWithOutstanding): void {
    // Select vendor first
    this.selectVendorFromAccountsPayable(vendor);
    // Then select the invoice
    this.selectExpenseInvoice(invoice);
  }

  selectCustomerAndInvoice(customer: Customer, invoice: SalesInvoice): void {
    // Select customer first
    this.selectCustomerFromAccountsReceivable(customer);
    // Then select the invoice
    this.selectSalesInvoice(invoice);
  }

  // Custom validator: Debit and Credit accounts must be different
  accountMismatchValidator(control: AbstractControl): ValidationErrors | null {
    const debitAccount = control.get('debitAccount')?.value;
    const creditAccount = control.get('creditAccount')?.value;

    if (debitAccount && creditAccount && debitAccount === creditAccount) {
      return { accountMismatch: true };
    }
    return null;
  }

  // Custom validator: Retained Earnings cannot be manually selected
  retainedEarningsValidator(control: AbstractControl): ValidationErrors | null {
    const debitAccount = control.get('debitAccount')?.value;
    const creditAccount = control.get('creditAccount')?.value;

    if (
      debitAccount === JournalEntryAccount.RETAINED_EARNINGS ||
      creditAccount === JournalEntryAccount.RETAINED_EARNINGS
    ) {
      return { retainedEarningsNotAllowed: true };
    }
    return null;
  }

  getAccountName(accountCode: JournalEntryAccount): string {
    return ACCOUNT_METADATA[accountCode]?.name || accountCode;
  }

  getAccountCategory(accountCode: JournalEntryAccount): string {
    return ACCOUNT_METADATA[accountCode]?.category || 'asset';
  }

  applyTemplate(template: JournalEntryTemplate): void {
    this.selectedTemplate = template;
    this.form.patchValue({
      debitAccount: template.debitAccount,
      creditAccount: template.creditAccount,
      description: template.description,
    });
  }

  get isBalanced(): boolean {
    const amount = this.form.get('amount')?.value || 0;
    return amount > 0;
  }

  get debitAmount(): number {
    return this.form.get('amount')?.value || 0;
  }

  get creditAmount(): number {
    return this.form.get('amount')?.value || 0;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    // Format date to YYYY-MM-DD if it's a Date object
    let entryDate = formValue.entryDate;
    if (entryDate instanceof Date) {
      entryDate = entryDate.toISOString().substring(0, 10);
    } else if (typeof entryDate === 'string' && entryDate.length > 10) {
      entryDate = entryDate.substring(0, 10);
    }

    // Build reference number - include invoice number if selected
    let referenceNumber = formValue.referenceNumber || '';
    if (formValue.expenseId) {
      const selectedExpense = this.pendingExpenseInvoices.find(e => e.id === formValue.expenseId);
      if (selectedExpense?.invoiceNumber) {
        referenceNumber = selectedExpense.invoiceNumber;
      } else if (selectedExpense && !referenceNumber) {
        // Fallback: use expense ID if no invoice number
        referenceNumber = `EXP-${selectedExpense.id.substring(0, 8)}`;
      }
    } else if (formValue.invoiceId) {
      const selectedInvoice = this.pendingSalesInvoices.find(i => i.id === formValue.invoiceId);
      if (selectedInvoice?.invoiceNumber) {
        referenceNumber = selectedInvoice.invoiceNumber;
      } else if (selectedInvoice && !referenceNumber) {
        // Fallback: use invoice ID if no invoice number
        referenceNumber = `INV-${selectedInvoice.id.substring(0, 8)}`;
      }
    }

    // Build description - include invoice reference if selected
    let description = formValue.description || '';
    if (formValue.expenseId && !description) {
      const selectedExpense = this.pendingExpenseInvoices.find(e => e.id === formValue.expenseId);
      if (selectedExpense) {
        description = `Settlement for ${selectedExpense.vendorName || 'vendor'}${selectedExpense.invoiceNumber ? ` - Invoice ${selectedExpense.invoiceNumber}` : ''}`;
      }
    } else if (formValue.invoiceId && !description) {
      const selectedInvoice = this.pendingSalesInvoices.find(i => i.id === formValue.invoiceId);
      if (selectedInvoice) {
        description = `Settlement for ${selectedInvoice.customerName || 'customer'}${selectedInvoice.invoiceNumber ? ` - Invoice ${selectedInvoice.invoiceNumber}` : ''}`;
      }
    }

    const payload = {
      debitAccount: formValue.debitAccount,
      creditAccount: formValue.creditAccount,
      amount: parseFloat(formValue.amount),
      entryDate: entryDate,
      description: description || undefined,
      customerVendorName: formValue.customerVendorName || undefined,
      vendorTrn: formValue.vendorTrn || undefined,
      customerVendorId: formValue.vendorId || formValue.customerId || undefined,
      vatAmount: formValue.vatAmount > 0 ? parseFloat(formValue.vatAmount) : undefined,
      vatTaxType: formValue.vatTaxType || undefined,
      subAccount: formValue.subAccount || undefined,
      referenceNumber: referenceNumber || undefined,
      attachmentId: formValue.attachmentId || undefined,
      notes: formValue.notes || undefined,
    };

    const request$ = this.isEditMode
      ? this.journalEntriesService.updateEntry(this.data!.id, payload)
      : this.journalEntriesService.createEntry(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(
          `Journal entry ${this.isEditMode ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message ||
            `Failed to ${this.isEditMode ? 'update' : 'create'} journal entry`,
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
