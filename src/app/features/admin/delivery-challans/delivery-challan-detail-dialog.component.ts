import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeliveryChallansService, DeliveryChallan } from '../../../core/services/delivery-challans.service';
import { DeliveryChallanFormDialogComponent } from './delivery-challan-form-dialog.component';
import { DCEmailDialogComponent } from './dc-email-dialog.component';

@Component({
  selector: 'app-delivery-challan-detail-dialog',
  templateUrl: './delivery-challan-detail-dialog.component.html',
  styleUrls: ['./delivery-challan-detail-dialog.component.scss'],
})
export class DeliveryChallanDetailDialogComponent implements OnInit {
  deliveryChallan: DeliveryChallan | null = null;
  loading = false;

  constructor(
    private readonly dialogRef: MatDialogRef<DeliveryChallanDetailDialogComponent>,
    private readonly deliveryChallansService: DeliveryChallansService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { dcId: string },
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.deliveryChallansService.getDeliveryChallan(this.data.dcId).subscribe({
      next: (dc) => {
        this.loading = false;
        this.deliveryChallan = dc;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load delivery challan', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  edit(): void {
    if (!this.deliveryChallan) return;
    const dialogRef = this.dialog.open(DeliveryChallanFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: this.deliveryChallan,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  updateStatus(status: 'draft' | 'dispatched' | 'delivered' | 'cancelled'): void {
    if (!this.deliveryChallan) return;
    if (!confirm(`Update status to ${status.toUpperCase()}?`)) return;

    this.deliveryChallansService.updateStatus(this.deliveryChallan.id, status).subscribe({
      next: () => {
        this.snackBar.open('Status updated', 'Close', { duration: 3000 });
        this.load();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to update status',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  downloadPDF(): void {
    if (!this.deliveryChallan) return;
    this.deliveryChallansService.downloadDCPDF(this.deliveryChallan.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `delivery-challan-${this.deliveryChallan?.challanNumber}.pdf`;
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
    if (!this.deliveryChallan) return;
    const dialogRef = this.dialog.open(DCEmailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        dcId: this.deliveryChallan.id,
        customerEmail: this.deliveryChallan.customer?.email,
        challanNumber: this.deliveryChallan.challanNumber,
      },
    });
    dialogRef.afterClosed().subscribe(() => this.load());
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusDisplayLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Draft',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const map: Record<string, 'primary' | 'accent' | 'warn'> = {
      draft: 'accent',
      dispatched: 'primary',
      delivered: 'primary',
      cancelled: 'warn',
    };
    return map[status] || 'accent';
  }
}

