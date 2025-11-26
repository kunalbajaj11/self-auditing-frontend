import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Organization } from '../../../core/models/organization.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ReportsService } from '../../../core/services/reports.service';
import { GeneratedReport } from '../../../core/models/report.model';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';

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
      expenseSummary: this.reportsService
        .generateReport({ 
          type: 'expense_summary',
          filters: { startDate, endDate }
        })
        .pipe(map((report: GeneratedReport<ExpenseSummaryRow[]>) => report.data)),
      accrualSummary: this.reportsService
        .generateReport({ type: 'accrual_report' })
        .pipe(map((report: GeneratedReport<AccrualSummaryRow[]>) => report.data)),
      vatSummary: this.reportsService
        .generateReport({ 
          type: 'vat_report',
          filters: { startDate, endDate }
        })
        .pipe(map((report: GeneratedReport<VatSummary>) => report.data)),
      recentExpenses: this.expensesService
        .listExpenses({ status: 'pending' })
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
          expenseSummary,
          accrualSummary,
          vatSummary,
          recentExpenses,
          allExpenses,
        }) => {
          // Define transaction types according to accounting principles
          // Income/Revenue types (positive, increase profit)
          const revenueTypes = ['credit'];
          
          // Expense types (negative, reduce profit)
          const expenseTypes = [
            'expense',
            'adjustment',
            'advance',
            'accrual',
            'fixed_assets',
            'cost_of_sales',
          ];
          
          // Balance sheet items (excluded from profit/loss calculations)
          const balanceSheetTypes = [
            'share_capital',
            'retained_earnings',
            'shareholder_account',
          ];

          // Calculate total revenue (income) - only credits/sales
          // Use amount (excluding VAT) for revenue calculation, as VAT is a separate liability
          const revenueRows = expenseSummary.filter((row) => {
            // Check both 'type' and 'expenseType' fields for compatibility
            const transactionType = row.type || (row as any).expenseType || '';
            return revenueTypes.includes(transactionType.toLowerCase());
          });
          const totalRevenue = revenueRows.reduce(
            (acc, row) => {
              // For revenue, use amount (base amount excluding VAT)
              // baseAmount is preferred for multi-currency, fallback to amount, then totalAmount
              const revenueAmount = Number(
                (row as any).baseAmount ?? row.amount ?? row.totalAmount ?? 0
              );
              return acc + revenueAmount;
            },
            0,
          );

          // Calculate total expenses - all expense types including accruals
          // Use amount (excluding VAT) for expense calculation, as VAT is handled separately
          const expenseRows = expenseSummary.filter((row) => {
            // Check both 'type' and 'expenseType' fields for compatibility
            const transactionType = row.type || (row as any).expenseType || '';
            return expenseTypes.includes(transactionType.toLowerCase());
          });
          const totalExpenses = expenseRows.reduce(
            (acc, row) => {
              // For expenses, use amount (base amount excluding VAT)
              // baseAmount is preferred for multi-currency, fallback to amount, then totalAmount
              const expenseAmount = Number(
                (row as any).baseAmount ?? row.amount ?? row.totalAmount ?? 0
              );
              return acc + expenseAmount;
            },
            0,
          );

          // Net Profit = Revenue - Expenses (positive = profit, negative = loss)
          const netProfit = totalRevenue - totalExpenses;

          // Count expenses (excluding credits, balance sheet items, but including accruals)
          // Only count processed expenses (approved, settled, auto_settled) - exclude pending/rejected
          const expenseCount = allExpenses.filter(
            (exp) =>
              expenseTypes.includes(exp.type) &&
              (exp.status === 'approved' ||
                exp.status === 'settled' ||
                exp.status === 'auto_settled')
          ).length;

          // Average expense amount (based on total expenses, not net profit)
          const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

          // Pending accruals
          const pendingAccrualRow = accrualSummary.find(
            (row) => row.status === 'pending_settlement',
          );
          const pendingAccruals = pendingAccrualRow?.count ?? 0;
          const pendingAccrualAmount = pendingAccrualRow?.amount ?? 0;

          // Pending approvals
          const pendingApprovals = recentExpenses.filter(
            (expense) => expense.status === 'pending',
          ).length;

          // Extract VAT information from summary
          // Net VAT Payable = Output VAT (from sales) - Input VAT (from expenses)
          const netVatPayable = vatSummary?.netVatPayable ?? vatSummary?.vatAmount ?? 0;
          const inputVat = vatSummary?.inputVat ?? 0;
          const outputVat = vatSummary?.outputVat ?? 0;
          const taxableAmount = vatSummary?.taxableAmount ?? vatSummary?.taxableSupplies ?? 0;

          return {
            organization,
            totalRevenue,
            totalExpenses,
            netProfit,
            vatAmount: netVatPayable, // Net VAT Payable for dashboard display
            inputVat,
            outputVat,
            taxableAmount,
            expenseCount,
            averageExpense,
            pendingAccruals,
            pendingAccrualAmount,
            pendingApprovals,
            expenseSummary: expenseRows, // Only show expense types (exclude revenue and balance sheet items)
            accrualSummary,
            vatSummary,
            recentExpenses,
            period: periodLabel,
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

