import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PurchaseOrdersService, PurchaseOrder } from '../../../core/services/purchase-orders.service';
import { PurchaseOrderFormDialogComponent } from './purchase-order-form-dialog.component';
import { ReceiveItemsDialogComponent } from './receive-items-dialog.component';
import { ConvertToExpenseDialogComponent } from './convert-to-expense-dialog.component';
import { POEmailDialogComponent } from './po-email-dialog.component';

@Component({
  selector: 'app-purchase-order-detail-dialog',
  templateUrl: './purchase-order-detail-dialog.component.html',
  styleUrls: ['./purchase-order-detail-dialog.component.scss'],
})
export class PurchaseOrderDetailDialogComponent implements OnInit {
  purchaseOrder: PurchaseOrder | null = null;
  loading = false;

  constructor(
    private readonly dialogRef: MatDialogRef<PurchaseOrderDetailDialogComponent>,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { poId: string },
  ) {}

  ngOnInit(): void {
    this.loadPurchaseOrder();
  }

  loadPurchaseOrder(): void {
    this.loading = true;
    this.purchaseOrdersService.getPurchaseOrder(this.data.poId).subscribe({
      next: (po) => {
        this.loading = false;
        this.purchaseOrder = po;
        this.cdr.detectChanges();
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

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'sent': 'Sent',
      'acknowledged': 'Acknowledged',
      'partially_received': 'Partially Received',
      'fully_received': 'Fully Received',
      'invoiced': 'Invoiced',
      'closed': 'Closed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colorMap: Record<string, 'primary' | 'accent' | 'warn'> = {
      'draft': 'accent',
      'sent': 'primary',
      'acknowledged': 'primary',
      'partially_received': 'accent',
      'fully_received': 'primary',
      'invoiced': 'primary',
      'closed': 'primary',
      'cancelled': 'warn',
    };
    return colorMap[status] || 'accent';
  }

  editPurchaseOrder(): void {
    if (!this.purchaseOrder) return;

    const dialogRef = this.dialog.open(PurchaseOrderFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: this.purchaseOrder,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPurchaseOrder();
      }
    });
  }

  sendToVendor(): void {
    if (!this.purchaseOrder) return;

    if (!confirm(`Send purchase order ${this.purchaseOrder.poNumber} to vendor?`)) {
      return;
    }

    this.purchaseOrdersService.sendToVendor(this.purchaseOrder.id).subscribe({
      next: () => {
        this.snackBar.open('Purchase Order sent successfully', 'Close', {
          duration: 3000,
        });
        this.loadPurchaseOrder();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to send purchase order',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  receiveItems(): void {
    if (!this.purchaseOrder) return;

    const dialogRef = this.dialog.open(ReceiveItemsDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { poId: this.purchaseOrder.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPurchaseOrder();
      }
    });
  }

  convertToExpense(): void {
    if (!this.purchaseOrder) return;

    const dialogRef = this.dialog.open(ConvertToExpenseDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { poId: this.purchaseOrder.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Purchase Order converted to Expense successfully', 'Close', {
          duration: 3000,
        });
        this.loadPurchaseOrder();
      }
    });
  }

  downloadPDF(): void {
    if (!this.purchaseOrder) return;

    this.purchaseOrdersService.downloadPOPDF(this.purchaseOrder.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchase-order-${this.purchaseOrder?.poNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('PDF downloaded successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to download PDF',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  sendEmail(): void {
    if (!this.purchaseOrder) return;

    const dialogRef = this.dialog.open(POEmailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        poId: this.purchaseOrder.id,
        vendorEmail: this.purchaseOrder.vendor?.email || this.purchaseOrder.sentToEmail,
        poNumber: this.purchaseOrder.poNumber,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPurchaseOrder();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
