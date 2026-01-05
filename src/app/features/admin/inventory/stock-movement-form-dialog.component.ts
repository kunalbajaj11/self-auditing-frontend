import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InventoryService, StockMovement, StockMovementType, CreateStockMovementPayload, InventoryLocation } from '../../../core/services/inventory.service';
import { ProductsService, Product } from '../../../core/services/products.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stock-movement-form-dialog',
  templateUrl: './stock-movement-form-dialog.component.html',
  styleUrls: ['./stock-movement-form-dialog.component.scss'],
})
export class StockMovementFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  readonly isEdit: boolean;
  locations$: Observable<InventoryLocation[]>;
  products$: Observable<Product[]>;
  movementTypes = [
    { value: StockMovementType.PURCHASE, label: 'Purchase' },
    { value: StockMovementType.SALE, label: 'Sale' },
    { value: StockMovementType.ADJUSTMENT, label: 'Adjustment' },
    { value: StockMovementType.TRANSFER, label: 'Transfer' },
    { value: StockMovementType.RETURN, label: 'Return' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<StockMovementFormDialogComponent>,
    private readonly inventoryService: InventoryService,
    private readonly productsService: ProductsService,
    @Inject(MAT_DIALOG_DATA) public data: StockMovement | null,
  ) {
    this.isEdit = Boolean(data);
    this.locations$ = this.inventoryService.listLocations();
    this.products$ = this.productsService.listProducts();
    
    this.form = this.fb.group({
      productId: [data?.productId || '', Validators.required],
      locationId: [data?.locationId || '', Validators.required],
      movementType: [data?.movementType || StockMovementType.ADJUSTMENT, Validators.required],
      quantity: [data ? parseFloat(data.quantity) : null, [Validators.required, Validators.min(0.01)]],
      unitCost: [data ? parseFloat(data.unitCost) : null, [Validators.required, Validators.min(0)]],
      notes: [data?.notes || ''],
    });
  }

  ngOnInit(): void {
    // Note: Stock movements are typically read-only after creation
    // This form is mainly for viewing details, but we keep it editable for adjustments
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    const payload: CreateStockMovementPayload = {
      productId: formValue.productId,
      locationId: formValue.locationId,
      movementType: formValue.movementType,
      quantity: formValue.quantity,
      unitCost: formValue.unitCost,
      notes: formValue.notes || undefined,
    };

    this.inventoryService.createStockMovement(payload).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

