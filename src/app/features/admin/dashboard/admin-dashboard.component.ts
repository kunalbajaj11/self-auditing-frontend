import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, of, combineLatest, Subject } from 'rxjs';
import { catchError, map, switchMap, tap, debounceTime, skip, takeUntil } from 'rxjs/operators';
import { Organization } from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ReportsService } from '../../../core/services/reports.service';
import { GeneratedReport, ReportType } from '../../../core/models/report.model';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { LicenseKeysService } from '../../../core/services/license-keys.service';
import { UploadUsage } from '../../../core/models/license-key.model';
import { ExpensePaymentsService } from '../../../core/services/expense-payments.service';
import { JournalEntriesService, JournalEntryAccount } from '../../../core/services/journal-entries.service';
import {
  AccountEntriesDialogComponent,
  AccountEntriesDialogData,
} from '../reports/account-entries-dialog.component';
import {
  DashboardInvoicesDialogComponent,
  DashboardInvoicesDialogData,
} from './dashboard-invoices-dialog.component';
import {
  DashboardExpensesDialogComponent,
  DashboardExpensesDialogData,
} from './dashboard-expenses-dialog.component';

interface ExpenseSummaryRow {
  category: string;
  type: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
}

interface AccrualSummaryRow {
  status: string;
  count: number;
  amount: number;
}

interface VatSummary {
  taxableAmount: number;
  taxableSupplies: number;
  taxableSales: number;
  vatAmount: number; // Net VAT Payable (Output VAT - Input VAT)
  inputVat: number;
  outputVat: number;
  netVatPayable: number;
  vatPercentage: number;
  outputVatPercentage: number;
}

interface AdminDashboardViewModel {
  organization: Organization;
  totalRevenue: number; // Total sales/credits (income)
  totalExpenses: number; // Total expenses (costs)
  netProfit: number; // Revenue - Expenses (profit/loss)
  vatAmount: number; // Net VAT Payable (Output VAT - Input VAT)
  inputVat: number; // VAT paid on expenses
  outputVat: number; // VAT collected on sales
  taxableAmount: number;
  expenseCount: number;
  averageExpense: number;
  expenseSummary: ExpenseSummaryRow[];
  accrualSummary: AccrualSummaryRow[];
  vatSummary: VatSummary;
  recentExpenses: Expense[];
  period: string; // Current period label
  startDate: string;
  endDate: string;
  // Invoice metrics
  totalInvoices?: number;
  outstandingInvoices?: number;
  outstandingAmount?: number;
  overdueInvoices?: number;
  // New metrics
  receivablesAmount: number;
  vatPayable: number;
  payablesAmount: number;
  bankBalance: number;
  cashBalance: number;
  uploadUsage?: UploadUsage;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  dashboard$!: Observable<AdminDashboardViewModel | null>;
  loading = false;
  error: string | null = null;
  dateRangeForm: FormGroup;
  private readonly destroy$ = new Subject<void>();
  
  readonly dateRangePresets: { value: string; label: string }[] = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly reportsService: ReportsService,
    private readonly expensesService: ExpensesService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly licenseKeysService: LicenseKeysService,
    private readonly expensePaymentsService: ExpensePaymentsService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
  ) {
    // Initialize date range form with current month as default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.dateRangeForm = this.fb.group({
      dateRangePreset: ['thisMonth'],
      startDate: [startOfMonth],
      endDate: [endOfMonth],
    });
  }

  ngOnInit(): void {
    // Watch for date changes (not preset changes) and reload dashboard
    // When dates are manually changed, switch preset to 'custom'
    const startDateControl = this.dateRangeForm.get('startDate');
    const endDateControl = this.dateRangeForm.get('endDate');
    
    if (startDateControl && endDateControl) {
      combineLatest([
        startDateControl.valueChanges,
        endDateControl.valueChanges,
      ])
        .pipe(
          skip(1), // Skip initial emission to avoid double loading on init
          debounceTime(100), // Small debounce to avoid double loading when both dates change
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (this.dateRangeForm.get('dateRangePreset')?.value !== 'custom') {
            this.dateRangeForm.patchValue({ dateRangePreset: 'custom' }, { emitEvent: false });
          }
          this.loadDashboard();
        });
    }
    
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadDashboard();
  }

  /**
   * Open the entries modal for a dashboard tile (same pattern as TB report).
   * Uses the current date range from the form.
   */
  openTileEntries(tile: string): void {
    const { startDate, endDate } = this.getDateRange();

    switch (tile) {
      case 'netProfit':
        this.openAccountEntriesDialog('Sales Revenue', 'Revenue', startDate, endDate);
        break;
      case 'vatPayable':
        this.openAccountEntriesDialog('VAT Payable', 'Liability', startDate, endDate);
        break;
      case 'expenses':
        this.dialog.open(DashboardExpensesDialogComponent, {
          width: '900px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: { startDate, endDate } as DashboardExpensesDialogData,
        });
        break;
      case 'receivables':
        this.openAccountEntriesDialog('Accounts Receivable', 'Asset', startDate, endDate);
        break;
      case 'payables':
        this.openAccountEntriesDialog('Accounts Payable', 'Liability', startDate, endDate);
        break;
      case 'bank':
        this.openAccountEntriesDialog('Bank', 'Asset', startDate, endDate);
        break;
      case 'cash':
        this.openAccountEntriesDialog('Cash', 'Asset', startDate, endDate);
        break;
      case 'totalInvoices':
        this.dialog.open(DashboardInvoicesDialogComponent, {
          width: '900px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: { startDate, endDate } as DashboardInvoicesDialogData,
        });
        break;
      default:
        break;
    }
  }

  private openAccountEntriesDialog(
    accountName: string,
    accountType: string,
    startDate: string,
    endDate: string,
  ): void {
    const data: AccountEntriesDialogData = {
      accountName,
      accountType,
      startDate,
      endDate,
    };
    this.dialog.open(AccountEntriesDialogComponent, {
      width: '1200px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data,
    });
  }

  onDateRangePresetChange(preset: string): void {
    if (preset === 'custom') {
      // Don't change dates, just allow manual selection
      return;
    }

    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        startDate = new Date(lastQuarterYear, lastQuarterMonth, 1);
        endDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    // Update form values without triggering valueChanges to avoid double load
    // We use emitEvent: false so the date change subscriptions don't fire
    this.dateRangeForm.patchValue(
      {
        startDate,
        endDate,
      },
      { emitEvent: false }
    );
    
    // Manually trigger dashboard reload
    this.loadDashboard();
  }

  private getDateRange(): { startDate: string; endDate: string; periodLabel: string } {
    const formValue = this.dateRangeForm.getRawValue();
    const startDate = formValue.startDate instanceof Date 
      ? formValue.startDate.toISOString().split('T')[0]
      : new Date(formValue.startDate).toISOString().split('T')[0];
    const endDate = formValue.endDate instanceof Date
      ? formValue.endDate.toISOString().split('T')[0]
      : new Date(formValue.endDate).toISOString().split('T')[0];
    
    // Format period label
    const start = new Date(startDate);
    const end = new Date(endDate);
    let periodLabel: string;
    
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      // Same month
      periodLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (start.getFullYear() === end.getFullYear()) {
      // Same year, different months
      periodLabel = `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } else {
      // Different years
      periodLabel = `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
    
    return { startDate, endDate, periodLabel };
  }

  private loadDashboard(): void {
    this.loading = true;
    this.error = null;

    // Get date range from form
    const { startDate, endDate, periodLabel } = this.getDateRange();

    this.dashboard$ = this.organizationService.getMyOrganization().pipe(
      takeUntil(this.destroy$),
      switchMap((organization) => {
        // Fetch all expenses once (no date filter) - we'll filter in memory for period calculations
        // This avoids duplicate queries and allows us to use the same data for recent expenses
        const allExpenses$ = this.expensesService.listExpenses({}).pipe(
          catchError(() => of([])),
        );

        return forkJoin({
          organization: of(organization),
          uploadUsage: this.licenseKeysService.getUploadUsage(organization.id).pipe(
            catchError(() => of(undefined)),
          ),
          dashboardSummary: this.reportsService
            .getDashboardSummary({ startDate, endDate })
            .pipe(
              catchError(() => of(null)),
            ),
          allInvoices: this.salesInvoicesService
            .listInvoices({ startDate, endDate })
            .pipe(
              catchError(() => of([]))
            ),
          allExpenses: allExpenses$,
      // Load data for bank and cash balance calculations
      allPayments: this.expensePaymentsService.listPayments().pipe(
        catchError(() => of([]))
      ),
      allJournalEntries: this.journalEntriesService.listEntries({}).pipe(
        catchError(() => of([]))
      ),
      allInvoicePayments: this.salesInvoicesService.listAllPayments().pipe(
        catchError(() => of([]))
      ),
    }).pipe(
      map(
        ({
          organization,
          uploadUsage,
          dashboardSummary,
          allInvoices,
          allExpenses,
          allPayments,
          allJournalEntries,
          allInvoicePayments,
        }) => {
          // Filter expenses for the period
          const periodExpenses = allExpenses.filter(
            (exp) =>
              exp.expenseDate >= startDate && exp.expenseDate <= endDate,
          );

          // Extract data from dashboard summary (lightweight, optimized queries)
          const totalRevenue =
            dashboardSummary?.profitAndLoss?.revenue?.netAmount ?? 0;
          const totalExpenses = dashboardSummary?.profitAndLoss?.expenses?.total ?? 0;
          const netProfit = dashboardSummary?.profitAndLoss?.summary?.netProfit ?? (totalRevenue - totalExpenses);
          const revenueVat =
            dashboardSummary?.profitAndLoss?.revenue?.netVat ?? 0;
          const expenseVat = dashboardSummary?.profitAndLoss?.expenses?.vat ?? 0;
          
          // Use VAT values from backend (matching TB calculation)
          const outputVat = dashboardSummary?.outputVat ?? revenueVat;
          const inputVat = dashboardSummary?.inputVat ?? expenseVat;
          const netVatPayableFromPnL = outputVat - inputVat;
          // Use vatPayableNet when present so dashboard matches the VAT Payable account entries view (includes JEs)
          const netVatPayable =
            dashboardSummary?.vatPayableNet !== undefined &&
            dashboardSummary?.vatPayableNet !== null
              ? dashboardSummary.vatPayableNet
              : netVatPayableFromPnL;
          const taxableAmount = totalRevenue + totalExpenses;

          // Convert expense items from P&L to expense summary format
          // Note: Dashboard summary doesn't include expense items breakdown, so we'll use empty array
          // If detailed breakdown is needed, we can fetch it separately or add to summary endpoint
          const expenseSummary: ExpenseSummaryRow[] = [];

          // Convert payables to accrual summary format
          const accrualSummary: AccrualSummaryRow[] = [];
          if (dashboardSummary?.payables?.summary) {
            accrualSummary.push({
              status: 'pending_settlement',
              count: dashboardSummary.payables.summary.pendingItems ?? 0,
              amount: dashboardSummary.payables.summary.totalAmount ?? 0,
            });
            accrualSummary.push({
              status: 'settled',
              count: dashboardSummary.payables.summary.paidItems ?? 0,
              amount: 0, // Settled items have 0 outstanding
            });
          }

          // Count expenses in period
          const expenseTypes = [
            'expense',
            'adjustment',
            'advance',
            'accrual',
            'fixed_assets',
            'cost_of_sales',
          ];
          const expenseCount = periodExpenses.filter(
            (exp) => expenseTypes.includes(exp.type)
          ).length;

          // Get recent expenses (top 8, sorted by date descending)
          const recentExpenses = allExpenses
            .slice()
            .sort(
              (a, b) =>
                new Date(b.expenseDate).getTime() -
                new Date(a.expenseDate).getTime(),
            )
            .slice(0, 8);

          // Average expense amount (for period)
          const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

          // Invoice metrics: count only tax invoices (exclude proforma and quotations)
          const taxInvoicesOnly =
            allInvoices?.filter((inv) => this.salesInvoicesService.isTaxInvoice(inv.status)) ?? [];
          const totalInvoices = taxInvoicesOnly.length;
          // Outstanding invoices and amounts from dashboard summary (unpaid + partial)
          const outstandingInvoices = (dashboardSummary?.receivables?.summary?.unpaidInvoices ?? 0) + (dashboardSummary?.receivables?.summary?.partialInvoices ?? 0);
          const outstandingAmount = dashboardSummary?.receivables?.summary?.totalOutstanding ?? 0;
          const overdueInvoices = dashboardSummary?.receivables?.summary?.overdueInvoices ?? 0;

          // Receivables amount (total outstanding)
          const receivablesAmount = outstandingAmount ?? 0;

          // VAT Payable: same as netVatPayable (from vatPayableNet or P&L)
          const vatPayable = netVatPayable;

          // Payables amount (total outstanding payables)
          const payablesAmount = dashboardSummary?.payables?.summary?.totalAmount ?? 0;

          // Use cash and bank balances from backend (matching TB calculation)
          const cashBalance = dashboardSummary?.cashBalance ?? 0;
          const bankBalance = dashboardSummary?.bankBalance ?? 0;

          // VAT summary object for compatibility
          const vatSummary: VatSummary = {
            taxableAmount,
            taxableSupplies: totalExpenses,
            taxableSales: totalRevenue,
            vatAmount: netVatPayable,
            inputVat,
            outputVat,
            netVatPayable,
            vatPercentage: totalExpenses > 0 ? (inputVat / totalExpenses) * 100 : 0,
            outputVatPercentage: totalRevenue > 0 ? (outputVat / totalRevenue) * 100 : 0,
          };

          return {
            organization,
            totalRevenue,
            totalExpenses,
            netProfit,
            vatAmount: netVatPayable,
            inputVat,
            outputVat,
            taxableAmount,
            expenseCount,
            averageExpense,
            expenseSummary,
            accrualSummary,
            vatSummary,
            recentExpenses,
            period: periodLabel,
            startDate,
            endDate,
            totalInvoices,
            outstandingInvoices,
            outstandingAmount,
            overdueInvoices,
            receivablesAmount,
            vatPayable,
            payablesAmount,
            bankBalance,
            cashBalance,
            uploadUsage,
          };
        },
      ),
      tap(() => (this.loading = false)),
      catchError(() => {
        this.loading = false;
        this.error = 'Unable to load dashboard data.';
        return of(null);
      }),
      takeUntil(this.destroy$),
    );
      }),
    );
  }
}

