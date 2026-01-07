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
    // Load vendors first, then set up autocomplete
    this.loadVendors();
    this.setupVendorAutocomplete();
    
    // Initialize payment mode (default is 'multi')
    // This ensures amount field is disabled/cleared for multi mode
    this.onPaymentModeChange(this.paymentMode);
    
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
        // Re-setup autocomplete after vendors are loaded to ensure it has the vendor list
        this.setupVendorAutocomplete();
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
        // Trigger form validation after a short delay to ensure values are updated
        setTimeout(() => {
          this.form.updateValueAndValidity({ emitEvent: false });
        }, 0);
      });

      // Watch for allocation amount changes
      allocationGroup.get('allocatedAmount')?.valueChanges.subscribe(() => {
        this.updateTotalAllocated();
        // Trigger form validation after a short delay to ensure values are updated
        setTimeout(() => {
          this.form.updateValueAndValidity({ emitEvent: false });
        }, 0);
      });

      this.allocationsFormArray.push(allocationGroup);
    });
  }

  updateTotalAllocated(): void {
    const allocations = this.allocationsFormArray.value;
    this.totalAllocated = allocations
      .filter((alloc: any) => alloc.selected) // Only count selected invoices
      .reduce(
        (sum: number, alloc: any) => sum + (parseFloat(alloc.allocatedAmount) || 0),
        0,
      );
    // Trigger form validation update
    this.form.updateValueAndValidity();
  }

  onPaymentModeChange(mode: 'single' | 'multi'): void {
    if (mode === 'single') {
      // Clear multi-invoice fields
      this.clearVendorSelection();
      this.form.get('vendorName')?.clearValidators();
      this.form.get('totalPaymentAmount')?.clearValidators();
      this.form.get('totalPaymentAmount')?.setValue(0, { emitEvent: false });
      this.form.get('expenseId')?.setValidators(Validators.required);
      // Enable amount field for single mode
      this.form.get('amount')?.setValidators([Validators.required, Validators.min(0.01)]);
      this.form.get('amount')?.enable();
    } else {
      // Clear single expense fields
      this.selectedExpense = null;
      this.form.get('expenseId')?.clearValidators();
      this.form.get('expenseId')?.setValue('', { emitEvent: false });
      this.form.get('vendorName')?.setValidators(Validators.required);
      this.form.get('totalPaymentAmount')?.setValidators([Validators.required, Validators.min(0.01)]);
      // Disable/clear amount field for multi mode (not used)
      this.form.get('amount')?.clearValidators();
      this.form.get('amount')?.setValue(0, { emitEvent: false });
      this.form.get('amount')?.disable();
    }
    this.form.get('expenseId')?.updateValueAndValidity();
    this.form.get('vendorName')?.updateValueAndValidity();
    this.form.get('totalPaymentAmount')?.updateValueAndValidity();
    this.form.get('amount')?.updateValueAndValidity();
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
    
    if (!this.canSave()) {
      if (this.paymentMode === 'multi') {
        if (!this.selectedVendor) {
          this.snackBar.open('Please select a supplier/vendor', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
        if (this.pendingInvoices.length === 0) {
          this.snackBar.open('No pending invoices found for this supplier', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
        if (this.totalAllocated === 0) {
          this.snackBar.open('Please select invoices and allocate amounts', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
        if (this.getAllocationMismatch()) {
          this.snackBar.open('Total allocated amount must equal payment amount', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
      } else {
        if (!this.selectedExpense) {
          this.snackBar.open('Please select an expense', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
      }
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

      // Ensure payment date is in correct format (YYYY-MM-DD)
      let paymentDate = formValue.paymentDate;
      if (paymentDate instanceof Date) {
        paymentDate = paymentDate.toISOString().substring(0, 10);
      } else if (typeof paymentDate === 'string' && paymentDate.includes('/')) {
        // Convert from MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
        const dateParts = paymentDate.split('/');
        if (dateParts.length === 3) {
          // Assume format is MM/DD/YYYY (US format) or DD/MM/YYYY
          // Try to parse intelligently
          const year = dateParts[2];
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          paymentDate = `${year}-${month}-${day}`;
        }
      }

      this.paymentsService
        .createPayment({
          amount: totalPaymentAmount,
          paymentDate: paymentDate,
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

      // Ensure payment date is in correct format (YYYY-MM-DD)
      let paymentDate = formValue.paymentDate;
      if (paymentDate instanceof Date) {
        paymentDate = paymentDate.toISOString().substring(0, 10);
      } else if (typeof paymentDate === 'string' && paymentDate.includes('/')) {
        // Convert from MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
        const dateParts = paymentDate.split('/');
        if (dateParts.length === 3) {
          const year = dateParts[2];
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          paymentDate = `${year}-${month}-${day}`;
        }
      }

    this.paymentsService
      .createPayment({
        expenseId: formValue.expenseId,
        amount: amount,
        paymentDate: paymentDate,
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
      // Check if vendor is selected OR vendor name is filled (for manual entry)
      const hasVendor = !!this.selectedVendor || !!(this.form.get('vendorName')?.value?.trim());
      return hasVendor && 
             this.pendingInvoices.length > 0 && 
             !this.getAllocationMismatch() &&
             this.totalAllocated > 0;
    } else {
      return !!this.selectedExpense;
    }
  }

  getDisabledReason(): string {
    if (this.loading) {
      return 'Processing...';
    }
    
    // First check canSave conditions (these are the most common reasons)
    if (!this.canSave()) {
      return this.getCanSaveReason();
    }
    
    // Check form-level errors (like allocation mismatch)
    if (this.form.errors) {
      if (this.form.errors['allocationMismatch']) {
        const totalPaymentAmount = parseFloat(this.form.get('totalPaymentAmount')?.value || '0');
        const calculatedTotal = this.totalAllocated;
        return `Total allocated (${calculatedTotal.toFixed(2)}) must equal payment amount (${totalPaymentAmount.toFixed(2)})`;
      }
      // Return first form-level error
      const errorKeys = Object.keys(this.form.errors);
      if (errorKeys.length > 0) {
        return `Form validation error: ${errorKeys[0]}`;
      }
    }
    
    // Check individual field errors (check even if not touched to show what's missing)
    if (this.form.invalid) {
      const errors: string[] = [];
      
      // Check payment date (always required)
      const paymentDateControl = this.form.get('paymentDate');
      if (paymentDateControl && (paymentDateControl.invalid || !paymentDateControl.value)) {
        if (paymentDateControl.errors?.['required'] || !paymentDateControl.value) {
          errors.push('Payment date is required');
        }
      }
      
      // Check payment mode specific fields
      if (this.paymentMode === 'multi') {
        const vendorNameControl = this.form.get('vendorName');
        if (vendorNameControl && (vendorNameControl.invalid || !vendorNameControl.value)) {
          if (vendorNameControl.errors?.['required'] || !vendorNameControl.value) {
            errors.push('Supplier/vendor is required');
          }
        }
        
        const totalPaymentAmountControl = this.form.get('totalPaymentAmount');
        if (totalPaymentAmountControl && (totalPaymentAmountControl.invalid || !totalPaymentAmountControl.value || totalPaymentAmountControl.value === 0)) {
          if (totalPaymentAmountControl.errors?.['required'] || !totalPaymentAmountControl.value || totalPaymentAmountControl.value === 0) {
            errors.push('Total payment amount is required');
          } else if (totalPaymentAmountControl.errors?.['min']) {
            errors.push('Total payment amount must be greater than 0');
          }
        }
        
        // Check allocations
        const allocationsArray = this.allocationsFormArray;
        if (allocationsArray && allocationsArray.length > 0) {
          allocationsArray.controls.forEach((control, index) => {
            const allocatedAmountControl = control.get('allocatedAmount');
            if (allocatedAmountControl && allocatedAmountControl.invalid) {
              if (allocatedAmountControl.errors?.['max']) {
                errors.push(`Allocation ${index + 1} exceeds outstanding amount`);
              }
            }
          });
        }
      } else {
        // Single expense mode
        const expenseIdControl = this.form.get('expenseId');
        if (expenseIdControl && (expenseIdControl.invalid || !expenseIdControl.value)) {
          if (expenseIdControl.errors?.['required'] || !expenseIdControl.value) {
            errors.push('Expense selection is required');
          }
        }
        
        const amountControl = this.form.get('amount');
        if (amountControl && (amountControl.invalid || !amountControl.value || amountControl.value === 0)) {
          if (amountControl.errors?.['required'] || !amountControl.value || amountControl.value === 0) {
            errors.push('Payment amount is required');
          } else if (amountControl.errors?.['min']) {
            errors.push('Payment amount must be greater than 0');
          } else if (amountControl.errors?.['max']) {
            errors.push('Payment amount exceeds outstanding balance');
          }
        }
      }
      
      if (errors.length > 0) {
        return errors.join('. ');
      }
    }
    
    return 'Please check all fields are filled correctly';
  }

  private getCanSaveReason(): string {
    if (this.paymentMode === 'multi') {
      // Check if vendor is selected OR vendor name is filled
      const hasVendor = !!this.selectedVendor || !!(this.form.get('vendorName')?.value?.trim());
      if (!hasVendor) {
        return 'Please select or enter a supplier/vendor name';
      }
      if (this.pendingInvoices.length === 0) {
        return 'No pending invoices found for this supplier';
      }
      if (this.totalAllocated === 0) {
        // Check if any invoices are selected
        const hasSelectedInvoices = this.allocationsFormArray.controls.some(
          control => control.get('selected')?.value === true
        );
        if (!hasSelectedInvoices) {
          return 'Please select at least one invoice';
        }
        return 'Please allocate amounts to selected invoices';
      }
      if (this.getAllocationMismatch()) {
        const totalPaymentAmount = parseFloat(this.form.get('totalPaymentAmount')?.value || '0');
        return `Total allocated (${this.totalAllocated.toFixed(2)}) must equal payment amount (${totalPaymentAmount.toFixed(2)})`;
      }
    } else {
      if (!this.selectedExpense) {
        return 'Please select an expense';
      }
    }
    return 'Please complete all required fields';
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
      
      // Only count selected allocations (same logic as updateTotalAllocated)
      const totalAllocated = allocations.value
        .filter((alloc: any) => alloc.selected) // Only count selected invoices
        .reduce(
          (sum: number, alloc: any) => sum + (parseFloat(alloc.allocatedAmount) || 0),
          0,
        );

      // Only validate if total payment amount is set and there are selected allocations
      if (totalPaymentAmount > 0) {
        const hasSelectedAllocations = allocations.value.some((alloc: any) => alloc.selected);
        if (hasSelectedAllocations && Math.abs(totalPaymentAmount - totalAllocated) > 0.01) {
          return { allocationMismatch: true };
        }
      }
    }
    return null;
  };
}
