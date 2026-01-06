import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminCompanyComponent } from './company/admin-company.component';
import { AdminUsersComponent } from './users/admin-users.component';
import { AdminCategoriesComponent } from './categories/admin-categories.component';
import { AdminExpenseTypesComponent } from './expense-types/admin-expense-types.component';
import { AdminExpensesComponent } from './expenses/admin-expenses.component';
import { AdminPaymentsComponent } from './payments/admin-payments.component';
import { PaymentFormDialogComponent } from './payments/payment-form-dialog.component';
import { AdminReportsComponent } from './reports/admin-reports.component';
import { AdminNotificationsComponent } from './notifications/admin-notifications.component';
import { UserFormDialogComponent } from './users/user-form-dialog.component';
import { CategoryFormDialogComponent } from './categories/category-form-dialog.component';
import { ExpenseTypeFormDialogComponent } from './expense-types/expense-type-form-dialog.component';
import { ExpenseFormDialogComponent } from './expenses/expense-form-dialog.component';
import { ReconciliationListComponent } from './bank-reconciliation/reconciliation-list.component';
import { ReconciliationDetailComponent } from './bank-reconciliation/reconciliation-detail.component';
import { UploadBankStatementComponent } from './bank-reconciliation/upload-bank-statement.component';
import { AdminCustomersComponent } from './customers/admin-customers.component';
import { CustomerFormDialogComponent } from './customers/customer-form-dialog.component';
import { AdminSalesInvoicesComponent } from './sales-invoices/admin-sales-invoices.component';
import { InvoiceFormDialogComponent } from './sales-invoices/invoice-form-dialog.component';
import { InvoiceDetailDialogComponent } from './sales-invoices/invoice-detail-dialog.component';
import { InvoicePreviewComponent } from './sales-invoices/invoice-preview.component';
import { InvoicePaymentDialogComponent } from './sales-invoices/invoice-payment-dialog.component';
import { AdminCreditNotesComponent } from './credit-notes/admin-credit-notes.component';
import { CreditNoteFormDialogComponent } from './credit-notes/credit-note-form-dialog.component';
import { CreditNoteDetailDialogComponent } from './credit-notes/credit-note-detail-dialog.component';
import { CreditNoteApplyDialogComponent } from './credit-notes/credit-note-apply-dialog.component';
import { AdminDebitNotesComponent } from './debit-notes/admin-debit-notes.component';
import { DebitNoteFormDialogComponent } from './debit-notes/debit-note-form-dialog.component';
import { DebitNoteDetailDialogComponent } from './debit-notes/debit-note-detail-dialog.component';
import { InvoiceEmailDialogComponent } from './sales-invoices/invoice-email-dialog.component';
import { AdminVendorsComponent } from './vendors/admin-vendors.component';
import { VendorFormDialogComponent } from './vendors/vendor-form-dialog.component';
import { InvoiceTemplateComponent } from './settings/invoice-template/invoice-template.component';
import { TaxSettingsComponent } from './settings/tax-settings/tax-settings.component';
import { TaxRateFormDialogComponent } from './settings/tax-settings/tax-rate-form-dialog.component';
import { CurrencySettingsComponent } from './settings/currency-settings/currency-settings.component';
import { ExchangeRateFormDialogComponent } from './settings/currency-settings/exchange-rate-form-dialog.component';
import { NumberingSequencesComponent } from './settings/numbering-sequences/numbering-sequences.component';
import { CashAccountsComponent } from './cash-accounts/cash-accounts.component';
import { BankAccountsComponent } from './bank-accounts/bank-accounts.component';
import { BankTransactionFormDialogComponent } from './bank-accounts/bank-transaction-form-dialog.component';
import { AdjustmentsComponent } from './adjustments/adjustments.component';
import { AdminJournalEntriesComponent } from './journal-entries/admin-journal-entries.component';
import { JournalEntryFormDialogComponent } from './journal-entries/journal-entry-form-dialog.component';
import { AdminPayrollRunsComponent } from './payroll/admin-payroll-runs.component';
import { PayrollRunFormDialogComponent } from './payroll/payroll-run-form-dialog.component';
import { PayrollRunDetailDialogComponent } from './payroll/payroll-run-detail-dialog.component';
import { AdminSalaryProfilesComponent } from './payroll/admin-salary-profiles.component';
import { SalaryProfileFormDialogComponent } from './payroll/salary-profile-form-dialog.component';
import { AdminInventoryLocationsComponent } from './inventory/admin-inventory-locations.component';
import { LocationFormDialogComponent } from './inventory/location-form-dialog.component';
import { AdminStockMovementsComponent } from './inventory/admin-stock-movements.component';
import { StockMovementFormDialogComponent } from './inventory/stock-movement-form-dialog.component';
import { AdminProductsComponent } from './products/admin-products.component';
import { ProductFormDialogComponent } from './products/product-form-dialog.component';
import { AdminTaxFormsComponent } from './tax-forms/admin-tax-forms.component';
import { GenerateVATReturnDialogComponent } from './tax-forms/generate-vat-return-dialog.component';
import { TaxFormDetailDialogComponent } from './tax-forms/tax-form-detail-dialog.component';
import { AdminComplianceComponent } from './compliance/admin-compliance.component';
import { CreateDeadlineDialogComponent } from './compliance/create-deadline-dialog.component';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    AdminCompanyComponent,
    AdminUsersComponent,
    AdminCategoriesComponent,
    AdminExpenseTypesComponent,
    AdminExpensesComponent,
    AdminPaymentsComponent,
    PaymentFormDialogComponent,
    AdminReportsComponent,
    AdminNotificationsComponent,
    UserFormDialogComponent,
    CategoryFormDialogComponent,
    ExpenseTypeFormDialogComponent,
    ExpenseFormDialogComponent,
    ReconciliationListComponent,
    ReconciliationDetailComponent,
    UploadBankStatementComponent,
    AdminCustomersComponent,
    CustomerFormDialogComponent,
    AdminSalesInvoicesComponent,
    InvoiceFormDialogComponent,
    InvoiceDetailDialogComponent,
    InvoicePreviewComponent,
    InvoicePaymentDialogComponent,
    AdminCreditNotesComponent,
    CreditNoteFormDialogComponent,
    CreditNoteDetailDialogComponent,
    CreditNoteApplyDialogComponent,
    AdminDebitNotesComponent,
    DebitNoteFormDialogComponent,
    DebitNoteDetailDialogComponent,
    InvoiceEmailDialogComponent,
    AdminVendorsComponent,
    VendorFormDialogComponent,
    InvoiceTemplateComponent,
    TaxSettingsComponent,
    TaxRateFormDialogComponent,
    CurrencySettingsComponent,
    ExchangeRateFormDialogComponent,
    NumberingSequencesComponent,
    CashAccountsComponent,
    BankAccountsComponent,
    BankTransactionFormDialogComponent,
    AdjustmentsComponent,
    AdminJournalEntriesComponent,
    JournalEntryFormDialogComponent,
    AdminSalaryProfilesComponent,
    SalaryProfileFormDialogComponent,
    AdminPayrollRunsComponent,
    PayrollRunFormDialogComponent,
    PayrollRunDetailDialogComponent,
    AdminInventoryLocationsComponent,
    LocationFormDialogComponent,
    AdminStockMovementsComponent,
    StockMovementFormDialogComponent,
    AdminProductsComponent,
    ProductFormDialogComponent,
    AdminTaxFormsComponent,
    GenerateVATReturnDialogComponent,
    TaxFormDetailDialogComponent,
    AdminComplianceComponent,
    CreateDeadlineDialogComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}

