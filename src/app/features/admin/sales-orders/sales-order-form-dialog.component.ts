import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { ProductsService, Product } from '../../../core/services/products.service';
import {
  SalesOrdersService,
  SalesOrder,
  SalesOrderLineItem,
} from '../../../core/services/sales-orders.service';
import { SettingsService, TaxRate } from '../../../core/services/settings.service';

@Component({
  selector: 'app-sales-order-form-dialog',
  templateUrl: './sales-order-form-dialog.component.html',
  styleUrls: ['./sales-order-form-dialog.component.scss'],
})
export class SalesOrderFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  customers: Customer[] = [];
  products: Product[] = [];
  taxRates: TaxRate[] = [];
  defaultTaxRate = 5;

  readonly vatTaxTypes = ['STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE'];
  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  get subtotal(): number {
    return this.lineItems.controls.reduce((sum, ctrl) => {
      const amount = parseFloat(ctrl.get('amount')?.value || '0');
      return sum + amount;
    }, 0);
  }

  get totalVat(): number {
    return this.lineItems.controls.reduce((sum, ctrl) => {
      const vatAmount = parseFloat(ctrl.get('vatAmount')?.value || '0');
      return sum + vatAmount;
    }, 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.totalVat;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<SalesOrderFormDialogComponent>,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly settingsService: SettingsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: SalesOrder | null,
  ) {
    this.form = this.fb.group({
      customerId: [''],
      customerName: ['', Validators.required],
      customerTrn: [''],
      orderDate: [new Date().toISOString().substring(0, 10), Validators.required],
      expectedDeliveryDate: [''],
      currency: ['AED', Validators.required],
      notes: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      customers: this.customersService.listCustomers(undefined, true),
      products: this.productsService.listProducts(),
      taxSettings: this.settingsService.getTaxSettings(),
      taxRates: this.settingsService.getTaxRates(),
    }).subscribe({
      next: ({ customers, products, taxSettings, taxRates }) => {
        this.customers = customers || [];
        this.products = (products || []).filter((p) => p.isActive);
        this.defaultTaxRate = taxSettings?.taxDefaultRate || 5;
        this.taxRates = (taxRates || []).filter((r) => r.isActive);
        this.loading = false;

        if (this.data) this.loadSalesOrderData();
        else this.addLineItem();
      },
      error: () => {
        this.loading = false;
        if (this.data) this.loadSalesOrderData();
        else this.addLineItem();
      },
    });
  }

  private loadSalesOrderData(): void {
    const so = this.data!;
    const customerId = so.customerId || so.customer?.id;
    const customerName = so.customerName || so.customer?.name || '';
    const customerTrn = so.customerTrn || so.customer?.customerTrn || '';

    this.form.patchValue({
      customerId: customerId || '',
      customerName,
      customerTrn,
      orderDate: so.orderDate,
      expectedDeliveryDate: so.expectedDeliveryDate || '',
      currency: so.currency || 'AED',
      notes: so.notes || '',
    });

    if (so.lineItems?.length) {
      so.lineItems.forEach((li) => this.addLineItem(li));
    } else {
      this.addLineItem();
    }
  }

  onCustomerChange(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) return;
    this.form.patchValue({
      customerName: customer.name,
      customerTrn: customer.customerTrn || '',
      currency: customer.preferredCurrency || 'AED',
    });
  }

  addLineItem(item?: Partial<SalesOrderLineItem>): void {
    const group = this.fb.group({
      productId: [item?.productId || ''],
      itemName: [item?.itemName || '', Validators.required],
      description: [item?.description || ''],
      orderedQuantity: [item?.orderedQuantity ?? 1, [Validators.required, Validators.min(0.001)]],
      unitOfMeasure: [item?.unitOfMeasure || 'unit'],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      vatRate: [item?.vatRate ?? this.defaultTaxRate, [Validators.min(0)]],
      vatTaxType: [item?.vatTaxType || 'STANDARD'],
      amount: [item?.amount ?? 0],
      vatAmount: [item?.vatAmount ?? 0],
      totalAmount: [item?.totalAmount ?? 0],
    });

    group.valueChanges.subscribe(() => this.recalculateLine(group));
    this.lineItems.push(group);
    this.recalculateLine(group);
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length <= 1) return;
    this.lineItems.removeAt(index);
  }

  onProductSelected(index: number): void {
    const ctrl = this.lineItems.at(index) as FormGroup;
    const productId = ctrl.get('productId')?.value;
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    ctrl.patchValue(
      {
        itemName: product.name,
        unitPrice: product.unitPrice ? parseFloat(product.unitPrice) : 0,
        unitOfMeasure: product.unitOfMeasure || 'unit',
        vatRate: product.vatRate ? parseFloat(product.vatRate) : this.defaultTaxRate,
      },
      { emitEvent: true },
    );
  }

  private recalculateLine(group: FormGroup): void {
    const qty = parseFloat(group.get('orderedQuantity')?.value || '0') || 0;
    const unitPrice = parseFloat(group.get('unitPrice')?.value || '0') || 0;
    const vatRate = parseFloat(group.get('vatRate')?.value || '0') || 0;
    const vatTaxType = (group.get('vatTaxType')?.value || 'STANDARD') as string;

    const amount = qty * unitPrice;
    const vatApplicable = !['ZERO_RATED', 'EXEMPT'].includes(vatTaxType);
    const vatAmount = vatApplicable ? (amount * vatRate) / 100 : 0;
    const totalAmount = amount + vatAmount;

    group.patchValue(
      {
        amount: amount.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
      { emitEvent: false },
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const value = this.form.getRawValue();

    const payload = {
      customerId: value.customerId || undefined,
      customerName: value.customerName,
      customerTrn: value.customerTrn || undefined,
      orderDate: value.orderDate,
      expectedDeliveryDate: value.expectedDeliveryDate || undefined,
      currency: value.currency,
      notes: value.notes || undefined,
      lineItems: (value.lineItems || []).map((li: any) => ({
        productId: li.productId || undefined,
        itemName: li.itemName,
        description: li.description || undefined,
        orderedQuantity: parseFloat(li.orderedQuantity),
        unitOfMeasure: li.unitOfMeasure || 'unit',
        unitPrice: parseFloat(li.unitPrice),
        vatRate: parseFloat(li.vatRate || this.defaultTaxRate),
        vatTaxType: li.vatTaxType,
      })),
    };

    const request$ = this.data
      ? this.salesOrdersService.updateSalesOrder(this.data.id, payload)
      : this.salesOrdersService.createSalesOrder(payload);

    request$.subscribe({
      next: (so) => {
        this.loading = false;
        this.dialogRef.close(so);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to save sales order',
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

