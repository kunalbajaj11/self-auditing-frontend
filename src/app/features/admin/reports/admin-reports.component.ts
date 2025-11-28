import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { ReportsService } from '../../../core/services/reports.service';
import { ApiService } from '../../../core/services/api.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { UsersService } from '../../../core/services/users.service';
import { GeneratedReport, ReportHistoryItem, ReportType } from '../../../core/models/report.model';
import { ExpenseStatus, ExpenseType } from '../../../core/models/expense.model';
import { AuthUser } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss'],
})
export class AdminReportsComponent implements OnInit {
  // Report categories with icons and colors (like Xero/Zoho)
  readonly reportCategories = [
    {
      id: 'expenses',
      label: 'Expenses',
      icon: 'receipt_long',
      color: '#1976d2',
      description: 'Track and analyze expense data',
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: 'account_balance',
      color: '#2e7d32',
      description: 'Financial statements and balances',
    },
    {
      id: 'vat',
      label: 'VAT & Tax',
      icon: 'gavel',
      color: '#ed6c02',
      description: 'VAT reports and tax compliance',
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: 'settings',
      color: '#9c27b0',
      description: 'Operational and audit reports',
    },
  ];

  // Report types organized by category
  readonly reportTypesByCategory: Record<string, Array<{ value: ReportType; label: string; icon: string; description: string; color?: string }>> = {
    expenses: [
      { value: 'expense_summary', label: 'Expense Summary', icon: 'summarize', description: 'Overview of expenses by category and period' },
      { value: 'expense_detail', label: 'Expense Detail', icon: 'list_alt', description: 'Detailed line-by-line expense records' },
      { value: 'employee_report', label: 'Employee Expenses', icon: 'people', description: 'Expenses grouped by employee' },
      { value: 'vendor_report', label: 'Vendor Analysis', icon: 'store', description: 'Expenses by vendor and payment trends' },
    ],
    financial: [
      { value: 'trial_balance', label: 'Trial Balance', icon: 'balance', description: 'Account balances and financial position' },
      { value: 'bank_reconciliation', label: 'Bank Reconciliation', icon: 'sync_alt', description: 'Reconcile bank statements with expenses' },
      { value: 'accrual_report', label: 'Accrual Report', icon: 'pending_actions', description: 'Pending and settled accruals' },
    ],
    vat: [
      { value: 'vat_report', label: 'VAT Report', icon: 'receipt', description: 'VAT input, output, and payable calculations' },
    ],
    operations: [
      { value: 'trend_report', label: 'Monthly Trends', icon: 'trending_up', description: 'Expense trends and patterns over time' },
      { value: 'audit_trail', label: 'Audit Trail', icon: 'history', description: 'Complete audit log of all transactions' },
      { value: 'attachments_report', label: 'Attachments Report', icon: 'attach_file', description: 'Report of all expense attachments' },
    ],
  };

  readonly reportTypes: { value: ReportType; label: string }[] = [
    { value: 'expense_summary', label: 'Expense Summary' },
    { value: 'expense_detail', label: 'Expense Detail' },
    { value: 'accrual_report', label: 'Accrual Report' },
    { value: 'vat_report', label: 'VAT Report' },
    { value: 'vendor_report', label: 'Vendor Report' },
    { value: 'employee_report', label: 'Employee Report' },
    { value: 'trend_report', label: 'Monthly Trend' },
    { value: 'audit_trail', label: 'Audit Trail' },
    { value: 'bank_reconciliation', label: 'Bank Reconciliation' },
    { value: 'attachments_report', label: 'Attachments Report' },
    { value: 'trial_balance', label: 'Trial Balance' },
  ];

  readonly statusOptions: ExpenseStatus[] = ['pending', 'approved', 'settled', 'auto_settled'];
  readonly typeOptions: ExpenseType[] = ['expense', 'credit', 'adjustment', 'advance', 'accrual'];
  readonly formatOptions: { value: 'pdf' | 'xlsx' | 'csv'; label: string; icon: string }[] = [
    { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
    { value: 'xlsx', label: 'Excel', icon: 'table_chart' },
    { value: 'csv', label: 'CSV', icon: 'description' },
  ];
  readonly dateRangePresets: { value: string; label: string }[] = [
    { value: '', label: 'Custom Range' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'lastQuarter', label: 'Last Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'financialYear', label: 'Financial Year' },
  ];
  readonly fileTypeOptions: string[] = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'csv'];

  readonly form;
  readonly scheduleForm;

  categories: Category[] = [];
  vendors: string[] = [];
  users: AuthUser[] = [];
  generatedReport: GeneratedReport | null = null;
  history: ReportHistoryItem[] = [];
  loading = false;
  loadingFilters = false;
  showScheduleDialog = false;
  currentView: 'generate' | 'schedule' | 'history' | 'compare' = 'generate';
  
  // Category-based navigation
  selectedCategory: string = 'expenses';
  selectedReportType: ReportType | null = null;
  showReportConfig = false;

  currentReportType: ReportType = 'expense_summary';
  comparisonMode = false;
  comparisonReport1: GeneratedReport | null = null;
  comparisonReport2: GeneratedReport | null = null;
  readonly compareForm;

  // UI: compact table columns and details modal state
  displayedSummaryColumns: string[] = ['date', 'category', 'vendor', 'total', 'details'];
  selectedRow: any | null = null;
  showDetails = false;
  @ViewChild('detailsDialog') detailsDialog?: TemplateRef<any>;
  @ViewChild('reportPreviewCard') reportPreviewCard?: ElementRef;
  
  // Form collapse state
  formExpanded = true;
  
  // Chart data cache to prevent flickering
  private chartDataCache = new Map<string, any>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly reportsService: ReportsService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly dialog: MatDialog,
  ) {
    this.form = this.fb.group({
      type: ['expense_summary' as ReportType],
      format: ['pdf' as 'pdf' | 'xlsx' | 'csv'],
      dateRangePreset: [''],
      startDate: [''],
      endDate: [''],
      categoryId: [[] as string[]],
      vendorName: [[] as string[]],
      status: [[] as ExpenseStatus[]],
      expenseType: [[] as ExpenseType[]],
      userId: [[] as string[]],
      minAmount: [''],
      maxAmount: [''],
      bankAccount: [''],
      fileType: [''],
    });

    this.scheduleForm = this.fb.group({
      type: ['expense_summary' as ReportType],
      format: ['pdf' as 'pdf' | 'xlsx' | 'csv'],
      startDate: [''],
      endDate: [''],
      categoryId: [[] as string[]],
      vendorName: [[] as string[]],
      status: [[] as ExpenseStatus[]],
      expenseType: [[] as ExpenseType[]],
      userId: [[] as string[]],
      recipientEmail: [''],
      schedule: ['monthly' as 'daily' | 'weekly' | 'monthly'],
      nextRun: [''],
    });

    this.compareForm = this.fb.group({
      type: ['expense_summary' as ReportType],
      period1StartDate: [''],
      period1EndDate: [''],
      period2StartDate: [''],
      period2EndDate: [''],
    });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.selectedReportType = null;
    this.showReportConfig = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: categoryId },
      queryParamsHandling: 'merge',
    });
  }

  selectReportType(reportType: ReportType): void {
    this.selectedReportType = reportType;
    this.showReportConfig = true;
    this.form.patchValue({ type: reportType });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: this.selectedCategory, report: reportType },
      queryParamsHandling: 'merge',
    });
  }

  backToCategoryView(): void {
    this.selectedReportType = null;
    this.showReportConfig = false;
    this.generatedReport = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: this.selectedCategory },
      queryParamsHandling: 'merge',
    });
  }

  getSelectedReportInfo(property: 'icon' | 'label' | 'description'): string {
    if (!this.selectedReportType || !this.selectedCategory) {
      return '';
    }
    const reports = this.reportTypesByCategory[this.selectedCategory];
    if (!reports) {
      return '';
    }
    const report = reports.find(r => r.value === this.selectedReportType);
    return report ? report[property] : '';
  }

  getCategoryInfo(property: 'icon' | 'label' | 'description' | 'color'): string {
    if (!this.selectedCategory) {
      return '';
    }
    const category = this.reportCategories.find(c => c.id === this.selectedCategory);
    return category ? category[property] : '';
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadHistory();

    // Check query params to set category and report type
    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        this.selectedCategory = params['category'];
      }
      if (params['report']) {
        this.selectedReportType = params['report'] as ReportType;
        this.showReportConfig = true;
        this.form.patchValue({ type: params['report'] });
      }
      if (params['type']) {
        const typeMap: Record<string, ReportType> = {
          'monthly': 'trend_report',
          'vat': 'vat_report',
          'category': 'expense_summary',
          'audit': 'expense_summary',
          'expense': 'expense_summary',
          'financial': 'trial_balance',
          'sales': 'expense_summary',
          'payments': 'expense_summary',
        };
        // Map to category
        const categoryMap: Record<string, string> = {
          'expense': 'expenses',
          'vat': 'vat',
          'financial': 'financial',
          'sales': 'expenses',
          'payments': 'expenses',
        };
        if (categoryMap[params['type']]) {
          this.selectedCategory = categoryMap[params['type']];
        }
        const reportType = typeMap[params['type']] || 'expense_summary';
        this.currentReportType = reportType;
        this.form.patchValue({ type: reportType });
      }
      if (params['view']) {
        this.currentView = params['view'] as 'generate' | 'schedule' | 'history' | 'compare';
      }
    });
  }

  loadFilterOptions(): void {
    this.loadingFilters = true;
    this.categoriesService.listCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loadingFilters = false;
      },
      error: () => {
        this.loadingFilters = false;
      },
    });

    this.reportsService.getFilterOptions().subscribe({
      next: (options) => {
        this.vendors = options.vendors || [];
      },
      error: () => {
        this.vendors = [];
      },
    });

    this.usersService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: () => {
        this.users = [];
      },
    });
  }

  onDateRangePresetChange(preset: string): void {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

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
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
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
      case 'financialYear':
        // UAE financial year typically starts in January
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    this.form.patchValue({
      startDate: startDate.toISOString().substring(0, 10),
      endDate: endDate.toISOString().substring(0, 10),
    });
  }

  generate(): void {
    const rawValue = this.form.getRawValue();
    const type = rawValue['type'];
    const format = rawValue['format'];
    const startDate = rawValue['startDate'];
    const endDate = rawValue['endDate'];
    const categoryId = rawValue['categoryId'] as string[];
    const vendorName = rawValue['vendorName'] as string[];
    const status = rawValue['status'] as ExpenseStatus[];
    const expenseType = rawValue['expenseType'] as ExpenseType[];
    const userId = rawValue['userId'] as string[];
    const minAmount = rawValue['minAmount'];
    const maxAmount = rawValue['maxAmount'];
    const bankAccount = rawValue['bankAccount'];
    const fileType = rawValue['fileType'];
    this.loading = true;
    this.generatedReport = null;
    
    // Collapse form immediately when generating
    this.formExpanded = false;
    
    // Convert Date objects to ISO date strings for API
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (date && typeof date === 'object' && date.getTime && typeof date.getTime === 'function') {
        return new Date(date).toISOString().substring(0, 10);
      }
      return date;
    };
    
    // Build filters object
    const filters: Record<string, any> = {};
    if (startDate) filters['startDate'] = formatDate(startDate);
    if (endDate) filters['endDate'] = formatDate(endDate);
    if (categoryId && categoryId.length > 0) filters['categoryId'] = categoryId.length === 1 ? categoryId[0] : categoryId;
    if (vendorName && vendorName.length > 0) filters['vendorName'] = vendorName.length === 1 ? vendorName[0] : vendorName;
    if (status && status.length > 0) filters['status'] = status.length === 1 ? status[0] : status;
    if (expenseType && expenseType.length > 0) filters['type'] = expenseType.length === 1 ? expenseType[0] : expenseType;
    if (userId && userId.length > 0) filters['userId'] = userId.length === 1 ? userId[0] : userId;
    if (minAmount) filters['minAmount'] = Number(minAmount);
    if (maxAmount) filters['maxAmount'] = Number(maxAmount);
    if (bankAccount) filters['bankAccount'] = bankAccount;
    if (fileType) filters['fileType'] = fileType;
    
    this.reportsService
      .generateReport({
        type: type ?? 'expense_summary',
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        format: format || 'json',
      })
      .subscribe({
        next: (report) => {
          this.loading = false;
          this.generatedReport = report;
          // Clear chart cache when new report is generated
          this.chartDataCache.clear();
          this.snackBar.open('Report generated', 'Close', { duration: 3000 });
          this.loadHistory();
          
          // Scroll to results after a short delay to ensure DOM is updated
          setTimeout(() => {
            this.scrollToReportPreview();
          }, 300);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Failed to generate report', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  schedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const rawValue = this.scheduleForm.getRawValue();
    const type = rawValue['type'];
    const format = rawValue['format'];
    const startDate = rawValue['startDate'];
    const endDate = rawValue['endDate'];
    const categoryId = rawValue['categoryId'] as string[];
    const vendorName = rawValue['vendorName'] as string[];
    const status = rawValue['status'] as ExpenseStatus[];
    const expenseType = rawValue['expenseType'] as ExpenseType[];
    const userId = rawValue['userId'] as string[];
    const recipientEmail = rawValue['recipientEmail'];
    const schedule = rawValue['schedule'];
    const nextRun = rawValue['nextRun'];
    this.loading = true;
    
    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (date && typeof date === 'object' && date.getTime && typeof date.getTime === 'function') {
        return new Date(date).toISOString().substring(0, 10);
      }
      return date;
    };
    
    const filters: Record<string, any> = {};
    if (startDate) filters['startDate'] = formatDate(startDate);
    if (endDate) filters['endDate'] = formatDate(endDate);
    if (categoryId && categoryId.length > 0) filters['categoryId'] = categoryId.length === 1 ? categoryId[0] : categoryId;
    if (vendorName && vendorName.length > 0) filters['vendorName'] = vendorName.length === 1 ? vendorName[0] : vendorName;
    if (status && status.length > 0) filters['status'] = status.length === 1 ? status[0] : status;
    if (expenseType && expenseType.length > 0) filters['type'] = expenseType.length === 1 ? expenseType[0] : expenseType;
    if (userId && userId.length > 0) filters['userId'] = userId.length === 1 ? userId[0] : userId;
    
    this.reportsService.scheduleReport({
      type: type ?? 'expense_summary',
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      format: format || 'pdf',
      recipientEmail: recipientEmail || undefined,
      schedule: schedule || 'monthly',
      nextRun: formatDate(nextRun) || undefined,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.showScheduleDialog = false;
        this.snackBar.open('Report scheduled successfully', 'Close', { duration: 3000 });
        this.scheduleForm.reset({
          type: 'expense_summary',
          format: 'pdf',
          schedule: 'monthly',
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to schedule report', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  historyFilterType: ReportType | '' = '';

  private loadHistory(): void {
    const filters = this.historyFilterType ? { type: this.historyFilterType } : undefined;
    this.reportsService.listHistory(filters).subscribe((history) => {
      const sorted = history.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      this.history = sorted;
    });
  }

  onHistoryFilterChange(): void {
    this.loadHistory();
  }

  trackByReportId(_: number, item: ReportHistoryItem): string {
    return item.id;
  }

  downloadReport(reportId: string, format: 'pdf' | 'xlsx' | 'csv' = 'pdf'): void {
    this.api.download(`/reports/${reportId}/download`, { format }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${reportId}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Report downloaded', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to download report', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  generateAndDownload(format: 'pdf' | 'xlsx' | 'csv' = 'pdf'): void {
    if (!this.generatedReport) {
      this.snackBar.open('Please generate a report first', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.loadHistory();
    const reportInHistory = this.history.find(
      (h) => h.type === this.generatedReport?.type && 
      Math.abs(new Date(h.createdAt).getTime() - new Date(this.generatedReport.generatedAt).getTime()) < 5000
    );

    if (reportInHistory) {
      this.downloadReport(reportInHistory.id, format);
    } else {
      this.snackBar.open('Report ID not found. Please generate again.', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
    }
  }

  isArray(data: any): boolean {
    return Array.isArray(data);
  }

  getReportPreviewData(report: GeneratedReport): any[] {
    if (Array.isArray(report.data)) {
      return report.data;
    }
    if (typeof report.data === 'object' && report.data !== null) {
      return Object.entries(report.data).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
    }
    return [];
  }

  getReportPreviewHeaders(data: any[]): string[] {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }

  showQuickReport(type: 'lastMonth' | 'vatQuarter' | 'ytd'): void {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;
    let reportType: ReportType = 'expense_summary';

    switch (type) {
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'vatQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        reportType = 'vat_report';
        break;
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
    }

    this.form.patchValue({
      type: reportType,
      startDate: startDate.toISOString().substring(0, 10),
      endDate: endDate.toISOString().substring(0, 10),
    });
    // Collapse form before generating
    this.formExpanded = false;
    this.generate();
  }

  // Chart methods for trend reports
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations to prevent flickering
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        animation: {
          duration: 0, // Disable tooltip animations
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'AED ' + value.toLocaleString();
          },
        },
      },
    },
    elements: {
      point: {
        hoverRadius: 6,
        radius: 4,
      },
    },
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations to prevent flickering
    },
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      tooltip: {
        animation: {
          duration: 0, // Disable tooltip animations
        },
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: AED ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations to prevent flickering
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        animation: {
          duration: 0, // Disable tooltip animations
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'AED ' + value.toLocaleString();
          },
        },
      },
    },
  };

  getExpenseSummaryPieChart(report: GeneratedReport): ChartConfiguration<'pie'>['data'] {
    if (!Array.isArray(report.data) || report.data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Create cache key based on report type and generatedAt timestamp
    const cacheKey = `pie_${report.type}_${report.generatedAt || Date.now()}`;
    if (this.chartDataCache.has(cacheKey)) {
      return this.chartDataCache.get(cacheKey);
    }

    // Group by category - exclude uncategorized expenses
    const categoryMap = new Map<string, number>();
    report.data.forEach((item: any) => {
      const category = item.category?.trim();
      // Skip items with no category, "Uncategorized", "N/A", or empty strings
      if (!category || category === 'Uncategorized' || category === 'N/A' || category === '') {
        return;
      }
      
      const total = Number(item.total || item.totalAmount || 0);
      if (total > 0) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + total);
      }
    });

    // If no categorized expenses found, return empty chart
    if (categoryMap.size === 0) {
      const emptyData = { labels: [], datasets: [] };
      this.chartDataCache.set(cacheKey, emptyData);
      return emptyData;
    }

    const labels = Array.from(categoryMap.keys());
    const data = Array.from(categoryMap.values());

    const chartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#1976d2', '#42a5f5', '#66bb6a', '#ef5350', '#ffa726',
            '#ab47bc', '#26a69a', '#ff7043', '#78909c', '#8d6e63',
            '#ff9800', '#9c27b0', '#009688', '#cddc39', '#ffeb3b',
          ],
        },
      ],
    };
    
    this.chartDataCache.set(cacheKey, chartData);
    return chartData;
  }

  getExpenseSummaryBarChart(report: GeneratedReport): ChartConfiguration<'bar'>['data'] {
    if (!Array.isArray(report.data) || report.data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Create cache key based on report type and generatedAt timestamp
    const cacheKey = `bar_${report.type}_${report.generatedAt || Date.now()}`;
    if (this.chartDataCache.has(cacheKey)) {
      return this.chartDataCache.get(cacheKey);
    }

    // Group by month
    const monthMap = new Map<string, number>();
    report.data.forEach((item: any) => {
      if (item.date) {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const total = Number(item.total || item.totalAmount || 0);
        monthMap.set(monthLabel, (monthMap.get(monthLabel) || 0) + total);
      }
    });

    const labels = Array.from(monthMap.keys()).sort();
    const data = labels.map(label => monthMap.get(label) || 0);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Total Expenses',
          data,
          backgroundColor: 'rgba(25, 118, 210, 0.7)',
        },
      ],
    };
    
    this.chartDataCache.set(cacheKey, chartData);
    return chartData;
  }

  getTrendChartData(report: GeneratedReport): ChartConfiguration<'line'>['data'] {
    if (!Array.isArray(report.data) || report.data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Create cache key based on report type and generatedAt timestamp
    const cacheKey = `line_${report.type}_${report.generatedAt || Date.now()}`;
    if (this.chartDataCache.has(cacheKey)) {
      return this.chartDataCache.get(cacheKey);
    }

    const labels = report.data.map((item: any) => item.period || '');
    const data = report.data.map((item: any) => item.totalAmount || 0);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Total Expenses',
          data,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
    
    this.chartDataCache.set(cacheKey, chartData);
    return chartData;
  }

  getTrendChartLabels(report: GeneratedReport): string[] {
    if (!Array.isArray(report.data) || report.data.length === 0) {
      return [];
    }
    return report.data.map((item: any) => item.period || '');
  }

  // Report comparison
  compareReports(): void {
    const rawValue = this.compareForm.getRawValue();
    const type = rawValue['type'];
    const period1Start = rawValue['period1StartDate'];
    const period1End = rawValue['period1EndDate'];
    const period2Start = rawValue['period2StartDate'];
    const period2End = rawValue['period2EndDate'];

    if (!period1Start || !period1End || !period2Start || !period2End) {
      this.snackBar.open('Please select dates for both periods', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    this.comparisonReport1 = null;
    this.comparisonReport2 = null;

    const formatDate = (date: any): string | undefined => {
      if (!date) return undefined;
      if (date && typeof date === 'object' && date.getTime && typeof date.getTime === 'function') {
        return new Date(date).toISOString().substring(0, 10);
      }
      return date;
    };

    // Generate first period report
    this.reportsService.generateReport({
      type: type ?? 'expense_summary',
      filters: {
        startDate: formatDate(period1Start),
        endDate: formatDate(period1End),
      },
    }).subscribe({
      next: (report1) => {
        this.comparisonReport1 = report1;
        // Generate second period report
        this.reportsService.generateReport({
          type: type ?? 'expense_summary',
          filters: {
            startDate: formatDate(period2Start),
            endDate: formatDate(period2End),
          },
        }).subscribe({
          next: (report2) => {
            this.loading = false;
            this.comparisonReport2 = report2;
            this.snackBar.open('Comparison reports generated', 'Close', { duration: 3000 });
          },
          error: () => {
            this.loading = false;
            this.snackBar.open('Failed to generate second period report', 'Close', {
              duration: 4000,
              panelClass: ['snack-error'],
            });
          },
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to generate first period report', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  getComparisonSummary(): any {
    if (!this.comparisonReport1 || !this.comparisonReport2) {
      return null;
    }

    const data1 = this.comparisonReport1.data;
    const data2 = this.comparisonReport2.data;

    // Calculate totals for comparison
    let total1 = 0;
    let total2 = 0;

    if (Array.isArray(data1)) {
      total1 = data1.reduce((sum: number, item: any) => {
        return sum + (Number(item.totalAmount || item.amount || 0));
      }, 0);
    } else if (data1 && typeof data1 === 'object') {
      total1 = Number(data1.totalAmount || data1.taxableAmount || data1.amount || 0);
    }

    if (Array.isArray(data2)) {
      total2 = data2.reduce((sum: number, item: any) => {
        return sum + (Number(item.totalAmount || item.amount || 0));
      }, 0);
    } else if (data2 && typeof data2 === 'object') {
      total2 = Number(data2.totalAmount || data2.taxableAmount || data2.amount || 0);
    }

    const difference = total2 - total1;
    const percentageChange = total1 > 0 ? ((difference / total1) * 100) : 0;

    return {
      period1Total: total1,
      period2Total: total2,
      difference,
      percentageChange,
      isIncrease: difference > 0,
    };
  }

  // Helpers for compact summary table
  getSummaryValue(row: any, key: string): any {
    switch (key) {
      case 'date':
        return row.date ?? row.expenseDate ?? '';
      case 'category':
        return row.category ?? '';
      case 'vendor':
        return row.vendor ?? row.vendorName ?? '';
      case 'total':
        return (row.totalAmount ?? row.total ?? row.amount ?? 0);
      default:
        return row[key];
    }
  }

  openDetails(row: any): void {
    this.selectedRow = row;
    if (this.detailsDialog) {
      this.dialog.open(this.detailsDialog, {
        data: row,
        width: '800px',
        maxHeight: '80vh',
        autoFocus: false,
        restoreFocus: false,
        panelClass: 'details-dialog-panel',
      });
    } else {
      // Fallback to inline (should not happen once dialog template is available)
      this.showDetails = true;
    }
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedRow = null;
    this.dialog.closeAll();
  }

  // Template helpers to avoid complex expressions in HTML
  isPrimitiveValue(val: any): boolean {
    return val === null || val === undefined || typeof val !== 'object';
  }

  isObjectOrArray(val: any): boolean {
    return val !== null && typeof val === 'object';
  }

  scrollToReportPreview(): void {
    if (this.reportPreviewCard) {
      this.reportPreviewCard.nativeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  toggleFormExpansion(): void {
    this.formExpanded = !this.formExpanded;
  }
}
