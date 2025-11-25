import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ActivateOrganizationDialogData {
  organizationName: string;
}

@Component({
  selector: 'app-activate-organization-dialog',
  template: `
    <h2 mat-dialog-title>Activate Organization</h2>
    <mat-dialog-content>
      <p>Set the license expiry date for <strong>{{ data.organizationName }}</strong></p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Expiry Date</mat-label>
          <input
            matInput
            [matDatepicker]="picker"
            formControlName="expiryDate"
            required
          />
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error *ngIf="form.get('expiryDate')?.hasError('required')">
            Expiry date is required
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="activate()"
      >
        Activate
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 400px;
        padding: 20px;
      }
      .full-width {
        width: 100%;
      }
      p {
        margin-bottom: 20px;
      }
    `,
  ],
})
export class ActivateOrganizationDialogComponent {
  form = new FormGroup({
    expiryDate: new FormControl<Date | null>(null, [Validators.required]),
  });

  constructor(
    private readonly dialogRef: MatDialogRef<ActivateOrganizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ActivateOrganizationDialogData,
  ) {}

  cancel(): void {
    this.dialogRef.close(null);
  }

  activate(): void {
    if (this.form.valid) {
      const expiryDate = this.form.value.expiryDate;
      if (expiryDate) {
        // Convert to ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
        const expiryDateString = expiryDate.toISOString();
        this.dialogRef.close(expiryDateString);
      }
    }
  }
}

