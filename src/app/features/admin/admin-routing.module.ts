import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from '../../shared/layout/shell/shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminCompanyComponent } from './company/admin-company.component';
import { AdminUsersComponent } from './users/admin-users.component';
import { AdminCategoriesComponent } from './categories/admin-categories.component';
import { AdminExpenseTypesComponent } from './expense-types/admin-expense-types.component';
import { AdminExpensesComponent } from './expenses/admin-expenses.component';
import { AdminPaymentsComponent } from './payments/admin-payments.component';
import { AdminJournalEntriesComponent } from './journal-entries/admin-journal-entries.component';
import { AdminReportsComponent } from './reports/admin-reports.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';
import { ReconciliationListComponent } from './bank-reconciliation/reconciliation-list.component';
import { ReconciliationDetailComponent } from './bank-reconciliation/reconciliation-detail.component';
import { UploadBankStatementComponent } from './bank-reconciliation/upload-bank-statement.component';
import { AdminCustomersComponent } from './customers/admin-customers.component';
import { AdminSalesInvoicesComponent } from './sales-invoices/admin-sales-invoices.component';
import { AdminCreditNotesComponent } from './credit-notes/admin-credit-notes.component';
import { AdminDebitNotesComponent } from './debit-notes/admin-debit-notes.component';
import { AdminVendorsComponent } from './vendors/admin-vendors.component';
import { AdminChartOfAccountsComponent } from './chart-of-accounts/admin-chart-of-accounts.component';
import { InvoiceTemplateComponent } from './settings/invoice-template/invoice-template.component';
import { TaxSettingsComponent } from './settings/tax-settings/tax-settings.component';
import { CurrencySettingsComponent } from './settings/currency-settings/currency-settings.component';
import { NumberingSequencesComponent } from './settings/numbering-sequences/numbering-sequences.component';
import { CashAccountsComponent } from './cash-accounts/cash-accounts.component';
import { BankAccountsComponent } from './bank-accounts/bank-accounts.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    data: {
      shell: {
        title: 'Client Admin Console',
        nav: [
          { label: 'Dashboard', icon: 'space_dashboard', route: '/admin/dashboard' },
          {
            label: 'Sales',
            icon: 'point_of_sale',
            children: [
              { label: 'Customers', route: '/admin/customers' },
              { label: 'Invoices', route: '/admin/sales-invoices' },
              { label: 'Payments Received', route: '/admin/sales-invoices', queryParams: { filter: 'payments' } },
              { label: 'Credit Notes', route: '/admin/credit-notes' },
              { label: 'Debit Notes', route: '/admin/debit-notes' },
            ],
          },
          {
            label: 'Expenses',
            icon: 'receipt_long',
            children: [
              { label: 'Expenses', route: '/admin/expenses' },
              { label: 'Payments', route: '/admin/payments' },
              { label: 'Journal Entries', route: '/admin/journal-entries' },
              { label: 'Vendors', route: '/admin/vendors' },
            ],
          },
          {
            label: 'Banking',
            icon: 'account_balance',
            children: [
              { label: 'Bank Accounts', route: '/admin/banking/accounts' },
              { label: 'Cash Accounts', route: '/admin/banking/cash-accounts' },
              { label: 'Upload Bank Statement', route: '/admin/bank-reconciliation/upload' },
              { label: 'Reconciliation', route: '/admin/bank-reconciliation' },
            ],
          },
          {
            label: 'Reports',
            icon: 'bar_chart',
            children: [
              { label: 'Trial Balance', route: '/admin/reports/trial-balance', icon: 'balance' },
              { label: 'Balance Sheet', route: '/admin/reports/balance-sheet', icon: 'account_balance' },
              { label: 'Profit and Loss', route: '/admin/reports/profit-and-loss', icon: 'trending_up' },
              { label: 'Payables', route: '/admin/reports/payables', icon: 'account_balance_wallet' },
              { label: 'Receivables', route: '/admin/reports/receivables', icon: 'receipt_long' },
            ],
          },
          {
            label: 'Contacts',
            icon: 'contacts',
            children: [
              { label: 'Customers', route: '/admin/contacts/customers' },
              { label: 'Vendors', route: '/admin/contacts/vendors' },
            ],
          },
          {
            label: 'Settings',
            icon: 'settings',
            children: [
              { label: 'Organization Settings', route: '/admin/company' },
              { label: 'User Management', route: '/admin/users' },
              { label: 'Invoice Template', route: '/admin/settings/invoice-template' },
              { label: 'Tax Settings', route: '/admin/settings/tax' },
              { label: 'Currency & Exchange Rates', route: '/admin/settings/currency' },
              { label: 'Numbering Sequences', route: '/admin/settings/numbering' },
              { label: 'Email / Notifications', route: '/admin/notifications', badgeKey: 'unreadNotifications' },
              { label: 'Chart of Accounts', route: '/admin/chart-of-accounts' },
              { label: 'Expense Types', route: '/admin/expense-types' },
              { label: 'Expense Categories', route: '/admin/categories' },
            ],
          },
        ],
      },
    },
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        data: { shell: { title: 'Operational Dashboard' } },
      },
      {
        path: 'company',
        component: AdminCompanyComponent,
        data: { shell: { title: 'Company Profile' } },
      },
      {
        path: 'users',
        component: AdminUsersComponent,
        data: { shell: { title: 'Team Members' } },
      },
      {
        path: 'expense-types',
        component: AdminExpenseTypesComponent,
        data: { shell: { title: 'Expense Types' } },
      },
      {
        path: 'categories',
        component: AdminCategoriesComponent,
        data: { shell: { title: 'Expense Categories' } },
      },
      {
        path: 'expenses',
        component: AdminExpensesComponent,
        data: { shell: { title: 'Expense Management' } },
      },
      {
        path: 'payments',
        component: AdminPaymentsComponent,
        data: { shell: { title: 'Payment Management' } },
      },
      {
        path: 'journal-entries',
        component: AdminJournalEntriesComponent,
        data: { shell: { title: 'Journal Entries' } },
      },
      {
        path: 'reports',
        children: [
          {
            path: 'trial-balance',
            component: AdminReportsComponent,
            data: { shell: { title: 'Trial Balance' }, reportType: 'trial_balance' },
          },
          {
            path: 'balance-sheet',
            component: AdminReportsComponent,
            data: { shell: { title: 'Balance Sheet' }, reportType: 'balance_sheet' },
          },
          {
            path: 'profit-and-loss',
            component: AdminReportsComponent,
            data: { shell: { title: 'Profit and Loss Statement' }, reportType: 'profit_and_loss' },
          },
          {
            path: 'payables',
            component: AdminReportsComponent,
            data: { shell: { title: 'Payables (Accruals)' }, reportType: 'payables' },
          },
          {
            path: 'receivables',
            component: AdminReportsComponent,
            data: { shell: { title: 'Receivables' }, reportType: 'receivables' },
          },
          {
            path: '',
            redirectTo: 'trial-balance',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: 'notifications',
        component: AdminNotificationsComponent,
        data: { shell: { title: 'Reminders & Alerts' } },
      },
      {
        path: 'bank-reconciliation',
        component: ReconciliationListComponent,
        data: { shell: { title: 'Bank Reconciliation' } },
      },
      {
        path: 'bank-reconciliation/upload',
        component: UploadBankStatementComponent,
        data: { shell: { title: 'Upload Bank Statement' } },
      },
      {
        path: 'bank-reconciliation/:id',
        component: ReconciliationDetailComponent,
        data: { shell: { title: 'Reconciliation Detail' } },
      },
      {
        path: 'customers',
        component: AdminCustomersComponent,
        data: { shell: { title: 'Customer Management' } },
      },
      {
        path: 'contacts/customers',
        component: AdminCustomersComponent,
        data: { shell: { title: 'Customers' } },
      },
      {
        path: 'contacts/vendors',
        component: AdminVendorsComponent,
        data: { shell: { title: 'Vendors' } },
      },
      {
        path: 'banking/accounts',
        component: BankAccountsComponent,
        data: { shell: { title: 'Bank Accounts' } },
      },
      {
        path: 'banking/cash-accounts',
        component: CashAccountsComponent,
        data: { shell: { title: 'Cash Accounts' } },
      },
      {
        path: 'settings/invoice-template',
        component: InvoiceTemplateComponent,
        data: { shell: { title: 'Invoice Template Settings' } },
      },
      {
        path: 'settings/tax',
        component: TaxSettingsComponent,
        data: { shell: { title: 'Tax Settings' } },
      },
      {
        path: 'settings/currency',
        component: CurrencySettingsComponent,
        data: { shell: { title: 'Currency & Exchange Rates' } },
      },
      {
        path: 'settings/numbering',
        component: NumberingSequencesComponent,
        data: { shell: { title: 'Numbering Sequences' } },
      },
      {
        path: 'sales-invoices',
        component: AdminSalesInvoicesComponent,
        data: { shell: { title: 'Sales Invoice Management' } },
      },
          {
            path: 'credit-notes',
            component: AdminCreditNotesComponent,
            data: { shell: { title: 'Credit Note Management' } },
          },
          {
            path: 'debit-notes',
            component: AdminDebitNotesComponent,
            data: { shell: { title: 'Debit Note Management' } },
          },
          {
            path: 'vendors',
            component: AdminVendorsComponent,
            data: { shell: { title: 'Vendor Management' } },
          },
          {
            path: 'chart-of-accounts',
            component: AdminChartOfAccountsComponent,
            data: { shell: { title: 'Chart of Accounts' } },
          },
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}

