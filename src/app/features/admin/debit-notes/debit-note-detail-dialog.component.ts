import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { DebitNoteApplyDialogComponent } from './debit-note-apply-dialog.component';
import { DebitNoteApplyToExpenseDialogComponent } from './debit-note-apply-to-expense-dialog.component';

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
    private readonly snackBar: MatSnackBar,
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
      const dialogRef = this.dialog.open(DebitNoteApplyToExpenseDialogComponent, {
        width: '600px',
        data: { debitNote: this.debitNote },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          // Reload debit note to show updated applied amount
          this.loadDebitNote();
        }
      });
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

  downloadPDF(): void {
    const debitNote = this.debitNote;
    if (!debitNote) return;
    this.debitNotesService.downloadDebitNotePDF(debitNote.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debit-note-${debitNote.debitNoteNumber ?? debitNote.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Debit note PDF downloaded', 'Close', {
          duration: 2000,
        });
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Failed to download debit note PDF',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

