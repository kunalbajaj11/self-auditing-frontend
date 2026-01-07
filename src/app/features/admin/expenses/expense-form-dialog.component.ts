import { Component, Inject, OnInit, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { ExpensesService } from '../../../core/services/expenses.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { SettingsService, TaxSettings } from '../../../core/services/settings.service';
import { ExpenseTypesService, ExpenseType as ExpenseTypeEntity } from '../../../core/services/expense-types.service';
import { ProductsService, Product } from '../../../core/services/products.service';
import { Expense, ExpenseType, VatTaxType, PurchaseLineItem } from '../../../core/models/expense.model';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-expense-form-dialog',
  templateUrl: './expense-form-dialog.component.html',
  styleUrls: ['./expense-form-dialog.component.scss'],
})
export class ExpenseFormDialogComponent implements OnInit {
  expenseTypes: ExpenseTypeEntity[] = [];
  categories: Category[] = [];
  allCategories: Category[] = [];
  loading = false;

  readonly form;

  attachment?: any;
  ocrResult?: any;

  // Entry mode: 'single' or 'itemwise'
  entryMode: 'single' | 'itemwise' = 'single';

  // Vendor autocomplete
  vendors: Vendor[] = [];
  filteredVendors$!: Observable<Vendor[]>; // Will be initialized in setupVendorAutocomplete()
  selectedVendor: Vendor | null = null;

  // Products for line items
  products: Product[] = [];
  filteredProducts$: Observable<Product[]>[] = []; // Array of observables for each line item
  
  @ViewChildren(MatAutocomplete) productAutocompletes!: QueryList<MatAutocomplete>;

  // Tax settings
  taxSettings: TaxSettings | null = null;
  defaultTaxRate = 5;
  taxCalculationMethod: 'inclusive' | 'exclusive' = 'exclusive';
  reverseChargeRate = 5;
  reverseChargeEnabled = false;
  
  // Track if VAT was manually entered by user
  private vatManuallyEntered = false;
  
  // VAT tax type options
  readonly vatTaxTypes: { value: VatTaxType; label: string }[] = [
    { value: 'standard', label: 'Standard Rate' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
    { value: 'reverse_charge', label: 'Reverse Charge' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ExpenseFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly categoriesService: CategoriesService,
    private readonly vendorsService: VendorsService,
    private readonly settingsService: SettingsService,
    private readonly expenseTypesService: ExpenseTypesService,
    private readonly productsService: ProductsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: Expense | { attachment?: any; ocrResult?: any } | null,
  ) {
    this.form = this.fb.group({
      type: ['expense' as ExpenseType, Validators.required],
      categoryId: [''],
      amount: [0, [Validators.min(0.01)]], // Not required when using line items
      vatAmount: [0, [Validators.min(0)]],
      vatTaxType: ['standard' as VatTaxType],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      expectedPaymentDate: [''],
      purchaseStatus: ['Purchase - Cash Paid', Validators.required],
      vendorId: [''], // Vendor ID from vendor master
      vendorName: [''],
      vendorTrn: [''],
      invoiceNumber: [''],
      description: [''],
      lineItems: this.fb.array([]), // Form array for line items
    });
  }

  ngOnInit(): void {
    // Load tax settings
    this.loadTaxSettings();

    // Load expense types dynamically
    this.expenseTypesService.listExpenseTypes().subscribe((expenseTypes) => {
      this.expenseTypes = expenseTypes;
    });

    // Load all categories initially
    this.categoriesService.listCategories().subscribe((categories) => {
      this.allCategories = categories;
      this.filterCategoriesByType();
    });

    // Load vendors for autocomplete
    this.loadVendors();

    // Setup vendor autocomplete
    this.setupVendorAutocomplete();

    // Load products for line items
    this.loadProducts();

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

    // Watch for purchase status changes to require expected payment date for accruals
    this.form.get('purchaseStatus')?.valueChanges.subscribe((status) => {
      const expectedPaymentDateControl = this.form.get('expectedPaymentDate');
      if (status === 'Purchase - Accruals') {
        expectedPaymentDateControl?.setValidators([Validators.required]);
      } else {
        expectedPaymentDateControl?.clearValidators();
      }
      expectedPaymentDateControl?.updateValueAndValidity();
    });

    // Watch for amount changes to auto-calculate VAT
    this.form.get('amount')?.valueChanges.subscribe(() => {
      this.autoCalculateVat();
    });

    // Watch for VAT amount manual changes - if user clears it, recalculate
    this.form.get('vatAmount')?.valueChanges.subscribe((vatValue) => {
      const vatNum = typeof vatValue === 'number' ? vatValue : parseFloat(String(vatValue || '0'));
      const isEmpty = vatValue === null || vatValue === undefined || 
                     (typeof vatValue === 'string' && vatValue === '') || 
                     vatNum === 0;
      if (isEmpty) {
        // User cleared VAT, mark as not manually entered and recalculate
        this.vatManuallyEntered = false;
        setTimeout(() => this.autoCalculateVat(), 100);
      } else {
        // User entered/changed VAT value - mark as manually entered
        // Use a small delay to distinguish between programmatic and manual changes
        setTimeout(() => {
          // Check if this was a programmatic change by comparing with expected calculation
          const amountValue = this.form.get('amount')?.value;
          const amount = typeof amountValue === 'number' ? amountValue : parseFloat(String(amountValue || '0'));
          if (amount > 0) {
            const vatTaxType = this.form.get('vatTaxType')?.value as VatTaxType || 'standard';
            let expectedVat = 0;
            
            if (vatTaxType === 'reverse_charge') {
              expectedVat = (amount * this.reverseChargeRate) / 100;
            } else if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
              expectedVat = 0;
            } else {
              if (this.taxCalculationMethod === 'inclusive') {
                expectedVat = (amount * this.defaultTaxRate) / (100 + this.defaultTaxRate);
              } else {
                expectedVat = (amount * this.defaultTaxRate) / 100;
              }
            }
            expectedVat = Math.round(expectedVat * 100) / 100;
            
            // If VAT matches expected calculation, it was likely auto-calculated
            const difference = Math.abs(vatNum - expectedVat);
            if (difference > 0.01) {
              // VAT doesn't match expected - user manually entered it
              this.vatManuallyEntered = true;
            }
          }
        }, 50);
      }
    });

    // Watch for VAT tax type changes to recalculate VAT
    this.form.get('vatTaxType')?.valueChanges.subscribe(() => {
      this.autoCalculateVat();
    });

    // Handle different data types
    if (this.data) {
      if ('id' in this.data) {
        // Editing existing expense
        const expense = this.data as Expense;
        // Mark VAT as manually entered when editing existing expense to prevent recalculation
        // This ensures we show the VAT value from the database, not a recalculated value
        this.vatManuallyEntered = true;
        // Check if expense has line items
        if (expense.lineItems && expense.lineItems.length > 0) {
          this.entryMode = 'itemwise';
          // Clear existing line items
          while (this.lineItemsFormArray.length > 0) {
            this.lineItemsFormArray.removeAt(0);
          }
          // Add line items
          expense.lineItems.forEach((lineItem) => {
            const lineItemGroup = this.fb.group({
              productId: [lineItem.productId || ''],
              itemName: [lineItem.itemName, Validators.required],
              sku: [lineItem.sku || ''],
              quantity: [lineItem.quantity, [Validators.required, Validators.min(0.001)]],
              unitOfMeasure: [lineItem.unitOfMeasure || 'unit'],
              unitPrice: [lineItem.unitPrice, [Validators.required, Validators.min(0)]],
              vatRate: [lineItem.vatRate || this.defaultTaxRate],
              vatTaxType: [lineItem.vatTaxType || 'standard'],
              description: [lineItem.description || ''],
            });
            this.lineItemsFormArray.push(lineItemGroup);
            const index = this.lineItemsFormArray.length - 1;
            this.setupProductAutocomplete(index);
            // Setup value change watchers
            lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('vatTaxType')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
          });
        }

        this.form.patchValue({
          type: expense.type,
          categoryId: expense.categoryId ?? '',
          amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount || '0')),
          vatAmount: typeof expense.vatAmount === 'number' ? expense.vatAmount : parseFloat(String(expense.vatAmount || '0')),
          vatTaxType: (expense as any).vatTaxType || 'standard',
          expenseDate: expense.expenseDate,
          expectedPaymentDate: expense.expectedPaymentDate ?? '',
          purchaseStatus: (expense as any).purchaseStatus ?? 'Purchase - Cash Paid',
          vendorId: (expense as any).vendorId ?? '',
          vendorName: expense.vendorName ?? '',
          vendorTrn: expense.vendorTrn ?? '',
          invoiceNumber: (expense as any).invoiceNumber ?? '',
          description: expense.description ?? '',
        }, { emitEvent: false }); // Don't emit events to prevent auto-calculation triggers
        // Filter categories after setting the type
        setTimeout(() => this.filterCategoriesByType(), 0);
      } else {
        // New expense with attachment or OCR
        const data = this.data as { attachment?: any; ocrResult?: any };
        this.attachment = data.attachment;
        this.ocrResult = data.ocrResult;
        // Reset manual entry flag for new expense
        this.vatManuallyEntered = false;

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
          
          // Clean vendor name from OCR result (remove "To: " prefix, etc.)
          const cleanedVendorName = this.cleanVendorName(this.ocrResult.vendorName);
          
          console.log('[ExpenseForm] Parsed OCR values:', {
            amount,
            vatAmount,
            expenseDate,
            vendorName: this.ocrResult.vendorName,
            cleanedVendorName,
            vendorTrn: this.ocrResult.vendorTrn,
          });
          
          // Pre-fill form with OCR data
          // Use emitEvent: false to prevent autocomplete from interfering
          this.form.patchValue({
            categoryId: this.ocrResult.suggestedCategoryId || '',
            vendorName: cleanedVendorName,
            vendorTrn: this.ocrResult.vendorTrn || '',
            invoiceNumber: this.ocrResult.invoiceNumber || '',
            amount: amount,
            vatAmount: vatAmount,
            expenseDate: expenseDate,
            description: this.ocrResult.description || '',
          }, { emitEvent: false });
          
          // Verify vendor name was set and log it
          const setVendorName = this.form.get('vendorName')?.value;
          console.log('[ExpenseForm] Vendor name set in form:', {
            original: this.ocrResult.vendorName,
            cleaned: cleanedVendorName,
            inForm: setVendorName,
            matches: setVendorName === cleanedVendorName
          });
          
          // Double-check: if vendor name is not set, set it again
          if (!setVendorName || setVendorName.trim() === '') {
            console.warn('[ExpenseForm] Vendor name was not set, setting it again');
            this.form.patchValue({ vendorName: cleanedVendorName }, { emitEvent: false });
          }
          
          // Re-initialize vendor autocomplete with OCR vendor name
          // This ensures the autocomplete shows the correct initial value
          if (cleanedVendorName) {
            setTimeout(() => {
              // Ensure vendor name is still set (in case it was cleared)
              const currentVendorName = this.form.get('vendorName')?.value;
              if (!currentVendorName || currentVendorName.trim() === '') {
                this.form.patchValue({ vendorName: cleanedVendorName }, { emitEvent: false });
              }
              
              // Re-initialize autocomplete observable
              this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
                startWith(cleanedVendorName),
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
                  return this.vendorsService.searchVendors(search).pipe(
                    map((vendors) => vendors.slice(0, 10)),
                  );
                }),
              );
              console.log('[ExpenseForm] Re-initialized vendor autocomplete with OCR vendor name:', cleanedVendorName);
            }, 200);
          }
          
          // Trigger validation after OCR population
          this.form.markAllAsTouched();
          
          // Vendor matching will happen in loadVendors() callback
          // Don't try to match here as vendors might not be loaded yet
        }
      }
    }
  }

  submit(): void {
    // Validate based on entry mode
    if (this.entryMode === 'itemwise') {
      if (this.lineItemsFormArray.length === 0) {
        this.snackBar.open('Please add at least one line item', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }
      if (this.lineItemsFormArray.invalid) {
        this.lineItemsFormArray.markAllAsTouched();
        this.snackBar.open('Please fill all required fields in line items', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }
    } else {
      if (this.form.get('amount')?.invalid) {
        this.form.markAllAsTouched();
        const amountControl = this.form.get('amount');
        if (amountControl?.hasError('required') || (amountControl?.value !== null && amountControl?.value !== undefined && amountControl.value <= 0)) {
          this.snackBar.open('Please enter a valid amount greater than 0', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        }
        return;
      }
    }

    if (this.form.get('expenseDate')?.hasError('required')) {
      this.snackBar.open('Please select an expense date', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
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
    
    // Validate purchase status - if "Purchase - Accruals" is selected, require expected payment date
    if (value.purchaseStatus === 'Purchase - Accruals' && !value.expectedPaymentDate) {
      this.snackBar.open(
        'Purchase - Accruals requires an expected payment date.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }
    
    // Validate amount (for single entry mode)
    if (this.entryMode === 'single') {
      const amount = Number(value.amount ?? 0);
      if (amount <= 0) {
        this.snackBar.open('Amount must be greater than 0', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }
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

    // Prepare line items if in item-wise mode
    let lineItems: any[] | undefined = undefined;
    if (this.entryMode === 'itemwise' && this.lineItemsFormArray.length > 0) {
      lineItems = this.lineItemsFormArray.controls.map((control, index) => {
        const lineItemGroup = control as FormGroup;
        const quantity = parseFloat(lineItemGroup.get('quantity')?.value || '0');
        const unitPrice = parseFloat(lineItemGroup.get('unitPrice')?.value || '0');
        const vatRate = parseFloat(lineItemGroup.get('vatRate')?.value || '0');
        const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'standard';

        const lineAmount = quantity * unitPrice;
        let lineVatAmount = 0;

        if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
          lineVatAmount = 0;
        } else if (vatTaxType === 'reverse_charge') {
          lineVatAmount = (lineAmount * vatRate) / 100;
        } else {
          if (this.taxCalculationMethod === 'inclusive') {
            lineVatAmount = (lineAmount * vatRate) / (100 + vatRate);
          } else {
            lineVatAmount = (lineAmount * vatRate) / 100;
          }
        }

        lineVatAmount = Math.round(lineVatAmount * 100) / 100;

        return {
          productId: lineItemGroup.get('productId')?.value || undefined,
          itemName: lineItemGroup.get('itemName')?.value,
          sku: lineItemGroup.get('sku')?.value || undefined,
          quantity: quantity,
          unitOfMeasure: lineItemGroup.get('unitOfMeasure')?.value || 'unit',
          unitPrice: unitPrice,
          vatRate: vatRate,
          vatTaxType: vatTaxType,
          description: lineItemGroup.get('description')?.value || undefined,
        };
      });
    }

    // Calculate totals from line items if provided
    let finalAmount = Number(value.amount ?? 0);
    let finalVatAmount = Number(value.vatAmount ?? 0);
    
    if (lineItems && lineItems.length > 0) {
      finalAmount = 0;
      finalVatAmount = 0;
      lineItems.forEach(item => {
        const lineAmount = item.quantity * item.unitPrice;
        let lineVatAmount = 0;
        
        if (item.vatTaxType === 'zero_rated' || item.vatTaxType === 'exempt') {
          lineVatAmount = 0;
        } else if (item.vatTaxType === 'reverse_charge') {
          lineVatAmount = (lineAmount * item.vatRate) / 100;
        } else {
          if (this.taxCalculationMethod === 'inclusive') {
            lineVatAmount = (lineAmount * item.vatRate) / (100 + item.vatRate);
          } else {
            lineVatAmount = (lineAmount * item.vatRate) / 100;
          }
        }
        
        lineVatAmount = Math.round(lineVatAmount * 100) / 100;
        finalAmount += lineAmount;
        finalVatAmount += lineVatAmount;
      });
      
      finalAmount = Math.round(finalAmount * 100) / 100;
      finalVatAmount = Math.round(finalVatAmount * 100) / 100;
    }

    // Prepare expense payload
    const expensePayload: any = {
      type,
      categoryId: value.categoryId || undefined,
      amount: finalAmount,
      vatAmount: finalVatAmount,
      vatTaxType: value.vatTaxType || 'standard',
      expenseDate: value.expenseDate ?? new Date().toISOString().substring(0, 10),
      expectedPaymentDate: value.expectedPaymentDate || undefined,
      purchaseStatus: value.purchaseStatus || undefined,
      description: value.description || undefined,
      attachments,
      lineItems, // Include line items if in item-wise mode
    };

    // Add vendorId if selected, otherwise use vendorName
    // Always clean vendor name before sending
    const cleanedVendorName = this.cleanVendorName(value.vendorName);
    
    if (value.vendorId) {
      expensePayload.vendorId = value.vendorId;
      // Still send vendorName as fallback (cleaned)
      if (cleanedVendorName) {
        expensePayload.vendorName = cleanedVendorName;
      }
    } else if (cleanedVendorName) {
      expensePayload.vendorName = cleanedVendorName;
    }

    // Add vendorTrn if provided
    if (value.vendorTrn) {
      expensePayload.vendorTrn = value.vendorTrn;
    }

    // Add invoiceNumber if provided
    if (value.invoiceNumber) {
      expensePayload.invoiceNumber = value.invoiceNumber;
    }
    
    console.log('[ExpenseForm] Vendor data in payload:', {
      vendorId: expensePayload.vendorId,
      vendorName: expensePayload.vendorName,
      vendorTrn: expensePayload.vendorTrn,
    });

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
          
          // If a vendor was created or linked, refresh the vendor list
          // Check if expense has vendorId or if we sent vendorName (which might have created a vendor)
          if (expensePayload.vendorName || (expense as any).vendorId) {
            console.log('[ExpenseForm] Refreshing vendor list after expense creation');
            // Force refresh to get the newly created vendor
            this.loadVendors(true);
            
            // Also try to select the vendor if it was just created
            const cleanedVendorName = this.cleanVendorName(expensePayload.vendorName);
            if (cleanedVendorName && !expensePayload.vendorId) {
              // Vendor was likely just created, try to find and select it
              setTimeout(() => {
                const newVendor = this.vendors.find(v => 
                  v.name.toLowerCase() === cleanedVendorName.toLowerCase()
                );
                if (newVendor) {
                  this.onVendorSelected(newVendor);
                  console.log('[ExpenseForm] Auto-selected newly created vendor:', newVendor.name);
                }
              }, 500);
            }
          }
          
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

  // Line Items Management
  get lineItemsFormArray(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  toggleEntryMode(): void {
    this.entryMode = this.entryMode === 'single' ? 'itemwise' : 'single';
    if (this.entryMode === 'itemwise' && this.lineItemsFormArray.length === 0) {
      this.addLineItem();
    }
    // Update form validators based on mode
    const amountControl = this.form.get('amount');
    if (this.entryMode === 'single') {
      amountControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      amountControl?.clearValidators();
    }
    amountControl?.updateValueAndValidity();
  }

  addLineItem(): void {
    const lineItemGroup = this.fb.group({
      productId: [''],
      itemName: ['', Validators.required],
      sku: [''],
      quantity: [1, [Validators.required, Validators.min(0.001)]],
      unitOfMeasure: ['unit'],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      vatRate: [this.defaultTaxRate],
      vatTaxType: ['standard' as VatTaxType],
      description: [''],
    });

    this.lineItemsFormArray.push(lineItemGroup);
    const index = this.lineItemsFormArray.length - 1;

    // Setup product autocomplete for this line item
    this.setupProductAutocomplete(index);

    // Watch for changes to calculate line totals
    lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('vatTaxType')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));

    // Calculate initial total
    this.calculateLineItemTotal(index);
  }

  removeLineItem(index: number): void {
    this.lineItemsFormArray.removeAt(index);
    this.filteredProducts$.splice(index, 1);
    this.calculateTotalsFromLineItems();
  }

  setupProductAutocomplete(index: number): void {
    const lineItemGroup = this.lineItemsFormArray.at(index) as FormGroup;
    const itemNameControl = lineItemGroup.get('itemName');

    if (!itemNameControl) return;

    // Initialize filtered products observable for this line item
    this.filteredProducts$[index] = itemNameControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string | null) => {
        const search = searchTerm || '';
        if (!search || search.length < 2) {
          return of(this.products.slice(0, 10));
        }
        const filtered = this.products.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
        );
        return of(filtered.slice(0, 10));
      }),
    );

    // Watch for product selection
    itemNameControl.valueChanges.subscribe((value) => {
      // Check if value matches a product
      const product = this.products.find(p =>
        p.name === value || (p.sku && p.sku === value)
      );
      if (product) {
        this.onProductSelected(index, product);
      }
    });
  }

  onProductSelected(index: number, product: Product): void {
    const lineItemGroup = this.lineItemsFormArray.at(index) as FormGroup;
    const vatRate = product.vatRate ? parseFloat(product.vatRate) : this.defaultTaxRate;
    
    lineItemGroup.patchValue({
      productId: product.id,
      itemName: product.name,
      sku: product.sku || '',
      unitOfMeasure: product.unitOfMeasure || 'unit',
      unitPrice: product.unitPrice ? parseFloat(product.unitPrice) : 0,
      vatRate: vatRate,
    }, { emitEvent: false });

    this.calculateLineItemTotal(index);
  }

  displayProduct(product: Product | string | null): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.name;
  }

  getProductAutocomplete(index: number): MatAutocomplete | undefined {
    if (this.productAutocompletes && this.productAutocompletes.length > index) {
      return this.productAutocompletes.toArray()[index];
    }
    return undefined;
  }

  calculateLineItemTotal(index: number): void {
    const lineItemGroup = this.lineItemsFormArray.at(index) as FormGroup;
    const quantity = parseFloat(lineItemGroup.get('quantity')?.value || '0');
    const unitPrice = parseFloat(lineItemGroup.get('unitPrice')?.value || '0');
    const vatRate = parseFloat(lineItemGroup.get('vatRate')?.value || '0');
    const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'standard';

    const amount = quantity * unitPrice;
    let vatAmount = 0;

    if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
      vatAmount = 0;
    } else if (vatTaxType === 'reverse_charge') {
      vatAmount = (amount * vatRate) / 100;
    } else {
      if (this.taxCalculationMethod === 'inclusive') {
        vatAmount = (amount * vatRate) / (100 + vatRate);
      } else {
        vatAmount = (amount * vatRate) / 100;
      }
    }

    vatAmount = Math.round(vatAmount * 100) / 100;
    const totalAmount = amount + vatAmount;

    // Store calculated values (not in form, but we'll use them in submit)
    lineItemGroup.patchValue({
      // We'll calculate these in submit, but store for display
    }, { emitEvent: false });

    this.calculateTotalsFromLineItems();
  }

  /**
   * Get the calculated total for a line item (for display purposes)
   */
  getLineItemTotal(index: number): number {
    // Safety check: ensure index is valid and form array exists
    if (!this.lineItemsFormArray || index < 0 || index >= this.lineItemsFormArray.length) {
      return 0;
    }
    
    const lineItemGroup = this.lineItemsFormArray.at(index) as FormGroup;
    if (!lineItemGroup) return 0;

    const quantity = parseFloat(lineItemGroup.get('quantity')?.value || '0');
    const unitPrice = parseFloat(lineItemGroup.get('unitPrice')?.value || '0');
    const vatRate = parseFloat(lineItemGroup.get('vatRate')?.value || '0');
    const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'standard';

    const amount = quantity * unitPrice;
    let vatAmount = 0;

    if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
      vatAmount = 0;
    } else if (vatTaxType === 'reverse_charge') {
      vatAmount = (amount * vatRate) / 100;
    } else {
      if (this.taxCalculationMethod === 'inclusive') {
        vatAmount = (amount * vatRate) / (100 + vatRate);
      } else {
        vatAmount = (amount * vatRate) / 100;
      }
    }

    vatAmount = Math.round(vatAmount * 100) / 100;
    const totalAmount = amount + vatAmount;
    return Math.round(totalAmount * 100) / 100;
  }

  calculateTotalsFromLineItems(): void {
    if (this.entryMode !== 'itemwise') return;

    let totalAmount = 0;
    let totalVatAmount = 0;

    this.lineItemsFormArray.controls.forEach((control) => {
      const lineItemGroup = control as FormGroup;
      const quantity = parseFloat(lineItemGroup.get('quantity')?.value || '0');
      const unitPrice = parseFloat(lineItemGroup.get('unitPrice')?.value || '0');
      const vatRate = parseFloat(lineItemGroup.get('vatRate')?.value || '0');
      const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'standard';

      const lineAmount = quantity * unitPrice;
      let lineVatAmount = 0;

      if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
        lineVatAmount = 0;
      } else if (vatTaxType === 'reverse_charge') {
        lineVatAmount = (lineAmount * vatRate) / 100;
      } else {
        if (this.taxCalculationMethod === 'inclusive') {
          lineVatAmount = (lineAmount * vatRate) / (100 + vatRate);
        } else {
          lineVatAmount = (lineAmount * vatRate) / 100;
        }
      }

      lineVatAmount = Math.round(lineVatAmount * 100) / 100;
      totalAmount += lineAmount;
      totalVatAmount += lineVatAmount;
    });

    // Update form totals (for display, but we'll recalculate in submit)
    this.form.patchValue({
      amount: Math.round(totalAmount * 100) / 100,
      vatAmount: Math.round(totalVatAmount * 100) / 100,
    }, { emitEvent: false });
  }

  loadProducts(): void {
    this.productsService.listProducts().subscribe({
      next: (products) => {
        this.products = products.filter(p => p.isActive);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products = [];
      },
    });
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

  loadTaxSettings(): void {
    this.settingsService.getTaxSettings().subscribe({
      next: (settings) => {
        this.taxSettings = settings;
        // Parse tax rate - it might come as string "5.00" or number 5
        let taxRate = settings.taxDefaultRate || 5;
        
        // Convert string to number if needed
        if (typeof taxRate === 'string') {
          taxRate = parseFloat(taxRate);
        }
        
        // Ensure it's a valid number
        if (isNaN(taxRate) || taxRate <= 0) {
          taxRate = 5;
        }
        
        if (taxRate < 1) {
          // If less than 1, it's stored as decimal - multiply by 100 to get percentage
          taxRate = taxRate * 100;
        }
        // Force to 5 for UAE standard VAT if it's not between 4.5 and 5.5 (to catch incorrect values)
        if (taxRate < 4.5 || taxRate > 5.5) {
          taxRate = 5;
        }
        this.defaultTaxRate = taxRate;
        
        // Force exclusive calculation method (user wants simple: amount × 5%)
        this.taxCalculationMethod = 'exclusive';
        
        // Same for reverse charge rate
        let reverseRate = settings.taxReverseChargeRate || 5;
        if (reverseRate < 1) {
          reverseRate = reverseRate * 100;
        }
        if (reverseRate < 5) {
          reverseRate = 5;
        }
        this.reverseChargeRate = reverseRate;
        
        this.reverseChargeEnabled = settings.taxEnableReverseCharge || false;
        // Auto-calculate VAT if amount is already set (but not when editing existing expense)
        if (this.form.get('amount')?.value && !this.isEditMode()) {
          this.autoCalculateVat();
        }
      },
      error: () => {
        // Use fallback defaults
        this.defaultTaxRate = 5;
        this.taxCalculationMethod = 'exclusive';
        this.reverseChargeRate = 5;
        this.reverseChargeEnabled = false;
      },
    });
  }

  autoCalculateVat(): void {
    const amountValue = this.form.get('amount')?.value;
    const vatFormValue = this.form.get('vatAmount')?.value;
    const vatTaxType = this.form.get('vatTaxType')?.value as VatTaxType || 'standard';
    const amount = typeof amountValue === 'number' ? amountValue : parseFloat(String(amountValue || '0'));
    const currentVat = typeof vatFormValue === 'number' ? vatFormValue : parseFloat(String(vatFormValue || '0'));
    
    // Only auto-calculate if VAT is 0 or empty (user hasn't manually entered it)
    const isVatEmpty = vatFormValue === null || 
                      vatFormValue === undefined || 
                      (typeof vatFormValue === 'string' && vatFormValue === '') || 
                      currentVat === 0;
    
    // Don't auto-calculate if user has manually entered VAT
    if (this.vatManuallyEntered && !isVatEmpty) {
      return;
    }
    
    // Simple VAT calculation: amount × tax rate / 100
    if (amount > 0) {
      // Ensure tax rate is a number (not string)
      const taxRate = typeof this.defaultTaxRate === 'number' ? this.defaultTaxRate : parseFloat(String(this.defaultTaxRate)) || 5;
      
      let calculatedVat = 0;
      
      if (vatTaxType === 'reverse_charge') {
        // Reverse charge: amount × reverse charge rate / 100
        const reverseRate = typeof this.reverseChargeRate === 'number' ? this.reverseChargeRate : parseFloat(String(this.reverseChargeRate)) || 5;
        calculatedVat = (amount * reverseRate) / 100;
      } else if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
        // Zero rated or exempt: no VAT
        calculatedVat = 0;
      } else {
        // Standard VAT calculation - always use exclusive (simple: amount × 5%)
        // VAT is exclusive (added on top): amount × rate / 100
        // Simple: 5% of amount = amount × 5 / 100
        calculatedVat = (amount * taxRate) / 100;
      }
      
      // Round to 2 decimal places
      calculatedVat = Math.round(calculatedVat * 100) / 100;
      
      // Update VAT amount if it's empty or if it's not manually entered
      if (isVatEmpty || !this.vatManuallyEntered) {
        // VAT is empty or was auto-calculated, update it
        this.form.patchValue({ vatAmount: calculatedVat }, { emitEvent: false });
        // Reset manual entry flag since we're updating it programmatically
        this.vatManuallyEntered = false;
      }
    }
  }

  private loadVendors(forceRefresh: boolean = false): void {
    // Force refresh by adding timestamp to prevent 304 cache responses
    const filters: any = { isActive: true };
    if (forceRefresh) {
      filters._refresh = Date.now();
    }
    
    this.vendorsService.listVendors(filters).subscribe({
      next: (vendors) => {
        this.vendors = vendors;
        console.log('[ExpenseForm] Vendors loaded:', vendors.length, vendors.map(v => v.name));
        
        // If OCR result has vendor name, try to match after vendors are loaded
        // This ensures vendors are available before matching
        if (this.ocrResult?.vendorName) {
          const cleanedVendorName = this.cleanVendorName(this.ocrResult.vendorName);
          if (cleanedVendorName) {
            if (vendors.length > 0) {
              // Vendors loaded, match immediately
              setTimeout(() => {
                this.matchVendorFromOcr(cleanedVendorName);
              }, 100);
            } else {
              // No vendors in master, but OCR found vendor name
              console.log('[ExpenseForm] No vendors in master, OCR vendor name will be used as-is');
            }
          }
        }
      },
      error: (error) => {
        console.error('[ExpenseForm] Error loading vendors:', error);
        // Even if vendors fail to load, still try to match via API search
        if (this.ocrResult?.vendorName) {
          const cleanedVendorName = this.cleanVendorName(this.ocrResult.vendorName);
          if (cleanedVendorName) {
            setTimeout(() => {
              this.matchVendorFromOcr(cleanedVendorName);
            }, 500);
          }
        }
      },
    });
  }

  private setupVendorAutocomplete(): void {
    // Setup filtered vendors observable for autocomplete
    // Get initial value from form to preserve OCR-set values
    const initialValue = this.form.get('vendorName')?.value || '';
    this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
      startWith(initialValue), // Use initial form value to preserve OCR data
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
    
    // If OCR data is set after autocomplete setup, update the observable
    // This handles the case where OCR data is set after ngOnInit
    if (this.ocrResult?.vendorName) {
      const cleanedVendorName = this.cleanVendorName(this.ocrResult.vendorName);
      if (cleanedVendorName) {
        // Re-initialize with the OCR vendor name
        setTimeout(() => {
          const currentValue = this.form.get('vendorName')?.value;
          if (currentValue !== cleanedVendorName) {
            // Update the observable with the correct initial value
            this.filteredVendors$ = this.form.get('vendorName')!.valueChanges.pipe(
              startWith(cleanedVendorName),
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
                return this.vendorsService.searchVendors(search).pipe(
                  map((vendors) => vendors.slice(0, 10)),
                );
              }),
            );
          }
        }, 100);
      }
    }

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
      // Check if this is a programmatic change by checking if selectedVendor exists
      // or if vendorId was just set (within a short time window)
      if (!this.selectedVendor && this.form.get('vendorId')?.value) {
        // Use setTimeout to allow programmatic changes to complete first
        setTimeout(() => {
          // Only clear if vendorId is still set but selectedVendor is null
          // This means the user typed something that doesn't match a selected vendor
          if (!this.selectedVendor && this.form.get('vendorId')?.value) {
            this.form.patchValue({ vendorId: '' }, { emitEvent: false });
          }
        }, 100);
      }
    });
  }

  onVendorSelected(vendor: Vendor | null): void {
    if (!vendor) {
      this.selectedVendor = null;
      this.form.patchValue({
        vendorId: '',
        vendorTrn: '',
      }, { emitEvent: false });
      return;
    }
    
    this.selectedVendor = vendor;
    // Auto-populate vendor TRN when vendor is selected
    this.form.patchValue({
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorTrn: vendor.vendorTrn || '',
    }, { emitEvent: false });
  }

  displayVendor(vendor: Vendor | string | null): string {
    if (!vendor) {
      // If no vendor, return the current form value (which might be a string from OCR)
      return this.form.get('vendorName')?.value || '';
    }
    // If vendor is a string (from OCR or manual input), return it as-is
    if (typeof vendor === 'string') {
      return vendor;
    }
    // If vendor is a Vendor object, return its name
    return vendor.name;
  }

  clearVendorSelection(): void {
    this.selectedVendor = null;
    this.form.patchValue({
      vendorId: '',
      vendorName: '',
      vendorTrn: '',
    });
  }

  /**
   * Clean vendor name by removing common prefixes like "To: ", "From: ", etc.
   */
  private cleanVendorName(vendorName: string | null | undefined): string {
    if (!vendorName) {
      return '';
    }
    
    let cleaned = vendorName.trim();
    
    // Remove common prefixes
    const prefixes = ['To:', 'From:', 'Vendor:', 'Supplier:', 'Company:'];
    for (const prefix of prefixes) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
        break; // Only remove one prefix
      }
    }
    
    return cleaned;
  }

  private matchVendorFromOcr(vendorName: string): void {
    if (!vendorName || vendorName.trim().length === 0) {
      return;
    }
    
    // Clean the vendor name before matching
    const cleanedName = this.cleanVendorName(vendorName);
    if (!cleanedName) {
      return;
    }
    
    const searchName = cleanedName.toLowerCase();
    
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
      // Use cleaned name for API search
      const cleanedSearchName = this.cleanVendorName(vendorName);
      this.vendorsService.searchVendors(cleanedSearchName).subscribe({
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
            // Ensure vendor name is preserved in the form even if no match found
            // The vendor name should already be set from OCR, but ensure it's still there
            const currentVendorName = this.form.get('vendorName')?.value;
            if (!currentVendorName || currentVendorName.trim() === '') {
              // If vendor name was cleared somehow, restore it
              this.form.patchValue({
                vendorName: cleanedSearchName,
              }, { emitEvent: false });
              console.log('[ExpenseForm] Restored vendor name in form:', cleanedSearchName);
            }
            // Show info that vendor will be created as new
            this.snackBar.open(`Vendor "${cleanedSearchName}" not found in master. Will create new entry.`, 'Close', {
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

