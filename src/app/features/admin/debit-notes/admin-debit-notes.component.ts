import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { DebitNoteFormDialogComponent } from './debit-note-form-dialog.component';
import { DebitNoteDetailDialogComponent } from './debit-note-detail-dialog.component';

@Component({
  selector: 'app-admin-debit-notes',
  templateUrl: './admin-debit-notes.component.html',
  styleUrls: ['./admin-debit-notes.component.scss'],
})
export class AdminDebitNotesComponent implements OnInit {
  readonly columns = [
    'debitNoteNumber',
    'customerName',
    'debitNoteDate',
    'reason',
    'totalAmount',
    'status',
    'appliedAmount',
    'remainingAmount',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<DebitNote>([]);
  loading = false;

  constructor(
    private readonly debitNotesService: DebitNotesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'create') {
        this.openCreateDialog();
      }
    });
    this.loadDebitNotes();
  }

  loadDebitNotes(): void {
    this.loading = true;
    this.debitNotesService.listDebitNotes().subscribe({
      next: (debitNotes) => {
        this.loading = false;
        this.dataSource.data = debitNotes;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load debit notes', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DebitNoteFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Debit note created successfully', 'Close', {
          duration: 3000,
        });
        this.loadDebitNotes();
      }
    });
  }

  editDebitNote(debitNote: DebitNote): void {
    // Load full debit note details first
    this.debitNotesService.getDebitNote(debitNote.id).subscribe({
      next: (fullDebitNote) => {
        const dialogRef = this.dialog.open(DebitNoteFormDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: fullDebitNote,
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.snackBar.open('Debit note updated successfully', 'Close', {
              duration: 3000,
            });
            this.loadDebitNotes();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load debit note details', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  viewDebitNote(debitNote: DebitNote): void {
    const dialogRef = this.dialog.open(DebitNoteDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { debitNoteId: debitNote.id },
    });

    dialogRef.afterClosed().subscribe(() => {
      // Reload debit notes after closing detail dialog (in case debit note was applied)
      this.loadDebitNotes();
    });
  }

  deleteDebitNote(debitNote: DebitNote): void {
    if (!confirm(`Delete debit note "${debitNote.debitNoteNumber}"?`)) {
      return;
    }
    this.debitNotesService.deleteDebitNote(debitNote.id).subscribe({
      next: () => {
        this.snackBar.open('Debit note deleted', 'Close', { duration: 3000 });
        this.loadDebitNotes();
      },
      error: () => {
        this.snackBar.open('Failed to delete debit note', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
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
}

