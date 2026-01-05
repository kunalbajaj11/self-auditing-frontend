import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InventoryService, InventoryLocation, CreateLocationPayload } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-location-form-dialog',
  templateUrl: './location-form-dialog.component.html',
  styleUrls: ['./location-form-dialog.component.scss'],
})
export class LocationFormDialogComponent {
  form: FormGroup;
  loading = false;
  readonly isEdit: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LocationFormDialogComponent>,
    private readonly inventoryService: InventoryService,
    @Inject(MAT_DIALOG_DATA) public data: InventoryLocation | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      address: [data?.address || ''],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload: CreateLocationPayload = {
      name: this.form.value.name,
      address: this.form.value.address || undefined,
    };

    const operation = this.isEdit
      ? this.inventoryService.updateLocation(this.data!.id, payload)
      : this.inventoryService.createLocation(payload);

    operation.subscribe({
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

