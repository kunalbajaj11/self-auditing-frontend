import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { DebitNoteApplyDialogComponent } from './debit-note-apply-dialog.component';

@Component({
  selector: 'app-debit-note-detail-dialog',
  templateUrl: './debit-note-detail-dialog.component.html',
  styleUrls: ['./debit-note-detail-dialog.component.scss'],
})
export class DebitNoteDetailDialogComponent implements OnInit {
  debitNote: DebitNote | null = null;
  loading = false;
  remainingAmount = 0;

  constructor(
    private readonly dialogRef: MatDialogRef<DebitNoteDetailDialogComponent>,
    private readonly debitNotesService: DebitNotesService,
    private readonly dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { debitNoteId: string },
  ) {}

  ngOnInit(): void {
    this.loadDebitNote();
  }

  loadDebitNote(): void {
    this.loading = true;
    this.debitNotesService.getDebitNote(this.data.debitNoteId).subscribe({
      next: (debitNote) => {
        this.loading = false;
        this.debitNote = debitNote;
        this.calculateRemaining();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  calculateRemaining(): void {
    if (!this.debitNote) return;
    const totalAmount = parseFloat(this.debitNote.totalAmount || '0');
    const appliedAmount = parseFloat(this.debitNote.appliedAmount || '0');
    this.remainingAmount = Math.max(0, totalAmount - appliedAmount);
  }

  getAppliedAmount(): number {
    if (!this.debitNote) return 0;
    return parseFloat(this.debitNote.appliedAmount || '0');
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'applied':
        return 'primary';
      case 'issued':
        return 'accent';
      case 'cancelled':
        return 'warn';
      default:
        return 'accent';
    }
  }

  openApplyDialog(): void {
    if (!this.debitNote) return;
    
    // Check if this is a customer debit note (linked to invoice) or supplier debit note (linked to expense)
    if (this.debitNote.invoiceId || this.debitNote.invoice?.id) {
      // Customer debit note - apply to invoice
      const dialogRef = this.dialog.open(DebitNoteApplyDialogComponent, {
        width: '600px',
        data: { debitNote: this.debitNote },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          // Reload debit note to show updated applied amount
          this.loadDebitNote();
        }
      });
    } else if (this.debitNote.expenseId || this.debitNote.expense?.id) {
      // Supplier debit note - apply to expense
      // TODO: Create apply-to-expense dialog component
      // For now, show a message
      alert('Apply to expense functionality will be available soon. This debit note is linked to an expense.');
    } else {
      alert('This debit note is not linked to an invoice or expense. Please link it first.');
    }
  }

  canApply(): boolean {
    if (!this.debitNote) return false;
    // Can apply if status is ISSUED and there's remaining amount
    return (
      this.debitNote.status?.toLowerCase() === 'issued' &&
      this.remainingAmount > 0
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}

