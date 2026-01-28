import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService, PurchaseOrder, PurchaseOrderLineItem } from '../../../core/services/purchase-orders.service';

@Component({
  selector: 'app-receive-items-dialog',
  templateUrl: './receive-items-dialog.component.html',
  styleUrls: ['./receive-items-dialog.component.scss'],
})
export class ReceiveItemsDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  purchaseOrder: PurchaseOrder | null = null;

  get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ReceiveItemsDialogComponent>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { poId: string },
  ) {
    this.form = this.fb.group({
      lineItems: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadPurchaseOrder();
  }

  loadPurchaseOrder(): void {
    this.loading = true;
    this.purchaseOrdersService.getPurchaseOrder(this.data.poId).subscribe({
      next: (po) => {
        this.loading = false;
        this.purchaseOrder = po;
        this.initializeForm(po);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load purchase order', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  initializeForm(po: PurchaseOrder): void {
    const lineItemsArray = this.form.get('lineItems') as FormArray;
    lineItemsArray.clear();

    if (po.lineItems && po.lineItems.length > 0) {
      po.lineItems.forEach((item) => {
        const orderedQty = Number(item.orderedQuantity ?? 0);
        const receivedQty = Number(item.receivedQuantity ?? 0);
        const remainingQty = orderedQty - receivedQty;

        const itemGroup = this.fb.group({
          lineItemId: [item.id],
          itemName: [{ value: item.itemName, disabled: true }],
          orderedQuantity: [{ value: orderedQty, disabled: true }],
          receivedQuantity: [{ value: receivedQty, disabled: true }],
          remainingQuantity: [{ value: remainingQty, disabled: true }],
          newReceivedQuantity: [
            remainingQty > 0 ? remainingQty : 0,
            [Validators.required, Validators.min(0), Validators.max(remainingQty)],
          ],
          unitOfMeasure: [{ value: item.unitOfMeasure || 'unit', disabled: true }],
        });

        lineItemsArray.push(itemGroup);
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

    const items = formValue.lineItems
      .filter((item: any) => item.newReceivedQuantity > 0)
      .map((item: any) => ({
        lineItemId: item.lineItemId,
        receivedQuantity: parseFloat(item.newReceivedQuantity),
      }));

    if (items.length === 0) {
      this.snackBar.open('Please enter received quantities for at least one item', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      this.loading = false;
      return;
    }

    this.purchaseOrdersService.receiveItems(this.data.poId, { items }).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to receive items',
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
