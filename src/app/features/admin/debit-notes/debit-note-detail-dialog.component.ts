import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
// Apply dialog can be added later if needed

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

  // Apply dialog can be added later if needed
  // openApplyDialog(): void {
  //   if (!this.debitNote) return;
  //   // Implementation for applying debit note to invoice
  // }

  close(): void {
    this.dialogRef.close();
  }
}

