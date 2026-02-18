import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { CustomersService, Customer } from '../../../core/services/customers.service';
import { ProductsService, Product } from '../../../core/services/products.service';
import { SalesOrdersService, SalesOrder, SalesOrderLineItem } from '../../../core/services/sales-orders.service';
import {
  DeliveryChallansService,
  DeliveryChallan,
  DeliveryChallanLineItem,
} from '../../../core/services/delivery-challans.service';

@Component({
  selector: 'app-delivery-challan-form-dialog',
  templateUrl: './delivery-challan-form-dialog.component.html',
  styleUrls: ['./delivery-challan-form-dialog.component.scss'],
})
export class DeliveryChallanFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  salesOrders: SalesOrder[] = [];
  customers: Customer[] = [];
  products: Product[] = [];

  get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DeliveryChallanFormDialogComponent>,
    private readonly deliveryChallansService: DeliveryChallansService,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DeliveryChallan | null,
  ) {
    this.form = this.fb.group({
      salesOrderId: [''],
      customerId: [''],
      customerName: ['', Validators.required],
      customerTrn: [''],
      challanDate: [new Date().toISOString().substring(0, 10), Validators.required],
      deliveryAddress: [''],
      vehicleNumber: [''],
      transportMode: [''],
      lrNumber: [''],
      notes: [''],
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      salesOrders: this.salesOrdersService.listSalesOrders(),
      customers: this.customersService.listCustomers(undefined, true),
      products: this.productsService.listProducts(),
    }).subscribe({
      next: ({ salesOrders, customers, products }) => {
        this.salesOrders = salesOrders || [];
        this.customers = customers || [];
        this.products = (products || []).filter((p) => p.isActive);
        this.loading = false;

        if (this.data) this.loadData();
        else this.addLineItem();
      },
      error: () => {
        this.loading = false;
        if (this.data) this.loadData();
        else this.addLineItem();
      },
    });
  }

  private loadData(): void {
    const dc = this.data!;
    this.form.patchValue({
      salesOrderId: dc.salesOrderId || dc.salesOrder?.id || '',
      customerId: dc.customerId || dc.customer?.id || '',
      customerName: dc.customerName || dc.customer?.name || '',
      customerTrn: dc.customerTrn || dc.customer?.customerTrn || '',
      challanDate: dc.challanDate,
      deliveryAddress: dc.deliveryAddress || '',
      vehicleNumber: dc.vehicleNumber || '',
      transportMode: dc.transportMode || '',
      lrNumber: dc.lrNumber || '',
      notes: dc.notes || '',
    });

    if (dc.lineItems?.length) {
      dc.lineItems.forEach((li) => this.addLineItem(li));
    } else {
      this.addLineItem();
    }
  }

  onSalesOrderSelected(soId: string): void {
    const so = this.salesOrders.find((x) => x.id === soId);
    if (!so) return;
    this.form.patchValue({
      customerId: so.customerId || so.customer?.id || '',
      customerName: so.customerName || so.customer?.name || '',
      customerTrn: so.customerTrn || so.customer?.customerTrn || '',
    });
    if (!soId) {
      this.lineItems.clear();
      this.addLineItem();
      return;
    }
    // Load full SO with line items and show quantities to deliver
    this.loading = true;
    this.salesOrdersService.getSalesOrder(soId).subscribe({
      next: (fullSo) => {
        this.loading = false;
        this.lineItems.clear();
        const items = fullSo.lineItems || [];
        if (items.length === 0) {
          this.addLineItem();
          this.snackBar.open('This Sales Order has no line items.', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return;
        }
        items.forEach((li: SalesOrderLineItem) => {
          this.addLineItem({
            soLineItemId: li.id,
            itemName: li.itemName,
            description: li.description,
            quantity: typeof li.orderedQuantity === 'number' ? li.orderedQuantity : parseFloat(String(li.orderedQuantity || '0')),
            unitOfMeasure: li.unitOfMeasure || 'unit',
          });
        });
      },
      error: () => {
        this.loading = false;
        this.lineItems.clear();
        this.addLineItem();
        this.snackBar.open('Failed to load Sales Order items', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  onCustomerSelected(customerId: string): void {
    const c = this.customers.find((x) => x.id === customerId);
    if (!c) return;
    this.form.patchValue({
      customerName: c.name,
      customerTrn: c.customerTrn || '',
    });
  }

  /** Optional: set when line item comes from a Sales Order (for createFromSalesOrder payload). */
  addLineItem(item?: Partial<DeliveryChallanLineItem> & { soLineItemId?: string }): void {
    const group = this.fb.group({
      soLineItemId: [item?.soLineItemId ?? null],
      productId: [item?.productId || ''],
      itemName: [item?.itemName || '', Validators.required],
      description: [item?.description || ''],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.001)]],
      unitOfMeasure: [item?.unitOfMeasure || 'unit'],
    });
    this.lineItems.push(group);
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
    ctrl.patchValue({
      itemName: product.name,
      unitOfMeasure: product.unitOfMeasure || 'unit',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const value = this.form.getRawValue();

    // If creating and a Sales Order is selected, use createFromSalesOrder (send line items with quantities)
    if (!this.data && value.salesOrderId) {
      const soLineItems = (value.lineItems || [])
        .filter((li: any) => li.soLineItemId && Number(li.quantity) > 0)
        .map((li: any) => ({
          salesOrderLineItemId: li.soLineItemId,
          quantity: parseFloat(li.quantity),
        }));
      if (soLineItems.length === 0) {
        this.snackBar.open(
          'Enter at least one quantity to deliver for the selected Sales Order items.',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
        return;
      }
      this.deliveryChallansService
        .createFromSalesOrder(value.salesOrderId, {
          challanDate: value.challanDate,
          notes: value.notes || undefined,
          deliveryAddress: value.deliveryAddress || undefined,
          vehicleNumber: value.vehicleNumber || undefined,
          transportMode: value.transportMode || undefined,
          lrNumber: value.lrNumber || undefined,
          lineItems: soLineItems.length > 0 ? soLineItems : undefined,
        })
        .subscribe({
          next: (dc) => {
            this.loading = false;
            this.dialogRef.close(dc);
          },
          error: (error) => {
            this.loading = false;
            this.snackBar.open(
              error?.error?.message || 'Failed to create delivery challan',
              'Close',
              { duration: 4000, panelClass: ['snack-error'] },
            );
          },
        });
      return;
    }

    const payload = {
      salesOrderId: value.salesOrderId || undefined,
      customerId: value.customerId || undefined,
      customerName: value.customerName,
      customerTrn: value.customerTrn || undefined,
      challanDate: value.challanDate,
      deliveryAddress: value.deliveryAddress || undefined,
      vehicleNumber: value.vehicleNumber || undefined,
      transportMode: value.transportMode || undefined,
      lrNumber: value.lrNumber || undefined,
      notes: value.notes || undefined,
      lineItems: (value.lineItems || []).map((li: any) => ({
        productId: li.productId || undefined,
        itemName: li.itemName,
        description: li.description || undefined,
        quantity: parseFloat(li.quantity),
        unitOfMeasure: li.unitOfMeasure || 'unit',
      })),
    };

    const request$ = this.data
      ? this.deliveryChallansService.updateDeliveryChallan(this.data.id, payload)
      : this.deliveryChallansService.createDeliveryChallan(payload);

    request$.subscribe({
      next: (dc) => {
        this.loading = false;
        this.dialogRef.close(dc);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to save delivery challan',
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

