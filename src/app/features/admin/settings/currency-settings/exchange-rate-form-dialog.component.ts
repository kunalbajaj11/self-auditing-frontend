import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ExchangeRate } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-exchange-rate-form-dialog',
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Exchange Rate' : 'Add Exchange Rate' }}</h2>
    <form mat-dialog-content [formGroup]="form" class="form">
      <mat-form-field appearance="outline">
        <mat-label>From Currency</mat-label>
        <input matInput formControlName="fromCurrency" required maxlength="3" minlength="3" placeholder="AED" />
        <mat-error *ngIf="form.get('fromCurrency')?.hasError('required')">From currency is required</mat-error>
        <mat-error *ngIf="form.get('fromCurrency')?.hasError('minlength')">Must be 3 characters</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>To Currency</mat-label>
        <input matInput formControlName="toCurrency" required maxlength="3" minlength="3" placeholder="USD" />
        <mat-error *ngIf="form.get('toCurrency')?.hasError('required')">To currency is required</mat-error>
        <mat-error *ngIf="form.get('toCurrency')?.hasError('minlength')">Must be 3 characters</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Exchange Rate</mat-label>
        <input matInput type="number" formControlName="rate" required min="0" step="0.0001" />
        <mat-error *ngIf="form.get('rate')?.hasError('required')">Rate is required</mat-error>
        <mat-error *ngIf="form.get('rate')?.hasError('min')">Rate must be > 0</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Date</mat-label>
        <input matInput [matDatepicker]="datePicker" formControlName="date" required />
        <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
        <mat-datepicker #datePicker></mat-datepicker>
        <mat-error *ngIf="form.get('date')?.hasError('required')">Date is required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Source</mat-label>
        <mat-select formControlName="source">
          <mat-option value="manual">Manual</mat-option>
          <mat-option value="api">API</mat-option>
          <mat-option value="auto">Auto</mat-option>
        </mat-select>
      </mat-form-field>
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
  `],
})
export class ExchangeRateFormDialogComponent {
  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ExchangeRateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ExchangeRate | null,
  ) {
    const today = new Date().toISOString().split('T')[0];
    this.form = this.fb.group({
      fromCurrency: [data?.fromCurrency || '', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      toCurrency: [data?.toCurrency || '', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      rate: [data?.rate || 0, [Validators.required, Validators.min(0.0001)]],
      date: [data?.date || today, Validators.required],
      source: [data?.source || 'manual'],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.dialogRef.close({
      ...value,
      fromCurrency: (value.fromCurrency || '').toUpperCase(),
      toCurrency: (value.toCurrency || '').toUpperCase(),
      isActive: true,
      isManual: value.source === 'manual',
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

