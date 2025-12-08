import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { Expense, ExpenseType } from '../../../core/models/expense.model';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-expense-form-dialog',
  templateUrl: './expense-form-dialog.component.html',
  styleUrls: ['./expense-form-dialog.component.scss'],
})
export class ExpenseFormDialogComponent implements OnInit {
  readonly typeOptions: ExpenseType[] = [
    'expense',
    'credit',
    'adjustment',
    'advance',
    'accrual',
    'fixed_assets',
    'share_capital',
    'retained_earnings',
    'shareholder_account',
    'cost_of_sales',
  ];
  categories: Category[] = [];
  allCategories: Category[] = [];
  loading = false;

  readonly form;

  attachment?: any;
  ocrResult?: any;

  // Vendor autocomplete
  vendors: Vendor[] = [];
  filteredVendors$!: Observable<Vendor[]>; // Will be initialized in setupVendorAutocomplete()
  selectedVendor: Vendor | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ExpenseFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly categoriesService: CategoriesService,
    private readonly vendorsService: VendorsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: Expense | { attachment?: any; ocrResult?: any } | null,
  ) {
    this.form = this.fb.group({
      type: ['expense' as ExpenseType, Validators.required],
      categoryId: [''],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      vatAmount: [0, [Validators.min(0)]],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      expectedPaymentDate: [''],
      vendorId: [''], // Vendor ID from vendor master
      vendorName: [''],
      vendorTrn: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    // Load all categories initially
    this.categoriesService.listCategories().subscribe((categories) => {
      this.allCategories = categories;
      this.filterCategoriesByType();
    });

    // Load vendors for autocomplete
    this.loadVendors();

    // Setup vendor autocomplete
    this.setupVendorAutocomplete();

    // Watch for expense type changes to filter categories
    this.form.get('type')?.valueChanges.subscribe(() => {
      this.filterCategoriesByType();
      // Clear category if it's no longer valid for the selected type
      const currentCategoryId = this.form.get('categoryId')?.value;
      if (currentCategoryId) {
        setTimeout(() => {
          const currentCategory = this.categories.find(c => c.id === currentCategoryId);
          if (!currentCategory) {
            this.form.patchValue({ categoryId: '' });
          }
        }, 100);
      }
    });

    // Handle different data types
    if (this.data) {
      if ('id' in this.data) {
        // Editing existing expense
        const expense = this.data as Expense;
        this.form.patchValue({
          type: expense.type,
          categoryId: expense.categoryId ?? '',
          amount: expense.amount,
          vatAmount: expense.vatAmount,
          expenseDate: expense.expenseDate,
          expectedPaymentDate: expense.expectedPaymentDate ?? '',
          vendorId: (expense as any).vendorId ?? '',
          vendorName: expense.vendorName ?? '',
          vendorTrn: expense.vendorTrn ?? '',
          description: expense.description ?? '',
        });
        // Filter categories after setting the type
        setTimeout(() => this.filterCategoriesByType(), 0);
      } else {
        // New expense with attachment or OCR
        const data = this.data as { attachment?: any; ocrResult?: any };
        this.attachment = data.attachment;
        this.ocrResult = data.ocrResult;

        if (this.ocrResult) {
          console.log('[ExpenseForm] OCR Result received:', this.ocrResult);
          
          // Convert OCR values to proper types with robust parsing
          const ocrAmount = this.ocrResult.amount;
          const ocrVatAmount = this.ocrResult.vatAmount;
          
          // Robust amount parsing - handles currency symbols, commas, etc.
          const amount = this.parseAmount(ocrAmount);
          const vatAmount = this.parseAmount(ocrVatAmount);
          
          // Format date properly (YYYY-MM-DD) with validation
          const expenseDate = this.parseDate(this.ocrResult.expenseDate);
          
          console.log('[ExpenseForm] Parsed OCR values:', {
            amount,
            vatAmount,
            expenseDate,
            vendorName: this.ocrResult.vendorName,
            vendorTrn: this.ocrResult.vendorTrn,
          });
          
          // Pre-fill form with OCR data
          this.form.patchValue({
            categoryId: this.ocrResult.suggestedCategoryId || '',
            vendorName: this.ocrResult.vendorName || '',
            vendorTrn: this.ocrResult.vendorTrn || '',
            amount: amount,
            vatAmount: vatAmount,
            expenseDate: expenseDate,
            description: this.ocrResult.description || '',
          });
          
          // Trigger validation after OCR population
          this.form.markAllAsTouched();
          
          // Vendor matching will happen in loadVendors() callback
          // Don't try to match here as vendors might not be loaded yet
        }
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Show specific validation errors
      const amountControl = this.form.get('amount');
      if (amountControl?.hasError('required') || (amountControl?.value !== null && amountControl?.value !== undefined && amountControl.value <= 0)) {
        this.snackBar.open('Please enter a valid amount greater than 0', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      }
      if (this.form.get('expenseDate')?.hasError('required')) {
        this.snackBar.open('Please select an expense date', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      }
      return;
    }
    const value = this.form.getRawValue();
    const type = (value.type as ExpenseType) ?? 'expense';
    
    // Validate accrual type
    if (type === 'accrual' && !value.expectedPaymentDate) {
      this.snackBar.open(
        'Accrual expenses require an expected payment date.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }
    
    // Validate amount
    const amount = Number(value.amount ?? 0);
    if (amount <= 0) {
      this.snackBar.open('Amount must be greater than 0', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }
    
    this.loading = true;
    
    // Prepare attachments if file was uploaded
    // Include fileKey if available for proper backend linking
    const attachments = this.attachment ? [{
      fileName: this.attachment.fileName,
      fileUrl: this.attachment.fileUrl,
      fileType: this.attachment.fileType,
      fileSize: this.attachment.fileSize,
      ...(this.attachment.fileKey && { fileKey: this.attachment.fileKey }), // Include fileKey if available
    }] : undefined;

    // Prepare expense payload
    const expensePayload: any = {
      type,
      categoryId: value.categoryId || undefined,
      amount: amount,
      vatAmount: Number(value.vatAmount ?? 0),
      expenseDate: value.expenseDate ?? new Date().toISOString().substring(0, 10),
      expectedPaymentDate: value.expectedPaymentDate || undefined,
      description: value.description || undefined,
      attachments,
    };

    // Add vendorId if selected, otherwise use vendorName
    if (value.vendorId) {
      expensePayload.vendorId = value.vendorId;
      // Still send vendorName as fallback
      if (value.vendorName) {
        expensePayload.vendorName = value.vendorName;
      }
    } else if (value.vendorName) {
      expensePayload.vendorName = value.vendorName;
    }

    // Add vendorTrn if provided
    if (value.vendorTrn) {
      expensePayload.vendorTrn = value.vendorTrn;
    }

    // Add OCR-related fields if OCR result is available
    if (this.ocrResult) {
      // Set expense source to OCR if created from OCR
      expensePayload.source = 'ocr';
      
      // Add OCR confidence if available
      if (this.ocrResult.confidence) {
        expensePayload.ocrConfidence = this.ocrResult.confidence;
      }
    } else {
      // If no OCR result, source defaults to 'manual' (backend will handle this)
      // But we can explicitly set it for clarity
      expensePayload.source = 'manual';
    }

    console.log('[ExpenseForm] Submitting expense:', expensePayload);

    this.expensesService
      .createExpense(expensePayload)
      .subscribe({
        next: (expense) => {
          this.loading = false;
          console.log('[ExpenseForm] Expense created successfully:', expense);
          const message = this.getTransactionTypeMessage(type);
          this.snackBar.open(message, 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(expense);
        },
        error: (error) => {
          this.loading = false;
          console.error('[ExpenseForm] Error creating expense:', error);
          
          // Provide specific error messages
          let errorMessage = 'Failed to record expense. Please review the details.';
          
          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.error?.duplicates) {
            errorMessage = 'Duplicate expense detected. Please check if this expense already exists.';
          } else if (error?.status === 404) {
            errorMessage = 'Category or vendor not found. Please check your selections.';
          } else if (error?.status === 400) {
            errorMessage = 'Invalid data provided. Please check all fields.';
          } else if (error?.status === 409) {
            errorMessage = 'Duplicate expense detected. This expense may already exist.';
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  isEditMode(): boolean {
    return this.data !== null && this.data !== undefined && 'id' in this.data;
  }

  filterCategoriesByType(): void {
    const selectedType = this.form.get('type')?.value;
    
    if (!selectedType) {
      this.categories = this.allCategories;
      return;
    }

    // For fixed_assets and cost_of_sales, show only relevant categories
    if (selectedType === 'fixed_assets' || selectedType === 'cost_of_sales') {
      this.categoriesService.listCategories(selectedType).subscribe((filteredCategories) => {
        this.categories = filteredCategories;
        // Clear category selection if current category is not in filtered list
        const currentCategoryId = this.form.get('categoryId')?.value;
        if (currentCategoryId && !filteredCategories.find(c => c.id === currentCategoryId)) {
          this.form.patchValue({ categoryId: '' });
        }
      });
    } else {
      // For other types, show all categories (general + any specific ones)
      this.categories = this.allCategories;
    }
  }

  private getTransactionTypeMessage(type: ExpenseType): string {
    const messages: Record<ExpenseType, string> = {
      expense: 'Expense recorded successfully',
      credit: 'Sale recorded successfully',
      adjustment: 'Adjustment recorded successfully',
      advance: 'Advance recorded successfully',
      accrual: 'Accrual recorded successfully',
      fixed_assets: 'Fixed asset recorded successfully',
      share_capital: 'Share capital recorded successfully',
      retained_earnings: 'Retained earnings recorded successfully',
      shareholder_account: 'Shareholder account recorded successfully',
      cost_of_sales: 'Cost of sales recorded successfully',
    };
    return messages[type] || 'Transaction recorded successfully';
  }

  private loadVendors(): void {
    this.vendorsService.listVendors({ isActive: true }).subscribe({
      next: (vendors) => {
        this.vendors = vendors;
        console.log('[ExpenseForm] Vendors loaded:', vendors.length);
        
        // If OCR result has vendor name, try to match after vendors are loaded
        // This ensures vendors are available before matching
        if (this.ocrResult?.vendorName) {
          if (vendors.length > 0) {
            // Vendors loaded, match immediately
            setTimeout(() => {
              this.matchVendorFromOcr(this.ocrResult.vendorName);
            }, 100);
          } else {
            // No vendors in master, but OCR found vendor name
            console.log('[ExpenseForm] No vendors in master, OCR vendor name will be used as-is');
          }
        }
      },
      error: (error) => {
        console.error('[ExpenseForm] Error loading vendors:', error);
        // Even if vendors fail to load, still try to match via API search
        if (this.ocrResult?.vendorName) {
          setTimeout(() => {
            this.matchVendorFromOcr(this.ocrResult.vendorName);
          }, 500);
        }
      },
    });
  }

  private setupVendorAutocomplete(): void {
    // Setup filtered vendors observable for autocomplete
    this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        // If vendor is already selected, don't filter
        if (this.selectedVendor) {
          return of([this.selectedVendor]);
        }
        
        if (!search || search.length < 2) {
          return of(this.vendors.slice(0, 10)); // Show first 10 vendors
        }
        // Search vendors
        return this.vendorsService.searchVendors(search).pipe(
          map((vendors) => vendors.slice(0, 10)), // Limit to 10 results
        );
      }),
    );

    // Watch for vendor selection changes
    this.form.get('vendorId')?.valueChanges.subscribe((vendorId) => {
      if (vendorId) {
        const vendor = this.vendors.find((v) => v.id === vendorId);
        if (vendor) {
          this.selectedVendor = vendor;
          // Auto-populate vendor name and TRN
          this.form.patchValue({
            vendorName: vendor.name,
            vendorTrn: vendor.vendorTrn || '',
          }, { emitEvent: false });
        }
      } else {
        this.selectedVendor = null;
      }
    });

    // Clear vendorId when vendorName is manually changed (not from selection)
    this.form.get('vendorName')?.valueChanges.subscribe(() => {
      // Only clear if user is typing (not when we programmatically set it)
      if (!this.selectedVendor && this.form.get('vendorId')?.value) {
        this.form.patchValue({ vendorId: '' }, { emitEvent: false });
      }
    });
  }

  onVendorSelected(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.form.patchValue({
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorTrn: vendor.vendorTrn || '',
    });
  }

  displayVendor(vendor: Vendor | null): string {
    return vendor ? vendor.name : '';
  }

  clearVendorSelection(): void {
    this.selectedVendor = null;
    this.form.patchValue({
      vendorId: '',
      vendorName: '',
      vendorTrn: '',
    });
  }

  private matchVendorFromOcr(vendorName: string): void {
    if (!vendorName || vendorName.trim().length === 0) {
      return;
    }
    
    const searchName = vendorName.trim().toLowerCase();
    
    // Try exact match first
    let matchedVendor = this.vendors.find(
      (v) => v.name.toLowerCase() === searchName
    );
    
    // Try partial match
    if (!matchedVendor) {
      matchedVendor = this.vendors.find(
        (v) => v.name.toLowerCase().includes(searchName) || 
               searchName.includes(v.name.toLowerCase())
      );
    }
    
    // Try searching via API if not found locally
    if (!matchedVendor) {
      this.vendorsService.searchVendors(vendorName).subscribe({
        next: (vendors) => {
          if (vendors && vendors.length > 0) {
            const vendor = vendors[0]; // Use first match
            this.onVendorSelected(vendor);
            console.log('[ExpenseForm] Matched vendor from OCR (API):', vendor.name);
            // Show success message
            this.snackBar.open(`Matched vendor: ${vendor.name}`, 'Close', {
              duration: 3000,
            });
          } else {
            console.log('[ExpenseForm] No vendor match found for OCR vendor:', vendorName);
            // Show info that vendor will be created as new
            this.snackBar.open(`Vendor "${vendorName}" not found in master. Will create new entry.`, 'Close', {
              duration: 4000,
            });
          }
        },
        error: (error) => {
          console.error('[ExpenseForm] Error searching vendors:', error);
        },
      });
    } else {
      // Found match locally
      this.onVendorSelected(matchedVendor);
      console.log('[ExpenseForm] Matched vendor from OCR (local):', matchedVendor.name);
      // Show success message
      this.snackBar.open(`Matched vendor: ${matchedVendor.name}`, 'Close', {
        duration: 3000,
      });
    }
  }

  /**
   * Parse amount from OCR result - handles currency symbols, commas, etc.
   */
  private parseAmount(value: any): number {
    if (typeof value === 'number') {
      return isNaN(value) || value < 0 ? 0 : value;
    }
    
    if (typeof value !== 'string' || !value) {
      return 0;
    }
    
    // Remove currency symbols and common text
    let cleaned = value
      .replace(/AED|USD|EUR|GBP|\$|€|£|₹/gi, '') // Remove currency symbols
      .replace(/,/g, '') // Remove thousand separators
      .trim();
    
    // Try to parse
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed) || parsed < 0) {
      return 0;
    }
    
    // Validate reasonable range (0 to 10 million)
    if (parsed > 10000000) {
      console.warn('[ExpenseForm] Amount seems unreasonably large:', parsed);
      return 0;
    }
    
    return parsed;
  }

  /**
   * Parse date from OCR result - handles various formats
   */
  private parseDate(dateValue: any): string {
    // Default to today
    const defaultDate = new Date().toISOString().substring(0, 10);
    
    if (!dateValue) {
      return defaultDate;
    }
    
    try {
      const date = new Date(dateValue);
      
      // Validate date is valid
      if (isNaN(date.getTime())) {
        console.warn('[ExpenseForm] Invalid date from OCR:', dateValue);
        return defaultDate;
      }
      
      // Validate date is not too far in future (max 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (date > oneYearFromNow) {
        console.warn('[ExpenseForm] Date is too far in future:', dateValue);
        return defaultDate;
      }
      
      // Validate date is not too old (max 10 years)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      if (date < tenYearsAgo) {
        console.warn('[ExpenseForm] Date is too old:', dateValue);
        return defaultDate;
      }
      
      return date.toISOString().substring(0, 10);
    } catch (e) {
      console.warn('[ExpenseForm] Error parsing date from OCR:', dateValue, e);
      return defaultDate;
    }
  }
}

