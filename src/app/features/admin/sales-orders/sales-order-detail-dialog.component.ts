import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesOrdersService, SalesOrder } from '../../../core/services/sales-orders.service';
import { SalesOrderFormDialogComponent } from './sales-order-form-dialog.component';
import { SOEmailDialogComponent } from './so-email-dialog.component';
import { DeliveryChallansService } from '../../../core/services/delivery-challans.service';

@Component({
  selector: 'app-sales-order-detail-dialog',
  templateUrl: './sales-order-detail-dialog.component.html',
  styleUrls: ['./sales-order-detail-dialog.component.scss'],
})
export class SalesOrderDetailDialogComponent implements OnInit {
  salesOrder: SalesOrder | null = null;
  loading = false;

  constructor(
    private readonly dialogRef: MatDialogRef<SalesOrderDetailDialogComponent>,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly deliveryChallansService: DeliveryChallansService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { soId: string },
  ) {}

  ngOnInit(): void {
    this.loadSalesOrder();
  }

  loadSalesOrder(): void {
    this.loading = true;
    this.salesOrdersService.getSalesOrder(this.data.soId).subscribe({
      next: (so) => {
        this.loading = false;
        this.salesOrder = so;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load sales order', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  edit(): void {
    if (!this.salesOrder) return;
    const dialogRef = this.dialog.open(SalesOrderFormDialogComponent, {
      width: '1150px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: this.salesOrder,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSalesOrder();
    });
  }

  sendToCustomer(): void {
    if (!this.salesOrder) return;
    if (!confirm(`Mark sales order ${this.salesOrder.soNumber} as sent?`)) return;

    this.salesOrdersService.sendToCustomer(this.salesOrder.id).subscribe({
      next: () => {
        this.snackBar.open('Sales order marked as sent', 'Close', { duration: 3000 });
        this.loadSalesOrder();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to send sales order',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  createDeliveryChallan(): void {
    if (!this.salesOrder) return;
    if (!confirm(`Create Delivery Challan from Sales Order ${this.salesOrder.soNumber}?`)) return;

    const challanDate = new Date().toISOString().substring(0, 10);
    this.deliveryChallansService.createFromSalesOrder(this.salesOrder.id, { challanDate }).subscribe({
      next: (dc) => {
        this.snackBar.open(`Delivery Challan ${dc.challanNumber} created`, 'Close', { duration: 3000 });
        this.loadSalesOrder();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to create delivery challan',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  downloadPDF(): void {
    if (!this.salesOrder) return;
    this.salesOrdersService.downloadSOPDF(this.salesOrder.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales-order-${this.salesOrder?.soNumber}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('PDF downloaded successfully', 'Close', { duration: 3000 });
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
    if (!this.salesOrder) return;
    const dialogRef = this.dialog.open(SOEmailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        soId: this.salesOrder.id,
        customerEmail: this.salesOrder.customer?.email || this.salesOrder.sentToEmail,
        soNumber: this.salesOrder.soNumber,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSalesOrder();
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      confirmed: 'Confirmed',
      partially_delivered: 'Partially Delivered',
      fully_delivered: 'Fully Delivered',
      invoiced: 'Invoiced',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colorMap: Record<string, 'primary' | 'accent' | 'warn'> = {
      draft: 'accent',
      sent: 'primary',
      confirmed: 'primary',
      partially_delivered: 'accent',
      fully_delivered: 'primary',
      invoiced: 'primary',
      closed: 'primary',
      cancelled: 'warn',
    };
    return colorMap[status] || 'accent';
  }

  close(): void {
    this.dialogRef.close();
  }
}

