import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Organization } from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ReportsService } from '../../../core/services/reports.service';
import { GeneratedReport, ReportType } from '../../../core/models/report.model';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';

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
  pendingAccruals: number;
  pendingAccrualAmount: number;
  pendingApprovals: number;
  expenseSummary: ExpenseSummaryRow[];
  accrualSummary: AccrualSummaryRow[];
  vatSummary: VatSummary;
  recentExpenses: Expense[];
  period: string; // Current period label
  // Invoice metrics (to be populated when frontend services implemented)
  totalInvoices?: number;
  outstandingInvoices?: number;
  outstandingAmount?: number;
  overdueInvoices?: number;
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

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly reportsService: ReportsService,
    private readonly expensesService: ExpensesService,
    private readonly salesInvoicesService: SalesInvoicesService,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading = true;
    this.error = null;

    // Get current month date range for accurate calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];
    const periodLabel = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Get all expenses for accurate calculations
    const allExpenses$ = this.expensesService.listExpenses({
      startDate,
      endDate,
    });

    this.dashboard$ = forkJoin({
      organization: this.organizationService.getMyOrganization(),
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
    }).pipe(
      map(
        ({
          organization,
          profitAndLoss,
          payables,
          receivables,
          allInvoices,
          recentExpenses,
          allExpenses,
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

          // Pending accruals from payables report
          const pendingAccruals = payables?.summary?.pendingItems ?? 0;
          const pendingAccrualAmount = payables?.summary?.totalAmount ?? 0;

          // Pending approvals (removed - no longer tracking status)
          const pendingApprovals = 0;

          // Invoice metrics
          // Total invoices: count all invoices in the period
          const totalInvoices = allInvoices?.length ?? 0;
          // Outstanding invoices and amounts from receivables report (unpaid + partial)
          const outstandingInvoices = (receivables?.summary?.unpaidInvoices ?? 0) + (receivables?.summary?.partialInvoices ?? 0);
          const outstandingAmount = receivables?.summary?.totalOutstanding ?? 0;
          const overdueInvoices = receivables?.summary?.overdueInvoices ?? 0;

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
            pendingAccruals,
            pendingAccrualAmount,
            pendingApprovals,
            expenseSummary,
            accrualSummary,
            vatSummary,
            recentExpenses,
            period: periodLabel,
            totalInvoices,
            outstandingInvoices,
            outstandingAmount,
            overdueInvoices,
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
  }
}

