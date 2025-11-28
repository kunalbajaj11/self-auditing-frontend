import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaxRate } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-tax-rate-form-dialog',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Tax Rate' : 'Add Tax Rate' }}</h2>
    <form mat-dialog-content [formGroup]="form" class="form">
      <mat-form-field appearance="outline">
        <mat-label>Code</mat-label>
        <input matInput formControlName="code" required maxlength="20" />
        <mat-error *ngIf="form.get('code')?.hasError('required')">Code is required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" required maxlength="100" />
        <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Rate (%)</mat-label>
        <input matInput type="number" formControlName="rate" required min="0" max="100" step="0.01" />
        <mat-error *ngIf="form.get('rate')?.hasError('required')">Rate is required</mat-error>
        <mat-error *ngIf="form.get('rate')?.hasError('min')">Rate must be >= 0</mat-error>
        <mat-error *ngIf="form.get('rate')?.hasError('max')">Rate must be <= 100</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type" required>
          <mat-option value="standard">Standard Rate</mat-option>
          <mat-option value="reduced">Reduced Rate</mat-option>
          <mat-option value="zero">Zero Rated</mat-option>
          <mat-option value="exempt">Exempt</mat-option>
        </mat-select>
        <mat-error *ngIf="form.get('type')?.hasError('required')">Type is required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Description</mat-label>
        <textarea matInput rows="2" formControlName="description"></textarea>
      </mat-form-field>

      <mat-checkbox formControlName="isActive">Active</mat-checkbox>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ data ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 16px 0;
    }
    .full {
      width: 100%;
    }
  `],
})
export class TaxRateFormDialogComponent {
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<TaxRateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: TaxRate | null,
  ) {
    this.form = this.fb.group({
      code: [data?.code || '', [Validators.required, Validators.maxLength(20)]],
      name: [data?.name || '', [Validators.required, Validators.maxLength(100)]],
      rate: [data?.rate || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      type: [data?.type || 'standard', Validators.required],
      description: [data?.description || ''],
      isActive: [data?.isActive ?? true],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

