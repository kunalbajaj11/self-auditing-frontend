import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';
import { ExpensePaymentsService, ExpenseWithOutstanding } from '../../../core/services/expense-payments.service';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { Expense } from '../../../core/models/expense.model';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-bank-transaction-form-dialog',
  templateUrl: './bank-transaction-form-dialog.component.html',
  styleUrls: ['./bank-transaction-form-dialog.component.scss'],
})
export class BankTransactionFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  // Vendor autocomplete
  vendors: Vendor[] = [];
  filteredVendors$!: Observable<Vendor[]>;
  selectedVendor: Vendor | null = null;

  // Customer autocomplete
  customers: Customer[] = [];
  filteredCustomers$!: Observable<Customer[]>;
  selectedCustomer: Customer | null = null;

  // Pending invoices for vendor
  pendingExpenseInvoices: Array<Expense & { outstandingAmount: number }> = [];
  loadingPendingExpenseInvoices = false;

  // Pending invoices for customer
  pendingSalesInvoices: SalesInvoice[] = [];
  loadingPendingSalesInvoices = false;

  readonly transactionTypes = [
    { value: 'expense', label: 'Expense Payment' },
    { value: 'sales', label: 'Sales Receipt' },
  ];

  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<BankTransactionFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly paymentsService: ExpensePaymentsService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly vendorsService: VendorsService,
    private readonly customersService: CustomersService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      type: ['expense', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      description: ['', Validators.required],
      vendorId: [''],
      vendorName: [''],
      customerId: [''],
      customerName: [''],
      expenseId: [''], // Selected expense invoice for payment
      invoiceId: [''], // Selected sales invoice for receipt
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['AED', Validators.required],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadVendors();
    this.loadCustomers();
    this.setupVendorAutocomplete();
    this.setupCustomerAutocomplete();
    
    // Update validators based on transaction type
    this.form.get('type')?.valueChanges.subscribe((type) => {
      if (type === 'expense') {
        this.form.get('vendorName')?.setValidators([Validators.required]);
        this.form.get('customerName')?.clearValidators();
        // Clear sales-related fields
        this.form.patchValue({
          customerId: '',
          customerName: '',
          invoiceId: '',
        }, { emitEvent: false });
        this.selectedCustomer = null;
        this.pendingSalesInvoices = [];
      } else if (type === 'sales') {
        this.form.get('customerName')?.setValidators([Validators.required]);
        this.form.get('vendorName')?.clearValidators();
        // Clear expense-related fields
        this.form.patchValue({
          vendorId: '',
          vendorName: '',
          expenseId: '',
        }, { emitEvent: false });
        this.selectedVendor = null;
        this.pendingExpenseInvoices = [];
      }
      this.form.get('vendorName')?.updateValueAndValidity();
      this.form.get('customerName')?.updateValueAndValidity();
    });
  }

  private loadVendors(): void {
    this.vendorsService.listVendors({ isActive: true }).subscribe({
      next: (vendors) => {
        // Ensure we're only storing vendors, not customers
        if (Array.isArray(vendors)) {
          this.vendors = vendors;
        } else {
          console.error('Invalid vendors data received:', vendors);
          this.vendors = [];
        }
      },
      error: (error) => {
        console.error('Error loading vendors:', error);
        this.vendors = [];
      },
    });
  }

  private loadCustomers(): void {
    this.customersService.listCustomers(undefined, true).subscribe({
      next: (customers) => {
        this.customers = customers;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
      },
    });
  }

  private setupVendorAutocomplete(): void {
    const initialValue = this.form.get('vendorName')?.value || '';
    this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
      startWith(initialValue),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (this.selectedVendor) {
          return of([this.selectedVendor]);
        }
        if (!search || search.length < 2) {
          // Only show vendors from the loaded list, ensure we're not showing customers
          const vendorsList = Array.isArray(this.vendors) ? this.vendors : [];
          return of(vendorsList.slice(0, 10));
        }
        // Search vendors - ensure we're getting vendors, not customers
        return this.vendorsService.searchVendors(search).pipe(
          map((vendors) => {
            // Safety check: ensure we only return vendors
            if (!Array.isArray(vendors)) {
              return [];
            }
            return vendors.slice(0, 10);
          }),
        );
      }),
    );

    // Watch for vendor selection changes
    this.form.get('vendorId')?.valueChanges.subscribe((vendorId) => {
      if (vendorId) {
        const vendor = this.vendors.find((v) => v.id === vendorId);
        if (vendor) {
          this.selectedVendor = vendor;
          this.form.patchValue({
            vendorName: vendor.name,
          }, { emitEvent: false });
        }
      } else {
        this.selectedVendor = null;
      }
    });

    // Clear vendorId when vendorName is manually changed
    this.form.get('vendorName')?.valueChanges.subscribe(() => {
      if (!this.selectedVendor && this.form.get('vendorId')?.value) {
        setTimeout(() => {
          if (!this.selectedVendor && this.form.get('vendorId')?.value) {
            this.form.patchValue({ vendorId: '' }, { emitEvent: false });
          }
        }, 100);
      }
    });
  }

  onVendorSelected(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.form.patchValue({
      vendorId: vendor.id,
      vendorName: vendor.name,
      expenseId: '', // Clear previous selection
    });
    this.loadPendingExpenseInvoices(vendor.name);
  }

  displayVendor(vendor: Vendor | string | null): string {
    if (!vendor) {
      return this.form.get('vendorName')?.value || '';
    }
    if (typeof vendor === 'string') {
      return vendor;
    }
    return vendor.name;
  }

  clearVendorSelection(): void {
    this.selectedVendor = null;
    this.pendingExpenseInvoices = [];
    this.form.patchValue({
      vendorId: '',
      vendorName: '',
      expenseId: '',
    });
  }

  loadPendingExpenseInvoices(vendorName: string): void {
    if (!vendorName) {
      this.pendingExpenseInvoices = [];
      return;
    }

    this.loadingPendingExpenseInvoices = true;
    this.paymentsService.getPendingInvoicesByVendor(vendorName).subscribe({
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

  private setupCustomerAutocomplete(): void {
    const initialValue = this.form.get('customerName')?.value || '';
    this.filteredCustomers$ = this.form.get('customerName')!.valueChanges.pipe(
      startWith(initialValue),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (this.selectedCustomer) {
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

    // Watch for customer selection changes
    this.form.get('customerId')?.valueChanges.subscribe((customerId) => {
      if (customerId) {
        const customer = this.customers.find((c) => c.id === customerId);
        if (customer) {
          this.selectedCustomer = customer;
          this.form.patchValue({
            customerName: customer.name,
          }, { emitEvent: false });
        }
      } else {
        this.selectedCustomer = null;
      }
    });

    // Clear customerId when customerName is manually changed
    this.form.get('customerName')?.valueChanges.subscribe(() => {
      if (!this.selectedCustomer && this.form.get('customerId')?.value) {
        setTimeout(() => {
          if (!this.selectedCustomer && this.form.get('customerId')?.value) {
            this.form.patchValue({ customerId: '' }, { emitEvent: false });
          }
        }, 100);
      }
    });
  }

  onCustomerSelected(customer: Customer): void {
    this.selectedCustomer = customer;
    this.form.patchValue({
      customerId: customer.id,
      customerName: customer.name,
      invoiceId: '', // Clear previous selection
    });
    // Use customer.id if available, otherwise fall back to customer.name
    const customerIdentifier = customer.id && customer.id.trim() ? customer.id : customer.name;
    this.loadPendingSalesInvoices(customerIdentifier);
  }

  displayCustomer(customer: Customer | string | null): string {
    if (!customer) {
      return this.form.get('customerName')?.value || '';
    }
    if (typeof customer === 'string') {
      return customer;
    }
    return customer.name;
  }

  clearCustomerSelection(): void {
    this.selectedCustomer = null;
    this.pendingSalesInvoices = [];
    this.form.patchValue({
      customerId: '',
      customerName: '',
      invoiceId: '',
    });
  }

  loadPendingSalesInvoices(customerIdOrName: string): void {
    if (!customerIdOrName) {
      this.pendingSalesInvoices = [];
      return;
    }

    this.loadingPendingSalesInvoices = true;
    
    // Load all invoices first, then filter client-side
    // This is more reliable than filtering by paymentStatus in API
    this.invoicesService.listInvoices({}).subscribe({
      next: (allInvoices) => {
        // Normalize names for comparison (trim and lowercase)
        const normalizeName = (name: string | null | undefined) => 
          name ? name.trim().toLowerCase() : '';
        
        // Filter by customer, payment status, and outstanding amount
        this.pendingSalesInvoices = allInvoices.filter((inv) => {
          // Normalize names for comparison
          const invoiceCustomerName = normalizeName(inv.customerName);
          const selectedCustomerName = this.selectedCustomer ? normalizeName(this.selectedCustomer.name) : '';
          const searchName = normalizeName(customerIdOrName);
          
          // Check if invoice matches the selected customer (case-insensitive)
          // Try multiple matching strategies
          let matchesCustomer = false;
          
          // Strategy 1: Match by customer ID if both invoice and selected customer have IDs
          if (inv.customerId && this.selectedCustomer?.id) {
            matchesCustomer = inv.customerId === this.selectedCustomer.id;
          }
          
          // Strategy 2: Match by customer name (case-insensitive) - this is the fallback when customerId is missing
          if (!matchesCustomer && this.selectedCustomer && selectedCustomerName) {
            matchesCustomer = invoiceCustomerName === selectedCustomerName;
          }
          
          // Strategy 3: Match by customerIdOrName as UUID if it's a UUID
          if (!matchesCustomer && customerIdOrName.length === 36 && customerIdOrName.includes('-')) {
            matchesCustomer = !!(inv.customerId && inv.customerId === customerIdOrName);
          }
          
          // Strategy 4: Fallback to name matching if customerIdOrName is not a UUID
          if (!matchesCustomer && searchName && !(customerIdOrName.length === 36 && customerIdOrName.includes('-'))) {
            matchesCustomer = invoiceCustomerName === searchName;
          }
          
          // Check payment status (case-insensitive)
          const paymentStatus = (inv.paymentStatus || '').toLowerCase();
          const isPending = paymentStatus === 'unpaid' || paymentStatus === 'partial';
          
          // Also check that there's an outstanding amount > 0.01
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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    if (formValue.type === 'expense') {
      // Create expense and then add bank payment
      this.createExpenseWithBankPayment(formValue);
    } else {
      // Create sales invoice with bank received
      this.createSalesInvoiceWithBankReceived(formValue);
    }
  }

  private createExpenseWithBankPayment(data: any): void {
    // If an expense invoice is selected, link payment to that expense
    if (data.expenseId) {
      // Create payment for existing expense
      this.paymentsService
        .createPayment({
          expenseId: data.expenseId,
          amount: data.amount,
          paymentDate: data.date,
          paymentMethod: 'bank_transfer',
          referenceNumber: data.referenceNumber || undefined,
          notes: data.notes || undefined,
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Bank payment recorded successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open(
              error?.error?.message || 'Failed to record bank payment',
              'Close',
              { duration: 4000, panelClass: ['snack-error'] },
            );
          },
        });
      return;
    }

    // Otherwise, create new expense and payment
    const expensePayload: any = {
      type: 'expense',
      amount: data.amount,
      vatAmount: 0,
      expenseDate: data.date,
      description: data.description,
      currency: data.currency,
      purchaseStatus: 'Purchase - Accruals', // Will be settled by the payment
    };

    // Add vendorId if selected, otherwise use vendorName
    if (data.vendorId) {
      expensePayload.vendorId = data.vendorId;
      if (data.vendorName) {
        expensePayload.vendorName = data.vendorName;
      }
    } else if (data.vendorName) {
      expensePayload.vendorName = data.vendorName;
    }

    this.expensesService
      .createExpense(expensePayload)
      .subscribe({
        next: (expense) => {
          // Then create the bank payment
          this.paymentsService
            .createPayment({
              expenseId: expense.id,
              amount: data.amount,
              paymentDate: data.date,
              paymentMethod: 'bank_transfer',
              referenceNumber: data.referenceNumber || undefined,
              notes: data.notes || undefined,
            })
            .subscribe({
              next: () => {
                this.loading = false;
                this.snackBar.open('Bank transaction recorded successfully', 'Close', {
                  duration: 3000,
                });
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message || 'Failed to record bank payment',
                  'Close',
                  { duration: 4000, panelClass: ['snack-error'] },
                );
              },
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to create expense',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  private createSalesInvoiceWithBankReceived(data: any): void {
    // If an invoice is selected, record payment for that invoice
    if (data.invoiceId) {
      this.invoicesService
        .recordPayment(data.invoiceId, {
          amount: data.amount,
          paymentDate: data.date,
          paymentMethod: 'bank_transfer',
          referenceNumber: data.referenceNumber || undefined,
          notes: data.notes || undefined,
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Bank receipt recorded successfully', 'Close', {
              duration: 3000,
            });
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
      return;
    }

    // Otherwise, create new invoice and payment
    const invoicePayload: any = {
        customerName: data.customerName || data.vendorName, // Use customerName for sales
        invoiceDate: data.date,
        currency: data.currency,
        description: data.description,
        notes: data.notes || `Bank Transfer - Ref: ${data.referenceNumber || 'N/A'}`,
        status: 'tax_invoice_receivable', // Use receivable status, will be marked as bank received via payment
        lineItems: [
          {
            itemName: data.description,
            quantity: 1,
            unitPrice: data.amount,
            amount: data.amount,
            vatAmount: 0,
            totalAmount: data.amount,
            vatRate: 0,
            vatTaxType: 'STANDARD',
          },
        ],
      };

    // Add customerId if selected
    if (data.customerId) {
      invoicePayload.customerId = data.customerId;
    }

    this.invoicesService
      .createInvoice(invoicePayload)
      .subscribe({
        next: (invoice) => {
          // Record payment for the invoice
          this.invoicesService
            .recordPayment(invoice.id, {
              amount: data.amount,
              paymentDate: data.date,
              paymentMethod: 'bank_transfer',
              referenceNumber: data.referenceNumber || undefined,
              notes: data.notes || undefined,
            })
            .subscribe({
              next: () => {
                this.loading = false;
                this.snackBar.open('Bank transaction recorded successfully', 'Close', {
                  duration: 3000,
                });
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
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to create invoice',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  getInvoiceOutstanding(invoice: SalesInvoice): number {
    // Handle both string and number types, with proper fallback
    const total = invoice.totalAmount 
      ? (typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : Number(invoice.totalAmount))
      : 0;
    const paid = invoice.paidAmount 
      ? (typeof invoice.paidAmount === 'string' ? parseFloat(invoice.paidAmount) : Number(invoice.paidAmount))
      : 0;
    const outstanding = total - paid;
    // Return 0 if outstanding is negative or NaN
    return isNaN(outstanding) || outstanding < 0 ? 0 : outstanding;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

