import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService, PurchaseOrder } from '../../../core/services/purchase-orders.service';

@Component({
  selector: 'app-convert-to-expense-dialog',
  templateUrl: './convert-to-expense-dialog.component.html',
  styleUrls: ['./convert-to-expense-dialog.component.scss'],
})
export class ConvertToExpenseDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  purchaseOrder: PurchaseOrder | null = null;

  get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ConvertToExpenseDialogComponent>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { poId: string },
  ) {
    this.form = this.fb.group({
      expenseDate: [new Date().toISOString().substring(0, 10), Validators.required],
      expectedPaymentDate: [''],
      invoiceNumber: [''],
      description: [''],
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
        const availableQty = receivedQty > 0 ? receivedQty : orderedQty;
        const unitPrice = Number(item.unitPrice ?? 0);

        const itemGroup = this.fb.group({
          poLineItemId: [item.id],
          selected: [true], // Select all by default
          itemName: [{ value: item.itemName, disabled: true }],
          orderedQuantity: [{ value: orderedQty, disabled: true }],
          receivedQuantity: [{ value: receivedQty, disabled: true }],
          availableQuantity: [{ value: availableQty, disabled: true }],
          quantity: [
            availableQty,
            [Validators.required, Validators.min(0.001), Validators.max(availableQty)],
          ],
          unitPrice: [{ value: unitPrice, disabled: true }],
          unitOfMeasure: [{ value: item.unitOfMeasure || 'unit', disabled: true }],
          amount: [{ value: (availableQty * unitPrice).toFixed(2), disabled: true }],
        });

        // Update amount when quantity changes
        itemGroup.get('quantity')?.valueChanges.subscribe((qty) => {
          const amount = ((qty ?? 0) * unitPrice).toFixed(2);
          itemGroup.patchValue({ amount }, { emitEvent: false });
        });

        lineItemsArray.push(itemGroup);
      });
    }
  }

  toggleItemSelection(index: number): void {
    const itemGroup = this.lineItems.at(index) as FormGroup;
    const selected = itemGroup.get('selected')?.value;
    itemGroup.patchValue({ selected: !selected });
  }

  isAllSelected(): boolean {
    if (!this.lineItems.length) return false;
    return this.lineItems.controls.every((c) => c.get('selected')?.value === true);
  }

  isSomeSelected(): boolean {
    const some = this.lineItems.controls.some((c) => c.get('selected')?.value === true);
    const all = this.lineItems.controls.every((c) => c.get('selected')?.value === true);
    return some && !all;
  }

  toggleSelectAll(checked: boolean): void {
    this.lineItems.controls.forEach((c) => c.patchValue({ selected: checked }));
  }

  getSelectedItemsCount(): number {
    return this.lineItems.controls.filter(
      (control) => control.get('selected')?.value === true
    ).length;
  }

  getTotalAmount(): number {
    return this.lineItems.controls
      .filter((control) => control.get('selected')?.value === true)
      .reduce((sum, control) => {
        const amount = parseFloat(control.get('amount')?.value || '0');
        return sum + amount;
      }, 0);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const selectedItems = this.lineItems.controls
      .filter((control) => control.get('selected')?.value === true)
      .map((control) => ({
        poLineItemId: control.get('poLineItemId')?.value,
        quantity: parseFloat(control.get('quantity')?.value || '0'),
      }));

    if (selectedItems.length === 0) {
      this.snackBar.open('Please select at least one line item to convert', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    const payload = {
      expenseDate: formValue.expenseDate,
      expectedPaymentDate: formValue.expectedPaymentDate || undefined,
      invoiceNumber: formValue.invoiceNumber || undefined,
      description: formValue.description || undefined,
      lineItems: selectedItems,
    };

    this.purchaseOrdersService.convertToExpense(this.data.poId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to convert to expense',
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
