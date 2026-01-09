import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ClearDataConfirmationDialogData {
  organizationName: string;
}

@Component({
  selector: 'app-clear-data-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">warning</mat-icon>
      Clear All Organization Data
    </h2>
    <mat-dialog-content>
      <div class="warning-content">
        <p>
          Are you sure you want to clear <strong>ALL data</strong> for
          <strong>{{ data.organizationName }}</strong>?
        </p>
        <mat-card class="warning-card">
          <mat-card-content>
            <h4>This will permanently delete:</h4>
            <ul>
              <li>All expenses and invoices</li>
              <li>All sales and purchases</li>
              <li>All payments and transactions</li>
              <li>All inventory data</li>
              <li>All payroll records</li>
              <li>All reports and attachments</li>
              <li>All vendors, customers, and categories</li>
              <li>All settings and configurations</li>
            </ul>
            <p class="keep-info">
              <mat-icon color="primary">info</mat-icon>
              <strong>Users will be retained</strong> - they can still login,
              but will see an empty organization (like first-time registration).
            </p>
          </mat-card-content>
        </mat-card>
        <p class="final-warning">
          <strong>This action cannot be undone!</strong>
        </p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="warn"
        (click)="confirm()"
      >
        <mat-icon>delete_forever</mat-icon>
        Clear All Data
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #d32f2f;
      }
      mat-dialog-content {
        min-width: 500px;
        padding: 20px;
      }
      .warning-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .warning-card {
        background-color: #fff3cd;
        border-left: 4px solid #ff9800;
      }
      .warning-card h4 {
        margin-top: 0;
        color: #856404;
      }
      .warning-card ul {
        margin: 8px 0;
        padding-left: 24px;
      }
      .warning-card li {
        margin: 4px 0;
        color: #856404;
      }
      .keep-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 12px;
        background-color: #e3f2fd;
        border-radius: 4px;
        color: #1565c0;
      }
      .final-warning {
        color: #d32f2f;
        font-size: 14px;
        text-align: center;
        padding: 12px;
        background-color: #ffebee;
        border-radius: 4px;
      }
      mat-dialog-actions {
        padding: 16px 24px;
      }
      button[color='warn'] {
        margin-left: 8px;
      }
    `,
  ],
})
export class ClearDataConfirmationDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ClearDataConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ClearDataConfirmationDialogData,
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

