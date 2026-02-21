import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { CreditNotesService, CreditNote } from '../../../core/services/credit-notes.service';
import { CreditNoteFormDialogComponent } from './credit-note-form-dialog.component';
import { CreditNoteDetailDialogComponent } from './credit-note-detail-dialog.component';

@Component({
  selector: 'app-admin-credit-notes',
  templateUrl: './admin-credit-notes.component.html',
  styleUrls: ['./admin-credit-notes.component.scss'],
})
export class AdminCreditNotesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = [
    'creditNoteNumber',
    'customerName',
    'creditNoteDate',
    'reason',
    'totalAmount',
    'status',
    'appliedAmount',
    'remainingAmount',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<CreditNote>([]);
  loading = false;

  constructor(
    private readonly creditNotesService: CreditNotesService,
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
    this.loadCreditNotes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadCreditNotes(): void {
    this.loading = true;
    this.creditNotesService.listCreditNotes().subscribe({
      next: (creditNotes) => {
        this.loading = false;
        this.dataSource.data = creditNotes;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load credit notes', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreditNoteFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Credit note created successfully', 'Close', {
          duration: 3000,
        });
        this.loadCreditNotes();
      }
    });
  }

  editCreditNote(creditNote: CreditNote): void {
    // Load full credit note details first
    this.creditNotesService.getCreditNote(creditNote.id).subscribe({
      next: (fullCreditNote) => {
        const dialogRef = this.dialog.open(CreditNoteFormDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: fullCreditNote,
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.snackBar.open('Credit note updated successfully', 'Close', {
              duration: 3000,
            });
            this.loadCreditNotes();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load credit note details', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  viewCreditNote(creditNote: CreditNote): void {
    const dialogRef = this.dialog.open(CreditNoteDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { creditNoteId: creditNote.id },
    });

    dialogRef.afterClosed().subscribe(() => {
      // Reload credit notes after closing detail dialog (in case credit note was applied)
      this.loadCreditNotes();
    });
  }

  deleteCreditNote(creditNote: CreditNote): void {
    if (!confirm(`Delete credit note "${creditNote.creditNoteNumber}"?`)) {
      return;
    }
    this.creditNotesService.deleteCreditNote(creditNote.id).subscribe({
      next: () => {
        this.snackBar.open('Credit note deleted', 'Close', { duration: 3000 });
        this.loadCreditNotes();
      },
      error: () => {
        this.snackBar.open('Failed to delete credit note', 'Close', {
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

