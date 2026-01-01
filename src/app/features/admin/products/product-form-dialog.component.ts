import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProductsService, Product, CreateProductPayload, UpdateProductPayload } from '../../../core/services/products.service';

@Component({
  selector: 'app-product-form-dialog',
  templateUrl: './product-form-dialog.component.html',
  styleUrls: ['./product-form-dialog.component.scss'],
})
export class ProductFormDialogComponent {
  form: FormGroup;
  loading = false;
  readonly isEdit: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ProductFormDialogComponent>,
    private readonly productsService: ProductsService,
    @Inject(MAT_DIALOG_DATA) public data: Product | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      sku: [data?.sku || ''],
      description: [data?.description || ''],
      unitPrice: [data?.unitPrice ? parseFloat(data.unitPrice) : null],
      unitOfMeasure: [data?.unitOfMeasure || ''],
      vatRate: [data?.vatRate ? parseFloat(data.vatRate) : 5, [Validators.min(0), Validators.max(100)]],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    if (this.isEdit && this.data) {
      const payload: UpdateProductPayload = {
        name: formValue.name,
        sku: formValue.sku || undefined,
        description: formValue.description || undefined,
        unitPrice: formValue.unitPrice || undefined,
        unitOfMeasure: formValue.unitOfMeasure || undefined,
        vatRate: formValue.vatRate || undefined,
      };
      this.productsService.updateProduct(this.data.id, payload).subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: () => {
          this.loading = false;
        },
      });
    } else {
      const payload: CreateProductPayload = {
        name: formValue.name,
        sku: formValue.sku || undefined,
        description: formValue.description || undefined,
        unitPrice: formValue.unitPrice || undefined,
        unitOfMeasure: formValue.unitOfMeasure || undefined,
        vatRate: formValue.vatRate || undefined,
      };
      this.productsService.createProduct(payload).subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close(true);
        },
        error: () => {
          this.loading = false;
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

