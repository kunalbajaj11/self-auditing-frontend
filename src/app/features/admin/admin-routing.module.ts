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
import { AdminVendorsComponent } from './vendors/admin-vendors.component';
import { AdminChartOfAccountsComponent } from './chart-of-accounts/admin-chart-of-accounts.component';

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
            label: 'Expenses',
            icon: 'receipt_long',
            badgeKey: 'pendingAccruals',
            children: [
              { label: 'Upload Bill / Manual Entry', route: '/admin/expenses', queryParams: { view: 'upload' } },
              { label: 'Pending Accruals', route: '/admin/expenses', queryParams: { filter: 'pending' } },
              { label: 'Credits & Adjustments', route: '/admin/expenses', queryParams: { filter: 'credits' } },
              { label: 'Archived', route: '/admin/expenses', queryParams: { filter: 'archived' } },
            ],
          },
          {
            label: 'Sales Invoices',
            icon: 'description',
            children: [
              { label: 'All Invoices', route: '/admin/sales-invoices' },
              { label: 'Create Invoice', route: '/admin/sales-invoices', queryParams: { view: 'create' } },
              { label: 'Outstanding', route: '/admin/sales-invoices', queryParams: { filter: 'outstanding' } },
              { label: 'Overdue', route: '/admin/sales-invoices', queryParams: { filter: 'overdue' } },
            ],
          },
          {
            label: 'Credit Notes',
            icon: 'note',
            children: [
              { label: 'All Credit Notes', route: '/admin/credit-notes' },
              { label: 'Create Credit Note', route: '/admin/credit-notes', queryParams: { view: 'create' } },
            ],
          },
          {
            label: 'Customers',
            icon: 'people',
            children: [
              { label: 'All Customers', route: '/admin/customers' },
              { label: 'Add Customer', route: '/admin/customers', queryParams: { view: 'create' } },
            ],
          },
          {
            label: 'Reports',
            icon: 'bar_chart',
            children: [
              { label: 'Monthly Summary', route: '/admin/reports', queryParams: { type: 'monthly' } },
              { label: 'VAT-Ready Export', route: '/admin/reports', queryParams: { type: 'vat' } },
              { label: 'By Category / Department', route: '/admin/reports', queryParams: { type: 'category' } },
              { label: 'Audit Trail', route: '/admin/reports', queryParams: { type: 'audit' } },
            ],
          },
          {
            label: 'Bank Reconciliation',
            icon: 'account_balance',
            children: [
              { label: 'All Reconciliations', route: '/admin/bank-reconciliation' },
              { label: 'Upload Statement', route: '/admin/bank-reconciliation/upload' },
            ],
          },
          {
            label: 'Reminders & Notifications',
            icon: 'notifications',
            route: '/admin/notifications',
            badgeKey: 'unreadNotifications',
          },
          {
            label: 'Settings',
            icon: 'settings',
            children: [
              { label: 'Company Profile', route: '/admin/company' },
              { label: 'Users & Roles', route: '/admin/users' },
              { label: 'Chart of Accounts', route: '/admin/chart-of-accounts' },
              { label: 'Vendors', route: '/admin/vendors' },
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

