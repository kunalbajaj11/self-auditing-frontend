import { Component, Inject, OnInit, AfterViewInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SUPPORTED_ORG_CURRENCIES } from '../../../core/constants/supported-currencies';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

@Component({
  selector: 'app-debit-note-form-dialog',
  templateUrl: './debit-note-form-dialog.component.html',
  styleUrls: ['./debit-note-form-dialog.component.scss'],
})
export class DebitNoteFormDialogComponent implements OnInit, AfterViewInit {
  readonly orgContext = inject(OrganizationContextService);

  form: FormGroup;
  loading = false;
  vendors: Vendor[] = [];
  expenses: Expense[] = [];
  loadingVendors = false;
  loadingExpenses = false;
  selectedExpense: Expense | null = null;

  readonly debitNoteReasons = [
    { value: 'return', label: 'Return' },
    { value: 'refund', label: 'Refund' },
    { value: 'correction', label: 'Correction' },
    { value: 'discount', label: 'Discount' },
    { value: 'other', label: 'Other' },
  ];

  readonly debitNoteStatuses = ['draft', 'issued', 'cancelled'];
  readonly currencies = [...SUPPORTED_ORG_CURRENCIES];

  get totalAmount(): number {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const vatAmount = parseFloat(this.form.get('vatAmount')?.value || '0');
    return amount + vatAmount;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DebitNoteFormDialogComponent>,
    private readonly debitNotesService: DebitNotesService,
    private readonly vendorsService: VendorsService,
    private readonly expensesService: ExpensesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DebitNote | null,
  ) {
    this.form = this.fb.group({
      expenseId: [null],
      vendorId: [''],
      vendorName: [''],
      vendorTrn: [''],
      debitNoteDate: [new Date().toISOString().substring(0, 10), Validators.required],
      reason: ['return', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      vatAmount: [0, [Validators.min(0)]],
      currency: [this.orgContext.currency()],
      status: ['draft'],
      description: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadVendors();
    this.loadExpenses();
    
    if (this.data) {
      this.loadDebitNoteData();
    }
  }

  ngAfterViewInit(): void {
    // Ensure expenseId field is not focused/highlighted when dialog opens
    setTimeout(() => {
      const expenseIdControl = this.form.get('expenseId');
      if (expenseIdControl && expenseIdControl.value === null) {
        // Blur any focused elements to prevent highlighting
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    }, 100);
  }

  loadVendors(): void {
    this.loadingVendors = true;
    this.vendorsService.listVendors().subscribe({
      next: (vendors) => {
        this.loadingVendors = false;
        this.vendors = vendors;
      },
      error: () => {
        this.loadingVendors = false;
      },
    });
  }

  loadExpenses(): void {
    this.loadingExpenses = true;
    this.expensesService.listExpenses().subscribe({
      next: (expenses) => {
        this.loadingExpenses = false;
        this.expenses = expenses;
      },
      error: () => {
        this.loadingExpenses = false;
      },
    });
  }

  loadDebitNoteData(): void {
    if (!this.data) return;

    const debitNote = this.data as any;

    // Resolve vendorId from either flat field or nested relation
    const vendorId = debitNote.vendorId || debitNote.vendor?.id;
    if (vendorId) {
      this.vendorsService.getVendor(vendorId).subscribe({
        next: (vendor) => {
          this.form.patchValue({
            vendorId: vendor.id,
            vendorName: vendor.name,
            vendorTrn: vendor.vendorTrn || '',
          });
        },
        error: () => {
          // Fallback to debit note data
          this.form.patchValue({
            vendorId: vendorId,
            vendorName: debitNote.vendorName || debitNote.vendor?.name || '',
            vendorTrn: debitNote.vendorTrn || debitNote.vendor?.vendorTrn || '',
          });
        },
      });
    } else {
      // No vendorId, but might have vendor name/TRN from flat fields
      this.form.patchValue({
        vendorName: debitNote.vendorName || '',
        vendorTrn: debitNote.vendorTrn || '',
      });
    }

    // Resolve expenseId from either flat field or nested relation
    const expenseId = debitNote.expenseId || debitNote.expense?.id;
    if (expenseId) {
      this.expensesService.getExpense(expenseId).subscribe({
        next: (expense) => {
          this.selectedExpense = expense;
          this.form.patchValue({
            expenseId: expense.id,
            vendorId: expense.vendorId || vendorId || '',
            vendorName: expense.vendorName || debitNote.vendorName || '',
            vendorTrn: expense.vendorTrn || debitNote.vendorTrn || '',
            currency: expense.currency || debitNote.currency || this.orgContext.currency(),
          });
        },
        error: () => {
          // Fallback to debit note data
          this.form.patchValue({
            expenseId: expenseId,
            currency: debitNote.expense?.currency || debitNote.currency || this.orgContext.currency(),
          });
        },
      });
    }

    this.form.patchValue({
      debitNoteDate: debitNote.debitNoteDate,
      reason: debitNote.reason,
      amount: parseFloat(debitNote.amount || '0'),
      vatAmount: parseFloat(debitNote.vatAmount || '0'),
      currency: debitNote.currency || this.orgContext.currency(),
      status: debitNote.status,
      description: debitNote.description || '',
      notes: debitNote.notes || '',
    });
  }

  onExpenseChange(expenseId: string): void {
    const expense = this.expenses.find((exp) => exp.id === expenseId);
    if (expense) {
      this.selectedExpense = expense;
      
      // Expense amounts are already numbers
      const expenseAmount = expense.amount || 0;
      const expenseVatAmount = expense.vatAmount || 0;
      
      // Only populate if creating a new debit note (not editing)
      const isNewDebitNote = !this.data;
      
      this.form.patchValue({
        vendorId: expense.vendorId || '',
        vendorName: expense.vendorName || '',
        vendorTrn: expense.vendorTrn || '',
        currency: expense.currency || this.orgContext.currency(),
        // Populate amount and VAT if creating new debit note
        ...(isNewDebitNote && {
          amount: expenseAmount > 0 ? expenseAmount : 0,
          vatAmount: expenseVatAmount > 0 ? expenseVatAmount : 0,
          description: expense.description || '',
        }),
      });
    }
  }

  onVendorChange(vendorId: string): void {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (vendor) {
      this.form.patchValue({
        vendorName: vendor.name,
        vendorTrn: vendor.vendorTrn || '',
        currency: vendor.preferredCurrency || this.orgContext.currency(),
      });
    }
  }

  calculateVat(): void {
    const amount = parseFloat(this.form.get('amount')?.value || '0');
    const currency = this.form.get('currency')?.value || this.orgContext.currency();

    // Default VAT/GST when empty (5% GCC; 18% India typical standard)
    const defaultRate = this.orgContext.isIndia() ? 0.18 : 0.05;
    if (
      (currency === 'AED' || currency === 'INR') &&
      parseFloat(this.form.get('vatAmount')?.value || '0') === 0 &&
      amount > 0
    ) {
      const defaultVat = amount * defaultRate;
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
    const desiredStatus = formValue.status || 'draft';
    const originalStatus = this.data?.status;

    // Prepare payload without status (backend creates as DRAFT by default)
    const payload: any = {
      expenseId: formValue.expenseId || undefined,
      vendorId: formValue.vendorId || undefined,
      vendorName: formValue.vendorName || undefined,
      vendorTrn: formValue.vendorTrn || undefined,
      debitNoteDate: formValue.debitNoteDate,
      reason: formValue.reason,
      amount: parseFloat(formValue.amount),
      vatAmount: parseFloat(formValue.vatAmount || '0'),
      currency: formValue.currency || this.orgContext.currency(),
      description: formValue.description || undefined,
      notes: formValue.notes || undefined,
    };

    // Clean up empty strings
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    if (this.data) {
      // Updating existing debit note
      // First update general fields
      this.debitNotesService.updateDebitNote(this.data.id, payload).subscribe({
        next: () => {
          // If status changed, update it separately
          if (desiredStatus !== originalStatus && this.data) {
            this.debitNotesService.updateDebitNoteStatus(this.data.id, desiredStatus).subscribe({
              next: () => {
                this.loading = false;
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message || 'Failed to update debit note status',
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
            error?.error?.message || 'Failed to update debit note',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
    } else {
      // Creating new debit note
      this.debitNotesService.createDebitNote(payload).subscribe({
        next: (created) => {
          // Backend creates as DRAFT by default. If user selected a different status, update it.
          if (desiredStatus !== 'draft') {
            this.debitNotesService.updateDebitNoteStatus(created.id, desiredStatus).subscribe({
              next: () => {
                this.loading = false;
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message || 'Failed to update debit note status',
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
            error?.error?.message || 'Failed to create debit note',
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

