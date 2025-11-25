import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense, ExpenseStatus, ExpenseType, Attachment } from '../../../core/models/expense.model';
import { ExpenseFormDialogComponent } from './expense-form-dialog.component';
import { AttachmentsService } from '../../../core/services/attachments.service';
import { ApiService } from '../../../core/services/api.service';
import { TokenService } from '../../../core/services/token.service';

@Component({
  selector: 'app-admin-expenses',
  templateUrl: './admin-expenses.component.html',
  styleUrls: ['./admin-expenses.component.scss'],
})
export class AdminExpensesComponent implements OnInit {
  readonly columns = [
    'vendor',
    'category',
    'amount',
    'type',
    'status',
    'date',
    'attachments',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<Expense>([]);
  loading = false;

  readonly filters;

  currentView: 'list' | 'upload' = 'list';
  showUploadSection = false;
  private pendingAttachment: any = null;
  private dialogOpened = false;
  private ocrTimeout: any = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly expensesService: ExpensesService,
    private readonly attachmentsService: AttachmentsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly tokenService: TokenService,
  ) {
    this.filters = this.fb.group({
      type: [''],
      status: [''],
      startDate: [''],
      endDate: [''],
      vendorName: [''],
    });
  }

  ngOnInit(): void {
    // Check query params to determine view
    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'upload') {
        this.currentView = 'upload';
        this.showUploadSection = true;
      } else {
        this.currentView = 'list';
        this.showUploadSection = false;
        
        // Apply filters based on query params
        if (params['filter'] === 'pending') {
          this.filters.patchValue({ status: 'pending', type: 'accrual' });
        } else if (params['filter'] === 'credits') {
          this.filters.patchValue({ type: 'credit', status: '' });
        } else if (params['filter'] === 'archived') {
          this.filters.patchValue({ status: 'settled', type: '' });
        } else {
          // Default to "All" for type and status when no filter
          this.filters.patchValue({ type: '', status: '' }, { emitEvent: false });
        }
      }
      this.loadExpenses();
    });

    this.filters.valueChanges.subscribe(() => {
      if (this.currentView === 'list') {
        this.loadExpenses();
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: null,
    });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        const message = this.getTransactionTypeMessage(created.type || 'expense');
        this.snackBar.open(message, 'Close', { duration: 3000 });
        this.loadExpenses();
      }
    });
  }

  showUploadView(): void {
    this.router.navigate(['/admin/expenses'], { queryParams: { view: 'upload' } });
  }

  showListView(filter?: string): void {
    const queryParams: any = {};
    if (filter) {
      queryParams.filter = filter;
    }
    // Reset filters to "All" when showing list view
    this.filters.patchValue({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
      vendorName: '',
    }, { emitEvent: false });
    this.router.navigate(['/admin/expenses'], { queryParams });
  }

  updateStatus(expense: Expense, status: ExpenseStatus): void {
    this.expensesService.updateStatus(expense.id, status).subscribe({
      next: (updated) => {
        this.snackBar.open(`Expense marked as ${status}`, 'Close', {
          duration: 3000,
        });
        const index = this.dataSource.data.findIndex((e) => e.id === expense.id);
        if (index !== -1) {
          this.dataSource.data[index] = updated;
          this.dataSource.data = [...this.dataSource.data];
        }
      },
      error: () => {
        this.snackBar.open('Failed to update expense status', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  reload(): void {
    this.loadExpenses();
  }

  private loadExpenses(): void {
    this.loading = true;
    const rawValue = this.filters.getRawValue();
    // Convert Date objects to ISO date strings for API
    const filters = Object.entries(rawValue)
      .filter(([, value]) => value)
      .reduce(
        (acc, [key, value]) => {
          // Convert Date objects to ISO date strings (YYYY-MM-DD format)
          const dateValue = value as any;
          if (dateValue && typeof dateValue === 'object' && dateValue.getTime && typeof dateValue.getTime === 'function') {
            acc[key] = new Date(dateValue).toISOString().substring(0, 10);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, any>,
      );
    this.expensesService.listExpenses(filters).subscribe({
      next: (expenses) => {
        this.loading = false;
        // Sort by date descending (latest first) - backend should already do this, but ensure it
        const sorted = expenses.sort((a, b) => {
          const dateA = new Date(a.expenseDate).getTime();
          const dateB = new Date(b.expenseDate).getTime();
          return dateB - dateA; // Descending order
        });
        this.dataSource.data = sorted;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load expenses', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  get statusOptions(): ExpenseStatus[] {
    return ['pending', 'approved', 'settled', 'auto_settled'];
  }

  get typeOptions(): ExpenseType[] {
    return [
      'expense',
      'credit',
      'adjustment',
      'advance',
      'accrual',
      'fixed_assets',
      'share_capital',
      'retained_earnings',
      'shareholder_account',
      'cost_of_sales',
    ];
  }

  onFileUploaded(result: any): void {
    // Store attachment
    this.pendingAttachment = result;
    
    // If OCR is not enabled or file is not an image, open dialog immediately
    // Otherwise, wait for OCR result
    // Note: We can't easily detect if OCR is enabled here, so we'll use a timeout
    // If OCR doesn't complete within 5 seconds, open dialog with just attachment
    if (this.ocrTimeout) {
      clearTimeout(this.ocrTimeout);
    }
    this.ocrTimeout = setTimeout(() => {
      if (this.pendingAttachment && !this.dialogOpened) {
        // OCR didn't complete or wasn't enabled, open dialog with just attachment
        this.openExpenseDialog(this.pendingAttachment, null);
      }
    }, 5000); // Wait 5 seconds for OCR
  }

  onOcrResult(result: any): void {
    // Clear the timeout since OCR completed
    if (this.ocrTimeout) {
      clearTimeout(this.ocrTimeout);
      this.ocrTimeout = null;
    }
    
    // OCR result available, open expense form with both attachment and OCR data
    if (this.dialogOpened) {
      return; // Prevent opening dialog twice
    }
    
    this.openExpenseDialog(this.pendingAttachment, result);
  }

  private openExpenseDialog(attachment: any, ocrResult: any): void {
    if (this.dialogOpened) {
      return; // Prevent opening dialog twice
    }
    
    this.dialogOpened = true;
    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: { 
        attachment: attachment,
        ocrResult: ocrResult 
      },
    });
    
    dialogRef.afterClosed().subscribe((created) => {
      this.dialogOpened = false;
      this.pendingAttachment = null;
      if (created) {
        const message = this.getTransactionTypeMessage(created.type || 'expense');
        this.snackBar.open(message, 'Close', { duration: 3000 });
        this.showListView();
        this.loadExpenses();
      }
    });
  }

  viewAttachment(attachment: Attachment): void {
    console.log('[ViewAttachment] Clicked', { attachmentId: attachment?.id, fileName: attachment?.fileName });
    if (!attachment.id) {
      console.warn('[ViewAttachment] Invalid attachment object', attachment);
      this.snackBar.open('Invalid attachment', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    // Open a blank tab synchronously to avoid popup blocker
    const pendingWindow = window.open('', '_blank');
    if (!pendingWindow) {
      this.snackBar.open('Please allow popups to view attachments', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }
    // Fetch signed URL via authenticated XHR, then navigate opened tab
    this.attachmentsService.viewAttachment(attachment.id).subscribe({
      next: (result) => {
        if (!result?.url) {
          console.warn('[ViewAttachment] No URL returned from API, falling back to backend direct URL', result);
          const token = this.tokenService.getTokens()?.accessToken;
          const directUrl = token
            ? `${this.api.getBaseUrl()}/attachments/view/${attachment.id}?access_token=${encodeURIComponent(token)}`
            : `${this.api.getBaseUrl()}/attachments/view/${attachment.id}`;
          pendingWindow.location.href = directUrl;
          return; 
        }
        console.log('[ViewAttachment] Navigating opened tab to signed URL', result.url);
        pendingWindow.location.href = result.url;
      },
      error: (err) => {
        console.error('[ViewAttachment] API error', err);
        pendingWindow.close();
        this.snackBar.open('Unable to view attachment', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  downloadAttachment(attachment: Attachment): void {
    console.log('[DownloadAttachment] Clicked', { attachmentId: attachment?.id, fileName: attachment?.fileName });
    if (!attachment.id) {
      console.warn('[DownloadAttachment] Invalid attachment object', attachment);
      this.snackBar.open('Invalid attachment', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    // Open a blank tab synchronously to avoid popup blocker
    const pendingWindow = window.open('', '_blank');
    if (!pendingWindow) {
      this.snackBar.open('Please allow popups to download attachments', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }
    // Fetch signed URL via authenticated XHR, then navigate opened tab
    this.attachmentsService.downloadAttachment(attachment.id).subscribe({
      next: (result) => {
        if (!result?.url) {
          console.warn('[DownloadAttachment] No URL returned from API, falling back to backend direct URL', result);
          const token = this.tokenService.getTokens()?.accessToken;
          const directUrl = token
            ? `${this.api.getBaseUrl()}/attachments/download/${attachment.id}?access_token=${encodeURIComponent(token)}`
            : `${this.api.getBaseUrl()}/attachments/download/${attachment.id}`;
          pendingWindow.location.href = directUrl;
          return; 
        }
        console.log('[DownloadAttachment] Navigating opened tab to signed URL', result.url);
        pendingWindow.location.href = result.url;
      },
      error: (err) => {
        console.error('[DownloadAttachment] API error', err);
        pendingWindow.close();
        this.snackBar.open('Unable to download attachment', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }


  getAttachmentCount(expense: Expense): number {
    return expense.attachments?.length || 0;
  }

  private getTransactionTypeMessage(type: ExpenseType): string {
    const messages: Record<ExpenseType, string> = {
      expense: 'Expense recorded successfully',
      credit: 'Sale recorded successfully',
      adjustment: 'Adjustment recorded successfully',
      advance: 'Advance recorded successfully',
      accrual: 'Accrual recorded successfully',
      fixed_assets: 'Fixed asset recorded successfully',
      share_capital: 'Share capital recorded successfully',
      retained_earnings: 'Retained earnings recorded successfully',
      shareholder_account: 'Shareholder account recorded successfully',
      cost_of_sales: 'Cost of sales recorded successfully',
    };
    return messages[type] || 'Transaction recorded successfully';
  }
}

