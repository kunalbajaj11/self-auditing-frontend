import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensePaymentsService, ExpenseWithOutstanding, PaymentAllocation } from '../../../core/services/expense-payments.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { Expense } from '../../../core/models/expense.model';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-payment-form-dialog',
  templateUrl: './payment-form-dialog.component.html',
  styleUrls: ['./payment-form-dialog.component.scss'],
})
export class PaymentFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  
  // Payment mode: 'single' (legacy) or 'multi' (invoice-wise)
  paymentMode: 'single' | 'multi' = 'multi';
  
  // Single expense mode (legacy)
  expensesWithOutstanding: ExpenseWithOutstanding[] = [];
  selectedExpense: ExpenseWithOutstanding | null = null;
  loadingExpenses = true;

  // Multi-invoice mode (new)
  vendors: Vendor[] = [];
  filteredVendors$!: Observable<Vendor[]>;
  selectedVendor: Vendor | null = null;
  pendingInvoices: ExpenseWithOutstanding[] = [];
  loadingInvoices = false;
  totalAllocated = 0;

  readonly paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PaymentFormDialogComponent>,
    private readonly paymentsService: ExpensePaymentsService,
    private readonly vendorsService: VendorsService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      paymentMode: ['multi'],
      // Single expense mode fields
      expenseId: [''],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      // Multi-invoice mode fields
      vendorName: [''],
      totalPaymentAmount: [0, [Validators.required, Validators.min(0.01)]],
      allocations: this.fb.array([]),
      // Common fields
      paymentDate: [new Date().toISOString().substring(0, 10), Validators.required],
      paymentMethod: ['bank_transfer'],
      referenceNumber: [''],
      notes: [''],
    }, { validators: [this.allocationValidator] });
  }

  ngOnInit(): void {
    this.setupVendorAutocomplete();
    this.loadVendors();
    
    // Watch payment mode changes
    this.form.get('paymentMode')?.valueChanges.subscribe((mode) => {
      this.paymentMode = mode;
      this.onPaymentModeChange(mode);
    });

    // Watch for vendor selection changes (multi-invoice mode)
    this.form.get('vendorName')?.valueChanges.subscribe((vendorName) => {
      if (this.paymentMode === 'multi' && vendorName) {
        this.loadPendingInvoices(vendorName);
      }
    });

    // Watch for total payment amount changes (multi-invoice mode)
    this.form.get('totalPaymentAmount')?.valueChanges.subscribe(() => {
      this.updateTotalAllocated();
    });
              
    // Watch allocation changes
    this.allocationsFormArray.valueChanges.subscribe(() => {
      this.updateTotalAllocated();
    });

    // Legacy: Load expenses for single mode
    this.loadExpensesWithOutstanding();
  }

  get allocationsFormArray(): FormArray {
    return this.form.get('allocations') as FormArray;
  }

  private setupVendorAutocomplete(): void {
    this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (this.selectedVendor) {
          return of([this.selectedVendor]);
        }
        if (!search || search.length < 2) {
          return of(this.vendors.slice(0, 10));
        }
        return this.vendorsService.listVendors({ search }).pipe(
          map((vendors) => vendors.slice(0, 10)),
        );
      }),
    );
  }

  private loadVendors(): void {
    this.vendorsService.listVendors({ isActive: true }).subscribe({
      next: (vendors) => {
        this.vendors = vendors;
            },
            error: (error) => {
        console.error('Error loading vendors:', error);
            },
          });
  }

  onVendorSelected(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.form.patchValue({
      vendorName: vendor.name,
    }, { emitEvent: false });
    this.loadPendingInvoices(vendor.name);
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
    this.pendingInvoices = [];
    this.allocationsFormArray.clear();
    this.form.patchValue({
      vendorName: '',
      totalPaymentAmount: 0,
    });
  }

  loadPendingInvoices(vendorName: string): void {
    if (!vendorName) {
      this.pendingInvoices = [];
      this.allocationsFormArray.clear();
      return;
    }

    this.loadingInvoices = true;
    this.paymentsService.getPendingInvoicesByVendor(vendorName).subscribe({
      next: (invoices) => {
        this.pendingInvoices = invoices;
        this.initializeAllocations();
        this.loadingInvoices = false;
      },
      error: (error) => {
        console.error('Error loading pending invoices:', error);
        this.snackBar.open('Failed to load pending invoices', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        this.loadingInvoices = false;
      },
    });
  }

  initializeAllocations(): void {
    // Clear existing allocations
    this.allocationsFormArray.clear();

    // Create form controls for each pending invoice
    this.pendingInvoices.forEach((invoice) => {
      const allocationGroup = this.fb.group({
        expenseId: [invoice.id],
        invoiceNumber: [invoice.invoiceNumber || 'N/A'],
        invoiceDate: [invoice.expenseDate],
        totalAmount: [invoice.totalAmount],
        outstandingAmount: [invoice.outstandingAmount],
        allocatedAmount: [0, [Validators.min(0), Validators.max(invoice.outstandingAmount)]],
        selected: [false],
      });

      // Watch for selection changes
      allocationGroup.get('selected')?.valueChanges.subscribe((selected) => {
        if (selected) {
          // Auto-fill with outstanding amount when selected
          allocationGroup.get('allocatedAmount')?.setValue(invoice.outstandingAmount, { emitEvent: false });
        } else {
          // Clear allocation when deselected
          allocationGroup.get('allocatedAmount')?.setValue(0, { emitEvent: false });
    }
        this.updateTotalAllocated();
      });

      // Watch for allocation amount changes
      allocationGroup.get('allocatedAmount')?.valueChanges.subscribe(() => {
        this.updateTotalAllocated();
      });

      this.allocationsFormArray.push(allocationGroup);
    });
  }

  updateTotalAllocated(): void {
    const allocations = this.allocationsFormArray.value;
    this.totalAllocated = allocations.reduce(
      (sum: number, alloc: any) => sum + (parseFloat(alloc.allocatedAmount) || 0),
      0,
    );
  }

  onPaymentModeChange(mode: 'single' | 'multi'): void {
    if (mode === 'single') {
      // Clear multi-invoice fields
      this.clearVendorSelection();
      this.form.get('vendorName')?.clearValidators();
      this.form.get('totalPaymentAmount')?.clearValidators();
      this.form.get('expenseId')?.setValidators(Validators.required);
    } else {
      // Clear single expense fields
      this.selectedExpense = null;
      this.form.get('expenseId')?.clearValidators();
      this.form.get('vendorName')?.setValidators(Validators.required);
      this.form.get('totalPaymentAmount')?.setValidators([Validators.required, Validators.min(0.01)]);
    }
    this.form.get('expenseId')?.updateValueAndValidity();
    this.form.get('vendorName')?.updateValueAndValidity();
    this.form.get('totalPaymentAmount')?.updateValueAndValidity();
  }

  // Legacy: Single expense mode
  loadExpensesWithOutstanding(): void {
    this.loadingExpenses = true;
    // Note: This is kept for backward compatibility but may not be fully implemented
    // as the new invoice-wise settlement is the recommended approach
    // Users can still use single expense mode if needed
    this.loadingExpenses = false;
    this.expensesWithOutstanding = []; // Empty for now, can be populated if needed
  }

  onExpenseSelected(expenseId: string): void {
    if (!expenseId) {
      this.selectedExpense = null;
      this.resetAmountField();
      return;
    }

    const expense = this.expensesWithOutstanding.find((e) => e.id === expenseId);
    if (expense) {
      this.selectedExpense = expense;
      const amount = Math.round(expense.outstandingAmount * 100) / 100;
      this.form.get('amount')?.setValue(amount, { emitEvent: false });
      this.form.get('amount')?.setValidators([
        Validators.required,
        Validators.min(0.01),
        this.maxAmountValidator(expense.outstandingAmount),
      ]);
      this.form.get('amount')?.updateValueAndValidity();
    } else {
      this.selectedExpense = null;
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

  clearExpenseSelection(): void {
    this.form.get('expenseId')?.setValue('', { emitEvent: false });
    this.selectedExpense = null;
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

    this.loading = true;
    const formValue = this.form.getRawValue();

    if (this.paymentMode === 'multi') {
      // Multi-invoice allocation mode
      const allocations: PaymentAllocation[] = this.allocationsFormArray.value
        .filter((alloc: any) => alloc.selected && alloc.allocatedAmount > 0)
        .map((alloc: any) => ({
          expenseId: alloc.expenseId,
          allocatedAmount: parseFloat(alloc.allocatedAmount),
        }));

      if (allocations.length === 0) {
        this.loading = false;
        this.snackBar.open('Please select at least one invoice and allocate an amount', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }

      const totalPaymentAmount = parseFloat(formValue.totalPaymentAmount);
      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

      if (Math.abs(totalPaymentAmount - totalAllocated) > 0.01) {
        this.loading = false;
        this.snackBar.open(
          `Total allocated amount (${totalAllocated.toFixed(2)}) must equal payment amount (${totalPaymentAmount.toFixed(2)})`,
          'Close',
          { duration: 5000, panelClass: ['snack-error'] },
        );
        return;
      }

      this.paymentsService
        .createPayment({
          amount: totalPaymentAmount,
          paymentDate: formValue.paymentDate,
          paymentMethod: formValue.paymentMethod,
          referenceNumber: formValue.referenceNumber || undefined,
          notes: formValue.notes || undefined,
          allocations,
          vendorName: formValue.vendorName,
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.snackBar.open('Payment created successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.loading = false;
            console.error('Error creating payment:', error);
            const errorMessage = error?.error?.message || error?.message || 'Failed to create payment';
            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              panelClass: ['snack-error'],
            });
          },
        });
    } else {
      // Legacy: Single expense mode
    const amount = parseFloat(formValue.amount);
    
    if (isNaN(amount) || amount <= 0) {
      this.loading = false;
      this.snackBar.open('Please enter a valid payment amount', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.paymentsService
      .createPayment({
        expenseId: formValue.expenseId,
        amount: amount,
        paymentDate: formValue.paymentDate,
        paymentMethod: formValue.paymentMethod,
        referenceNumber: formValue.referenceNumber || undefined,
        notes: formValue.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Payment created successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating payment:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to create payment';
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  // Helper methods for template
  toggleAllInvoices(checked: boolean): void {
    this.allocationsFormArray.controls.forEach((control) => {
      control.get('selected')?.setValue(checked);
    });
  }

  allInvoicesSelected(): boolean {
    return this.allocationsFormArray.controls.length > 0 &&
      this.allocationsFormArray.controls.every((control) => control.get('selected')?.value);
  }

  someInvoicesSelected(): boolean {
    const selectedCount = this.allocationsFormArray.controls.filter(
      (control) => control.get('selected')?.value
    ).length;
    return selectedCount > 0 && selectedCount < this.allocationsFormArray.controls.length;
  }

  getAllocationMismatch(): boolean {
    if (this.paymentMode !== 'multi') return false;
    const totalPaymentAmount = parseFloat(this.form.get('totalPaymentAmount')?.value || '0');
    return totalPaymentAmount > 0 && Math.abs(totalPaymentAmount - this.totalAllocated) > 0.01;
  }

  canSave(): boolean {
    if (this.paymentMode === 'multi') {
      return !!this.selectedVendor && 
             this.pendingInvoices.length > 0 && 
             !this.getAllocationMismatch() &&
             this.totalAllocated > 0;
    } else {
      return !!this.selectedExpense;
    }
  }

  // Custom validators
  private maxAmountValidator(maxAmount: number) {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }
      const value = parseFloat(control.value);
      if (isNaN(value)) {
        return null;
      }
      if (value > maxAmount + 0.01) {
        return { max: { max: maxAmount, actual: value } };
      }
      return null;
    };
  }

  private allocationValidator = (control: AbstractControl) => {
    const mode = control.get('paymentMode')?.value;
    if (mode === 'multi') {
      const totalPaymentAmount = parseFloat(control.get('totalPaymentAmount')?.value || '0');
      const allocations = control.get('allocations') as FormArray;
      const totalAllocated = allocations.value.reduce(
        (sum: number, alloc: any) => sum + (parseFloat(alloc.allocatedAmount) || 0),
        0,
      );

      if (totalPaymentAmount > 0 && Math.abs(totalPaymentAmount - totalAllocated) > 0.01) {
        return { allocationMismatch: true };
      }
    }
    return null;
  };
}
