import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreditNotesService, CreditNote } from '../../../core/services/credit-notes.service';
import { CreditNoteApplyDialogComponent } from './credit-note-apply-dialog.component';

@Component({
  selector: 'app-credit-note-detail-dialog',
  templateUrl: './credit-note-detail-dialog.component.html',
  styleUrls: ['./credit-note-detail-dialog.component.scss'],
})
export class CreditNoteDetailDialogComponent implements OnInit {
  creditNote: CreditNote | null = null;
  loading = false;
  remainingAmount = 0;

  constructor(
    private readonly dialogRef: MatDialogRef<CreditNoteDetailDialogComponent>,
    private readonly creditNotesService: CreditNotesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { creditNoteId: string },
  ) {}

  ngOnInit(): void {
    this.loadCreditNote();
  }

  loadCreditNote(): void {
    this.loading = true;
    this.creditNotesService.getCreditNote(this.data.creditNoteId).subscribe({
      next: (creditNote) => {
        this.loading = false;
        this.creditNote = creditNote;
        this.calculateRemaining();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  calculateRemaining(): void {
    if (!this.creditNote) return;
    const totalAmount = parseFloat(this.creditNote.totalAmount || '0');
    const appliedAmount = parseFloat(this.creditNote.appliedAmount || '0');
    this.remainingAmount = Math.max(0, totalAmount - appliedAmount);
  }

  getAppliedAmount(): number {
    if (!this.creditNote) return 0;
    return parseFloat(this.creditNote.appliedAmount || '0');
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
    if (!this.creditNote) return;

    const dialogRef = this.dialog.open(CreditNoteApplyDialogComponent, {
      width: '600px',
      data: { creditNote: this.creditNote },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCreditNote(); // Reload to get updated applied amount
      }
    });
  }

  downloadPDF(): void {
    const creditNote = this.creditNote;
    if (!creditNote) return;
    this.creditNotesService.downloadCreditNotePDF(creditNote.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credit-note-${creditNote.creditNoteNumber ?? creditNote.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Credit note PDF downloaded', 'Close', {
          duration: 2000,
        });
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.message || 'Failed to download credit note PDF',
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

