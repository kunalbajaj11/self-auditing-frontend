import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from '../../shared/layout/shell/shell.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminCompanyComponent } from './company/admin-company.component';
import { AdminUsersComponent } from './users/admin-users.component';
import { AdminCategoriesComponent } from './categories/admin-categories.component';
import { AdminExpenseTypesComponent } from './expense-types/admin-expense-types.component';
import { AdminExpensesComponent } from './expenses/admin-expenses.component';
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
            badgeKey: 'pendingAccruals',
            children: [
              { label: 'Expenses', route: '/admin/expenses' },
              { label: 'Accruals', route: '/admin/expenses', queryParams: { filter: 'pending' } },
              { label: 'Vendors', route: '/admin/vendors' },
            ],
          },
          {
            label: 'Banking',
            icon: 'account_balance',
            children: [
              { label: 'Bank Accounts', route: '/admin/banking/accounts' },
              { label: 'Upload Bank Statement', route: '/admin/bank-reconciliation/upload' },
              { label: 'Reconciliation', route: '/admin/bank-reconciliation' },
            ],
          },
          {
            label: 'Reports',
            icon: 'bar_chart',
            children: [
              { label: 'Financial Reports', route: '/admin/reports', queryParams: { type: 'financial' } },
              { label: 'VAT Reports', route: '/admin/reports', queryParams: { type: 'vat' } },
              { label: 'Sales Reports', route: '/admin/reports', queryParams: { type: 'sales' } },
              { label: 'Payment Collection', route: '/admin/reports', queryParams: { type: 'payments' } },
              { label: 'Expense Reports', route: '/admin/reports', queryParams: { type: 'expense' } },
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
        path: 'reports',
        component: AdminReportsComponent,
        data: { shell: { title: 'Reports & Analytics' } },
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
        component: ReconciliationListComponent, // Placeholder - will need to create BankAccountsComponent
        data: { shell: { title: 'Bank Accounts' } },
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

