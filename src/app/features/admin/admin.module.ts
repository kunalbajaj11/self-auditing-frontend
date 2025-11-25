import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminCompanyComponent } from './company/admin-company.component';
import { AdminUsersComponent } from './users/admin-users.component';
import { AdminCategoriesComponent } from './categories/admin-categories.component';
import { AdminExpenseTypesComponent } from './expense-types/admin-expense-types.component';
import { AdminExpensesComponent } from './expenses/admin-expenses.component';
import { AdminReportsComponent } from './reports/admin-reports.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';
import { UserFormDialogComponent } from './users/user-form-dialog.component';
import { CategoryFormDialogComponent } from './categories/category-form-dialog.component';
import { ExpenseTypeFormDialogComponent } from './expense-types/expense-type-form-dialog.component';
import { ExpenseFormDialogComponent } from './expenses/expense-form-dialog.component';
import { ReconciliationListComponent } from './bank-reconciliation/reconciliation-list.component';
import { ReconciliationDetailComponent } from './bank-reconciliation/reconciliation-detail.component';
import { UploadBankStatementComponent } from './bank-reconciliation/upload-bank-statement.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminCompanyComponent,
    AdminUsersComponent,
    AdminCategoriesComponent,
    AdminExpenseTypesComponent,
    AdminExpensesComponent,
    AdminReportsComponent,
    AdminNotificationsComponent,
    UserFormDialogComponent,
    CategoryFormDialogComponent,
    ExpenseTypeFormDialogComponent,
    ExpenseFormDialogComponent,
    ReconciliationListComponent,
    ReconciliationDetailComponent,
    UploadBankStatementComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}

