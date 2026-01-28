import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService, PurchaseOrder, PurchaseOrderLineItem } from '../../../core/services/purchase-orders.service';
import { VendorsService, Vendor } from '../../../core/services/vendors.service';
import { SettingsService, TaxRate } from '../../../core/services/settings.service';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { Observable, of } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-purchase-order-form-dialog',
  templateUrl: './purchase-order-form-dialog.component.html',
  styleUrls: ['./purchase-order-form-dialog.component.scss'],
})
export class PurchaseOrderFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  vendors: Vendor[] = [];
  loadingVendors = false;
  taxRates: TaxRate[] = [];
  defaultTaxRate = 5;

  readonly vatTaxTypes = ['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  // Vendor autocomplete
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
    private readonly dialogRef: MatDialogRef<PurchaseOrderFormDialogComponent>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly vendorsService: VendorsService,
    private readonly settingsService: SettingsService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseOrder | null,
  ) {
    this.form = this.fb.group({
      vendorId: [''],
      vendorName: [''],
      vendorTrn: [''],
      poDate: [new Date().toISOString().substring(0, 10), Validators.required],
      expectedDeliveryDate: [''],
      currency: ['AED'],
      notes: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadVendors();
    this.loadTaxSettings();
    this.setupVendorAutocomplete();
    this.filteredItems$ = this.salesInvoicesService.getItemSuggestions();

    if (this.data) {
      this.loadPurchaseOrderData();
    } else {
      this.addLineItem();
    }
  }

  loadTaxSettings(): void {
    this.settingsService.getTaxSettings().subscribe({
      next: (settings) => {
        this.defaultTaxRate = settings.taxDefaultRate || 5;
      },
      error: () => {
        this.defaultTaxRate = 5;
      },
    });

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

  setupVendorAutocomplete(): void {
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

  onVendorChange(vendorId: string): void {
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (vendor) {
      this.selectedVendor = vendor;
      this.form.patchValue({
        vendorName: vendor.name,
        vendorTrn: vendor.vendorTrn || '',
        currency: vendor.preferredCurrency || 'AED',
      });
    }
  }

  displayVendor(value: Vendor | string | null): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value.name || '';
  }

  onVendorSelected(vendor: Vendor | null): void {
    this.selectedVendor = vendor;
    if (vendor) {
      this.form.patchValue({
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorTrn: vendor.vendorTrn || '',
        currency: vendor.preferredCurrency || 'AED',
      }, { emitEvent: false });
    }
  }

  clearVendorSelection(): void {
    this.selectedVendor = null;
    this.form.patchValue({
      vendorId: '',
      vendorName: '',
      vendorTrn: '',
    }, { emitEvent: false });
  }

  loadPurchaseOrderData(): void {
    if (!this.data) return;

    const po = this.data;
    const vendorId = po.vendorId || po.vendor?.id;
    if (vendorId) {
      this.vendorsService.getVendor(vendorId).subscribe({
        next: (vendor) => {
          this.selectedVendor = vendor;
          this.form.patchValue({
            vendorId: vendor.id,
            vendorName: vendor.name,
            vendorTrn: vendor.vendorTrn || '',
          });
        },
        error: () => {
          this.form.patchValue({
            vendorId: vendorId,
            vendorName: po.vendorName || po.vendor?.name || '',
            vendorTrn: po.vendorTrn || '',
          });
        },
      });
    } else {
      this.form.patchValue({
        vendorName: po.vendorName || '',
        vendorTrn: po.vendorTrn || '',
      });
    }

    this.form.patchValue({
      poDate: po.poDate,
      expectedDeliveryDate: po.expectedDeliveryDate || '',
      currency: po.currency || 'AED',
      notes: po.notes || '',
    });

    if (po.lineItems && po.lineItems.length > 0) {
      po.lineItems.forEach((item) => {
        this.addLineItem(item);
      });
    }
  }

  addLineItem(item?: Partial<PurchaseOrderLineItem>): void {
    const lineItemGroup = this.fb.group({
      productId: [item?.productId || ''],
      itemName: [item?.itemName || '', Validators.required],
      description: [item?.description || ''],
      orderedQuantity: [item?.orderedQuantity || 1, [Validators.required, Validators.min(0.001)]],
      unitOfMeasure: [item?.unitOfMeasure || 'unit'],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      vatRate: [item?.vatRate || this.defaultTaxRate, [Validators.min(0), Validators.max(100)]],
      vatTaxType: [item?.vatTaxType || 'STANDARD'],
      amount: [{ value: item?.amount || (item?.orderedQuantity || 1) * (item?.unitPrice || 0), disabled: true }],
      vatAmount: [{ value: item?.vatAmount || 0, disabled: true }],
      totalAmount: [{ value: item?.totalAmount || 0, disabled: true }],
    });

    lineItemGroup.get('orderedQuantity')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('unitPrice')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatRate')?.valueChanges.subscribe(() => this.calculateLineItem(lineItemGroup));
    lineItemGroup.get('vatTaxType')?.valueChanges.subscribe((taxType) => {
      const vatRateValue = lineItemGroup.get('vatRate')?.value;
      const currentRate = typeof vatRateValue === 'number' ? vatRateValue : parseFloat(String(vatRateValue || '0'));
      if (currentRate === this.defaultTaxRate || currentRate === 0) {
        const rateForType = this.getTaxRateForType(taxType || 'STANDARD');
        lineItemGroup.patchValue({ vatRate: rateForType }, { emitEvent: false });
      }
      this.calculateLineItem(lineItemGroup);
    });

    this.calculateLineItem(lineItemGroup);
    const index = this.lineItems.length;
    this.lineItems.push(lineItemGroup);
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
          return this.salesInvoicesService.getItemSuggestions();
        }
        return this.salesInvoicesService.getItemSuggestions(search);
      }),
      map((suggestions) => suggestions.slice(0, 10)),
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
              return this.salesInvoicesService.getItemSuggestions();
            }
            return this.salesInvoicesService.getItemSuggestions(search);
          }),
          map((suggestions) => suggestions.slice(0, 10)),
        );
      }
    }
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

    lineItemGroup.patchValue({
      itemName: selectedItem.itemName,
      description: selectedItem.description || lineItemGroup.get('description')?.value || '',
      unitPrice: selectedItem.unitPrice || lineItemGroup.get('unitPrice')?.value || 0,
      vatRate: selectedItem.vatRate || this.defaultTaxRate,
      vatTaxType: selectedItem.vatTaxType || 'STANDARD',
      unitOfMeasure: selectedItem.unitOfMeasure || lineItemGroup.get('unitOfMeasure')?.value || 'unit',
    }, { emitEvent: true });

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
    this.itemSuggestionsMap.clear();
    this.lineItems.controls.forEach((control, idx) => {
      this.setupItemNameAutocomplete(idx, control as FormGroup);
    });
  }

  calculateLineItem(lineItemGroup: FormGroup): void {
    const quantityValue = lineItemGroup.get('orderedQuantity')?.value;
    const unitPriceValue = lineItemGroup.get('unitPrice')?.value;
    const vatRateValue = lineItemGroup.get('vatRate')?.value;
    const quantity = typeof quantityValue === 'number' ? quantityValue : parseFloat(String(quantityValue || '0'));
    const unitPrice = typeof unitPriceValue === 'number' ? unitPriceValue : parseFloat(String(unitPriceValue || '0'));
    const vatRate = typeof vatRateValue === 'number' ? vatRateValue : parseFloat(String(vatRateValue || '0'));
    const vatTaxType = lineItemGroup.get('vatTaxType')?.value || 'STANDARD';

    const amount = quantity * unitPrice;
    
    let vatAmount = 0;
    if (vatTaxType === 'STANDARD' && vatRate > 0) {
      vatAmount = amount * (vatRate / 100);
    } else if (vatTaxType === 'REVERSE_CHARGE' && vatRate > 0) {
      vatAmount = amount * (vatRate / 100);
    }

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

    const lineItems = this.lineItems.controls.map((control) => {
      const value = control.getRawValue();
      return {
        productId: value.productId || undefined,
        itemName: value.itemName,
        sku: value.sku || undefined,
        description: value.description || undefined,
        orderedQuantity: parseFloat(value.orderedQuantity),
        unitOfMeasure: value.unitOfMeasure || 'unit',
        unitPrice: parseFloat(value.unitPrice),
        vatRate: parseFloat(value.vatRate || String(this.defaultTaxRate)),
        vatTaxType: value.vatTaxType || 'STANDARD',
      };
    });

    const payload: any = {
      vendorId: formValue.vendorId || undefined,
      vendorName: formValue.vendorName || undefined,
      vendorTrn: formValue.vendorTrn || undefined,
      poDate: formValue.poDate,
      expectedDeliveryDate: formValue.expectedDeliveryDate || undefined,
      currency: formValue.currency || 'AED',
      notes: formValue.notes || undefined,
      lineItems: lineItems,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        payload[key] = undefined;
      }
    });

    const operation = this.data
      ? this.purchaseOrdersService.updatePurchaseOrder(this.data.id, payload)
      : this.purchaseOrdersService.createPurchaseOrder(payload);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to save purchase order',
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
