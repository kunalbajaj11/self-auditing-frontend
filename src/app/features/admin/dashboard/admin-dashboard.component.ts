import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, forkJoin, of, combineLatest } from 'rxjs';
import { catchError, map, switchMap, tap, debounceTime, skip } from 'rxjs/operators';
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
export class AdminDashboardComponent implements OnInit {
  dashboard$!: Observable<AdminDashboardViewModel | null>;
  loading = false;
  error: string | null = null;
  dateRangeForm: FormGroup;
  
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
          debounceTime(100) // Small debounce to avoid double loading when both dates change
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

  refresh(): void {
    this.loadDashboard();
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

    // Get all expenses for accurate calculations
    const allExpenses$ = this.expensesService.listExpenses({
      startDate,
      endDate,
    });

    this.dashboard$ = this.organizationService.getMyOrganization().pipe(
      switchMap((organization) => {
        return forkJoin({
          organization: of(organization),
          uploadUsage: this.licenseKeysService.getUploadUsage(organization.id).pipe(
            catchError(() => of(undefined)),
          ),
          profitAndLoss: this.reportsService
        .generateReport({ 
          type: 'profit_and_loss' as ReportType,
          filters: { startDate, endDate }
        })
        .pipe(
          catchError(() => of({ type: 'profit_and_loss' as ReportType, generatedAt: new Date().toISOString(), data: null } as GeneratedReport<any>)),
          map((report: GeneratedReport<any>) => report.data)
        ),
      payables: this.reportsService
        .generateReport({ type: 'payables' as ReportType })
        .pipe(
          catchError(() => of({ type: 'payables' as ReportType, generatedAt: new Date().toISOString(), data: null } as GeneratedReport<any>)),
          map((report: GeneratedReport<any>) => report.data)
        ),
      receivables: this.reportsService
        .generateReport({ type: 'receivables' as ReportType, filters: { endDate } })
        .pipe(
          catchError(() => of({ type: 'receivables' as ReportType, generatedAt: new Date().toISOString(), data: null } as GeneratedReport<any>)),
          map((report: GeneratedReport<any>) => report.data)
        ),
      allInvoices: this.salesInvoicesService
        .listInvoices({ startDate, endDate })
        .pipe(
          catchError(() => of([]))
        ),
      recentExpenses: this.expensesService
        .listExpenses({})
        .pipe(
          map((expenses) =>
            expenses
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.expenseDate).getTime() -
                  new Date(a.expenseDate).getTime(),
              )
              .slice(0, 8),
          ),
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
          profitAndLoss,
          payables,
          receivables,
          allInvoices,
          recentExpenses,
          allExpenses,
          allPayments,
          allJournalEntries,
          allInvoicePayments,
        }) => {
          // Extract data from profit and loss report
          // Revenue is from sales invoices only (not expenses)
          const totalRevenue = profitAndLoss?.revenue?.amount ?? 0;
          const totalExpenses = profitAndLoss?.expenses?.total ?? 0;
          // Calculate net profit explicitly: Revenue (sales only) - Expenses
          const netProfit = totalRevenue - totalExpenses;
          const revenueVat = profitAndLoss?.revenue?.vat ?? 0;
          const expenseVat = profitAndLoss?.expenses?.vat ?? 0;
          
          // Calculate VAT summary from P&L data
          const inputVat = expenseVat;
          const outputVat = revenueVat;
          const netVatPayable = outputVat - inputVat;
          const taxableAmount = totalRevenue + totalExpenses;

          // Convert expense items from P&L to expense summary format
          const expenseSummary: ExpenseSummaryRow[] = (profitAndLoss?.expenses?.items ?? []).map((item: any) => ({
            category: item.category,
            type: 'expense',
            amount: item.amount,
            vatAmount: item.vat,
            totalAmount: item.total,
          }));

          // Convert payables to accrual summary format
          const accrualSummary: AccrualSummaryRow[] = [];
          if (payables?.summary) {
            accrualSummary.push({
              status: 'pending_settlement',
              count: payables.summary.pendingItems ?? 0,
              amount: payables.summary.totalAmount ?? 0,
            });
            accrualSummary.push({
              status: 'settled',
              count: payables.summary.paidItems ?? 0,
              amount: 0, // Settled items have 0 outstanding
            });
          }

          // Count expenses
          const expenseTypes = [
            'expense',
            'adjustment',
            'advance',
            'accrual',
            'fixed_assets',
            'cost_of_sales',
          ];
          const expenseCount = allExpenses.filter(
            (exp) => expenseTypes.includes(exp.type)
          ).length;

          // Average expense amount
          const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

          // Invoice metrics
          // Total invoices: count all invoices in the period
          const totalInvoices = allInvoices?.length ?? 0;
          // Outstanding invoices and amounts from receivables report (unpaid + partial)
          const outstandingInvoices = (receivables?.summary?.unpaidInvoices ?? 0) + (receivables?.summary?.partialInvoices ?? 0);
          const outstandingAmount = receivables?.summary?.totalOutstanding ?? 0;
          const overdueInvoices = receivables?.summary?.overdueInvoices ?? 0;

          // Receivables amount (total outstanding)
          const receivablesAmount = outstandingAmount ?? 0;

          // VAT Payable (net VAT)
          const vatPayable = netVatPayable;

          // Payables amount (total outstanding payables)
          const payablesAmount = payables?.summary?.totalAmount ?? 0;

          // Calculate Bank Balance
          // Bank transactions include:
          // 1. Expense payments with paymentMethod = 'bank_transfer'
          // 2. Invoice payments with paymentMethod = 'bank_transfer'
          // 3. Journal entries with status = 'BANK_PAID' or 'BANK_RECEIVED'
          let bankBalance = 0;
          
          // Bank payments (expenses paid via bank - negative)
          const bankPayments = allPayments.filter(p => p.paymentMethod === 'bank_transfer');
          bankPayments.forEach(payment => {
            bankBalance -= parseFloat(payment.amount.toString());
          });

          // Bank invoice payments (invoices paid via bank - positive)
          const bankInvoicePayments = allInvoicePayments.filter(p => p.paymentMethod === 'bank_transfer');
          bankInvoicePayments.forEach(payment => {
            bankBalance += parseFloat(payment.amount);
          });

          // Bank journal entries
          const bankJournalEntries = allJournalEntries.filter(
            entry =>
              entry.debitAccount === JournalEntryAccount.CASH_BANK ||
              entry.creditAccount === JournalEntryAccount.CASH_BANK,
          );
          bankJournalEntries.forEach((entry) => {
            const amount = parseFloat(entry.amount.toString());
            if (entry.debitAccount === JournalEntryAccount.CASH_BANK) {
              bankBalance += amount;
            } else if (entry.creditAccount === JournalEntryAccount.CASH_BANK) {
              bankBalance -= amount;
            }
          });

          // Calculate Cash Balance
          // Cash transactions include:
          // 1. Expenses with purchaseStatus = 'Purchase - Cash Paid' (negative)
          // 2. Invoices with status = 'tax_invoice_cash_received' (positive)
          // 3. Invoice payments with paymentMethod = 'cash' (positive)
          // 4. Journal entries with status = 'CASH_PAID' or 'CASH_RECEIVED'
          let cashBalance = 0;

          // Cash expenses (negative)
          const cashExpenses = allExpenses.filter(exp => exp.purchaseStatus === 'Purchase - Cash Paid');
          cashExpenses.forEach(expense => {
            cashBalance -= expense.totalAmount;
          });

          // Cash invoice payments (positive)
          const cashInvoicePayments = allInvoicePayments.filter(p => p.paymentMethod === 'cash');
          cashInvoicePayments.forEach(payment => {
            cashBalance += parseFloat(payment.amount);
          });

          // Invoices with cash received status (positive)
          const cashReceivedInvoices = allInvoices.filter(
            inv => inv.status === 'tax_invoice_cash_received' && 
            !cashInvoicePayments.some(p => p.invoice?.id === inv.id) // Exclude if already counted in payments
          );
          cashReceivedInvoices.forEach(invoice => {
            cashBalance += parseFloat(invoice.totalAmount);
          });

          // Cash journal entries
          const cashJournalEntries = allJournalEntries.filter(
            entry =>
              entry.debitAccount === JournalEntryAccount.CASH_BANK ||
              entry.creditAccount === JournalEntryAccount.CASH_BANK,
          );
          cashJournalEntries.forEach((entry) => {
            const amount = parseFloat(entry.amount.toString());
            if (entry.debitAccount === JournalEntryAccount.CASH_BANK) {
              cashBalance += amount;
            } else if (entry.creditAccount === JournalEntryAccount.CASH_BANK) {
              cashBalance -= amount;
            }
          });

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
        );
      }),
    );
  }
}

