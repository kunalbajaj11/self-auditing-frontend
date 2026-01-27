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
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { Expense, ExpenseType, VatTaxType, PurchaseLineItem } from '../../../core/models/expense.model';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-purchase-order-form-dialog',
  templateUrl: './purchase-order-form-dialog.component.html',
  styleUrls: ['./purchase-order-form-dialog.component.scss'],
})
export class PurchaseOrderFormDialogComponent implements OnInit {
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
  filteredVendors$!: Observable<Vendor[]>;
  selectedVendor: Vendor | null = null;

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
  
  products: Product[] = [];
  
  @ViewChildren(MatAutocomplete) productAutocompletes!: QueryList<MatAutocomplete>;

  // Tax settings
  taxSettings: TaxSettings | null = null;
  defaultTaxRate = 5;
  taxCalculationMethod: 'inclusive' | 'exclusive' = 'exclusive';
  reverseChargeRate = 5;
  reverseChargeEnabled = false;
  
  private vatManuallyEntered = false;
  
  readonly vatTaxTypes: { value: VatTaxType; label: string }[] = [
    { value: 'standard', label: 'Standard Rate' },
    { value: 'zero_rated', label: 'Zero Rated' },
    { value: 'exempt', label: 'Exempt' },
    { value: 'reverse_charge', label: 'Reverse Charge' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PurchaseOrderFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly categoriesService: CategoriesService,
    private readonly vendorsService: VendorsService,
    private readonly settingsService: SettingsService,
    private readonly expenseTypesService: ExpenseTypesService,
    private readonly productsService: ProductsService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: Expense | { attachment?: any; ocrResult?: any } | null,
  ) {
    this.form = this.fb.group({
      expenseTypeKey: ['expense', Validators.required],
      type: ['expense' as ExpenseType, Validators.required],
      expenseTypeId: [''],
      categoryId: [''],
      amount: [0, [Validators.min(0.01)]],
      vatAmount: [0, [Validators.min(0)]],
      vatTaxType: ['standard' as VatTaxType],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      expectedPaymentDate: [''],
      purchaseStatus: ['Purchase - Accruals', Validators.required], // Default to Accruals for PO
      vendorId: [''],
      vendorName: [''],
      vendorTrn: [''],
      invoiceNumber: [''],
      poNumber: [''], // Purchase Order Number
      description: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadTaxSettings();
    this.expenseTypesService.listExpenseTypes().subscribe((expenseTypes) => {
      this.expenseTypes = expenseTypes;
      const currentKey = this.form.get('expenseTypeKey')?.value;
      if (!currentKey) {
        this.form.patchValue({ expenseTypeKey: this.form.get('type')?.value || 'expense' }, { emitEvent: false });
      }
    });

    this.loadCategories();
    this.loadVendors();
    this.setupVendorAutocomplete();
    this.loadProducts();
    this.filteredItems$ = this.salesInvoicesService.getItemSuggestions();

    this.form.get('expenseTypeKey')?.valueChanges.subscribe((key) => {
      if (key) {
        this.applyExpenseTypeSelection(key);
      }
    });

    this.form.get('purchaseStatus')?.valueChanges.subscribe((status) => {
      const expectedPaymentDateControl = this.form.get('expectedPaymentDate');
      if (status === 'Purchase - Accruals') {
        expectedPaymentDateControl?.setValidators([Validators.required]);
      } else {
        expectedPaymentDateControl?.clearValidators();
      }
      expectedPaymentDateControl?.updateValueAndValidity();
    });

    this.form.get('amount')?.valueChanges.subscribe(() => {
      this.autoCalculateVat();
    });

    this.form.get('vatAmount')?.valueChanges.subscribe((vatValue) => {
      const vatNum = typeof vatValue === 'number' ? vatValue : parseFloat(String(vatValue || '0'));
      const isEmpty = vatValue === null || vatValue === undefined || 
                     (typeof vatValue === 'string' && vatValue === '') || 
                     vatNum === 0;
      if (isEmpty) {
        this.vatManuallyEntered = false;
        setTimeout(() => this.autoCalculateVat(), 100);
      } else {
        setTimeout(() => {
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
            
            const difference = Math.abs(vatNum - expectedVat);
            if (difference > 0.01) {
              this.vatManuallyEntered = true;
            }
          }
        }, 50);
      }
    });

    this.form.get('vatTaxType')?.valueChanges.subscribe(() => {
      this.autoCalculateVat();
    });

    if (this.data) {
      if ('id' in this.data) {
        const expense = this.data as Expense;
        this.vatManuallyEntered = false;
        if (expense.lineItems && expense.lineItems.length > 0) {
          this.entryMode = 'itemwise';
          while (this.lineItemsFormArray.length > 0) {
            this.lineItemsFormArray.removeAt(0);
          }
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
            lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
            lineItemGroup.get('vatTaxType')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
          });
        }

        const expenseAmount = typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount || '0'));
        const expenseVatAmount = typeof expense.vatAmount === 'number' ? expense.vatAmount : parseFloat(String(expense.vatAmount || '0'));
        
        const customExpenseTypeId = (expense as any).expenseTypeId;
        const expenseTypeKey = customExpenseTypeId 
          ? `custom:${customExpenseTypeId}` 
          : expense.type;

        this.form.patchValue({
          type: expense.type,
          expenseTypeKey: expenseTypeKey,
          expenseTypeId: customExpenseTypeId || '',
          categoryId: expense.categoryId ?? '',
          amount: expenseAmount,
          vatAmount: expenseVatAmount,
          vatTaxType: (expense as any).vatTaxType || 'standard',
          expenseDate: expense.expenseDate,
          expectedPaymentDate: expense.expectedPaymentDate ?? '',
          purchaseStatus: (expense as any).purchaseStatus ?? 'Purchase - Accruals',
          vendorId: (expense as any).vendorId ?? '',
          vendorName: expense.vendorName ?? '',
          vendorTrn: expense.vendorTrn ?? '',
          invoiceNumber: (expense as any).invoiceNumber ?? '',
          poNumber: (expense as any).poNumber ?? '',
          description: expense.description ?? '',
        }, { emitEvent: false });
        
        setTimeout(() => {
          this.autoCalculateVat();
        }, 100);
        
        setTimeout(() => this.filterCategoriesByType(), 0);
      } else {
        const data = this.data as { attachment?: any; ocrResult?: any };
        this.attachment = data.attachment;
        this.ocrResult = data.ocrResult;
        this.vatManuallyEntered = false;

        if (this.ocrResult) {
          const amount = this.parseAmount(this.ocrResult.amount);
          const vatAmount = this.parseAmount(this.ocrResult.vatAmount);
          const expenseDate = this.parseDate(this.ocrResult.expenseDate);
          const cleanedVendorName = this.cleanVendorName(this.ocrResult.vendorName);
          
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
          
          if (cleanedVendorName) {
            setTimeout(() => {
              const currentVendorName = this.form.get('vendorName')?.value;
              if (!currentVendorName || currentVendorName.trim() === '') {
                this.form.patchValue({ vendorName: cleanedVendorName }, { emitEvent: false });
              }
              
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
            }, 200);
          }
          
          this.form.markAllAsTouched();
        }
      }
    }
  }

  // Copy all the helper methods from ExpenseFormDialogComponent
  // (loadTaxSettings, loadCategories, loadVendors, setupVendorAutocomplete, etc.)
  // For brevity, I'll include the essential ones

  private loadTaxSettings(): void {
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

  private loadCategories(): void {
    this.categoriesService.listCategories().subscribe({
      next: (categories) => {
        this.allCategories = categories;
        this.categories = categories;
      },
    });
  }

  private loadVendors(): void {
    this.vendorsService.listVendors().subscribe({
      next: (vendors) => {
        this.vendors = vendors;
      },
    });
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
        return this.vendorsService.searchVendors(search).pipe(
          map((vendors) => vendors.slice(0, 10)),
        );
      }),
    );
  }

  private loadProducts(): void {
    this.productsService.listProducts().subscribe({
      next: (products) => {
        this.products = products;
      },
    });
  }

  private filterCategoriesByType(): void {
    const type = this.form.get('type')?.value as ExpenseType;
    if (!type) {
      this.categories = this.allCategories;
      return;
    }
    // Filter categories based on expense type if needed
    this.categories = this.allCategories;
  }

  private applyExpenseTypeSelection(key: string): void {
    if (key.startsWith('custom:')) {
      const customId = key.replace('custom:', '');
      const customType = this.expenseTypes.find(t => t.id === customId);
      if (customType) {
        this.form.patchValue({
          type: customType.name as ExpenseType,
          expenseTypeId: customId,
        }, { emitEvent: false });
      }
    } else {
      this.form.patchValue({
        type: key as ExpenseType,
        expenseTypeId: '',
      }, { emitEvent: false });
    }
    this.filterCategoriesByType();
  }

  private autoCalculateVat(): void {
    if (this.vatManuallyEntered) {
      return;
    }

    const amountValue = this.form.get('amount')?.value;
    const amount = typeof amountValue === 'number' ? amountValue : parseFloat(String(amountValue || '0'));
    
    if (amount <= 0) {
      this.form.patchValue({ vatAmount: 0 }, { emitEvent: false });
      return;
    }

    const vatTaxType = this.form.get('vatTaxType')?.value as VatTaxType || 'standard';
    let vatAmount = 0;

    if (vatTaxType === 'reverse_charge') {
      vatAmount = (amount * this.reverseChargeRate) / 100;
    } else if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
      vatAmount = 0;
    } else {
      if (this.taxCalculationMethod === 'inclusive') {
        vatAmount = (amount * this.defaultTaxRate) / (100 + this.defaultTaxRate);
      } else {
        vatAmount = (amount * this.defaultTaxRate) / 100;
      }
    }

    vatAmount = Math.round(vatAmount * 100) / 100;
    this.form.patchValue({ vatAmount }, { emitEvent: false });
  }

  private parseAmount(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const str = String(value).replace(/[^\d.-]/g, '');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  private parseDate(value: any): string {
    if (!value) return new Date().toISOString().substring(0, 10);
    if (value instanceof Date) return value.toISOString().substring(0, 10);
    const dateStr = String(value).substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return new Date().toISOString().substring(0, 10);
  }

  private cleanVendorName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/^To:\s*/i, '').trim();
  }

  displayVendor(vendor: Vendor | null): string {
    return vendor ? vendor.name : '';
  }

  onVendorSelected(vendor: Vendor | null): void {
    this.selectedVendor = vendor;
    if (vendor) {
      this.form.patchValue({
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorTrn: vendor.vendorTrn || '',
      }, { emitEvent: false });
    }
  }

  clearVendorSelection(): void {
    this.selectedVendor = null;
    this.form.patchValue({
      vendorId: '',
      vendorTrn: '',
    }, { emitEvent: false });
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
    this.setupProductAutocomplete(index);
    lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    lineItemGroup.get('vatTaxType')?.valueChanges.subscribe(() => this.calculateLineItemTotal(index));
    this.calculateLineItemTotal(index);
  }

  removeLineItem(index: number): void {
    this.itemSuggestionsMap.delete(index);
    this.lineItemsFormArray.removeAt(index);
    this.calculateTotals();
  }

  getLineItemTotal(index: number): number {
    const lineItem = this.lineItemsFormArray.at(index);
    if (!lineItem) return 0;
    const quantity = parseFloat(lineItem.get('quantity')?.value || '0');
    const unitPrice = parseFloat(lineItem.get('unitPrice')?.value || '0');
    const vatRate = parseFloat(lineItem.get('vatRate')?.value || '0');
    const vatTaxType = lineItem.get('vatTaxType')?.value as VatTaxType || 'standard';
    
    const lineAmount = quantity * unitPrice;
    let lineVatAmount = 0;
    
    if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
      lineVatAmount = 0;
    } else if (vatTaxType === 'reverse_charge') {
      lineVatAmount = (lineAmount * vatRate) / 100;
    } else {
      lineVatAmount = (lineAmount * vatRate) / 100;
    }
    
    return Math.round((lineAmount + lineVatAmount) * 100) / 100;
  }

  calculateLineItemTotal(index: number): void {
    const lineItem = this.lineItemsFormArray.at(index);
    if (!lineItem) return;
    
    const quantity = parseFloat(lineItem.get('quantity')?.value || '0');
    const unitPrice = parseFloat(lineItem.get('unitPrice')?.value || '0');
    const lineAmount = quantity * unitPrice;
    
    this.calculateTotals();
  }

  calculateTotals(): void {
    let totalAmount = 0;
    let totalVat = 0;
    
    this.lineItemsFormArray.controls.forEach((control) => {
      const quantity = parseFloat(control.get('quantity')?.value || '0');
      const unitPrice = parseFloat(control.get('unitPrice')?.value || '0');
      const vatRate = parseFloat(control.get('vatRate')?.value || '0');
      const vatTaxType = control.get('vatTaxType')?.value as VatTaxType || 'standard';
      
      const lineAmount = quantity * unitPrice;
      let lineVatAmount = 0;
      
      if (vatTaxType === 'zero_rated' || vatTaxType === 'exempt') {
        lineVatAmount = 0;
      } else if (vatTaxType === 'reverse_charge') {
        lineVatAmount = (lineAmount * vatRate) / 100;
      } else {
        lineVatAmount = (lineAmount * vatRate) / 100;
      }
      
      totalAmount += lineAmount;
      totalVat += lineVatAmount;
    });
    
    totalAmount = Math.round(totalAmount * 100) / 100;
    totalVat = Math.round(totalVat * 100) / 100;
    
    this.form.patchValue({
      amount: totalAmount,
      vatAmount: totalVat,
    }, { emitEvent: false });
  }

  setupProductAutocomplete(index: number): void {
    const lineItem = this.lineItemsFormArray.at(index);
    if (!lineItem) return;
    
    const itemNameControl = lineItem.get('itemName');
    if (!itemNameControl) return;
    
    const suggestions$ = itemNameControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) {
          return of([]);
        }
        return this.salesInvoicesService.getItemSuggestions().pipe(
          map((items) => items.filter(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
          ).slice(0, 10))
        );
      })
    );
    
    this.itemSuggestionsMap.set(index, suggestions$);
  }

  onItemNameFocus(index: number): void {
    this.activeItemIndex = index;
    const suggestions$ = this.itemSuggestionsMap.get(index);
    if (suggestions$) {
      this.filteredItems$ = suggestions$;
    }
  }

  onItemSelected(index: number, suggestion: any): void {
    const lineItem = this.lineItemsFormArray.at(index);
    if (!lineItem || !suggestion) return;
    
    lineItem.patchValue({
      itemName: suggestion.itemName,
      unitPrice: suggestion.unitPrice,
      vatRate: suggestion.vatRate,
      vatTaxType: suggestion.vatTaxType,
      unitOfMeasure: suggestion.unitOfMeasure || 'unit',
      description: suggestion.description || '',
    }, { emitEvent: false });
    
    this.calculateLineItemTotal(index);
  }

  displayItemName(suggestion: any): string {
    return suggestion ? suggestion.itemName : '';
  }

  submit(): void {
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
    
    if (value.purchaseStatus === 'Purchase - Accruals' && !value.expectedPaymentDate) {
      this.snackBar.open(
        'Purchase - Accruals requires an expected payment date.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }
    
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
    
    const attachments = this.attachment ? [{
      fileName: this.attachment.fileName,
      fileUrl: this.attachment.fileUrl,
      fileType: this.attachment.fileType,
      fileSize: this.attachment.fileSize,
      ...(this.attachment.fileKey && { fileKey: this.attachment.fileKey }),
    }] : undefined;

    let lineItems: any[] | undefined = undefined;
    if (this.entryMode === 'itemwise' && this.lineItemsFormArray.length > 0) {
      lineItems = this.lineItemsFormArray.controls.map((control) => {
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
          lineVatAmount = (lineAmount * vatRate) / 100;
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
          lineVatAmount = (lineAmount * item.vatRate) / 100;
        }
        
        lineVatAmount = Math.round(lineVatAmount * 100) / 100;
        finalAmount += lineAmount;
        finalVatAmount += lineVatAmount;
      });
      
      finalAmount = Math.round(finalAmount * 100) / 100;
      finalVatAmount = Math.round(finalVatAmount * 100) / 100;
    }

    const expensePayload: any = {
      type,
      expenseTypeId: value.expenseTypeId && value.expenseTypeId.trim() ? value.expenseTypeId : undefined,
      categoryId: value.categoryId || undefined,
      amount: finalAmount,
      vatAmount: finalVatAmount,
      vatTaxType: value.vatTaxType || 'standard',
      expenseDate: value.expenseDate ?? new Date().toISOString().substring(0, 10),
      expectedPaymentDate: value.expectedPaymentDate || undefined,
      purchaseStatus: value.purchaseStatus || undefined,
      description: value.description || undefined,
      attachments,
      lineItems,
      poNumber: value.poNumber || undefined, // Include PO Number
    };

    const cleanedVendorName = this.cleanVendorName(value.vendorName);
    
    if (value.vendorId) {
      expensePayload.vendorId = value.vendorId;
      if (cleanedVendorName) {
        expensePayload.vendorName = cleanedVendorName;
      }
    } else if (cleanedVendorName) {
      expensePayload.vendorName = cleanedVendorName;
    }

    if (value.vendorTrn) {
      expensePayload.vendorTrn = value.vendorTrn;
    }

    if (value.invoiceNumber) {
      expensePayload.invoiceNumber = value.invoiceNumber;
    }

    if (this.ocrResult) {
      expensePayload.source = 'ocr';
      if (this.ocrResult.confidence) {
        expensePayload.ocrConfidence = this.ocrResult.confidence;
      }
    } else {
      expensePayload.source = 'manual';
    }

    const isEdit = this.isEditMode();
    const expenseId = isEdit ? (this.data as Expense).id : undefined;

    let finalPayload: any;
    if (isEdit && expenseId) {
      finalPayload = {
        type: expensePayload.type,
        expenseTypeId: expensePayload.expenseTypeId,
        categoryId: expensePayload.categoryId,
        amount: expensePayload.amount,
        vatAmount: expensePayload.vatAmount,
        vatTaxType: expensePayload.vatTaxType,
        expenseDate: expensePayload.expenseDate,
        expectedPaymentDate: expensePayload.expectedPaymentDate,
        purchaseStatus: expensePayload.purchaseStatus,
        vendorName: expensePayload.vendorName,
        vendorTrn: expensePayload.vendorTrn,
        invoiceNumber: expensePayload.invoiceNumber,
        description: expensePayload.description,
        attachments: expensePayload.attachments,
        poNumber: expensePayload.poNumber,
      };
      Object.keys(finalPayload).forEach(key => {
        if (finalPayload[key] === undefined) {
          delete finalPayload[key];
        }
      });
    } else {
      finalPayload = expensePayload;
    }

    const expenseObservable = isEdit && expenseId
      ? this.expensesService.updateExpense(expenseId, finalPayload)
      : this.expensesService.createExpense(finalPayload);

    expenseObservable.subscribe({
      next: (expense) => {
        this.loading = false;
        this.snackBar.open(
          isEdit ? 'Purchase Order updated successfully' : 'Purchase Order created successfully',
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close(expense);
      },
      error: (error) => {
        this.loading = false;
        let errorMessage = isEdit 
          ? 'Failed to update purchase order. Please review the details.'
          : 'Failed to create purchase order. Please review the details.';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
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

  private getTransactionTypeMessage(type: ExpenseType): string {
    const messages: Record<ExpenseType, string> = {
      expense: 'Purchase Order created successfully',
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
    return messages[type] || 'Purchase Order created successfully';
  }
}
