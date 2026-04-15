import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { LayoutModule } from '@angular/cdk/layout';
import { NgChartsModule } from 'ng2-charts';
import { MaterialModule } from './material.module';
import { ShellComponent } from './layout/shell/shell.component';
import { SummaryCardComponent } from './components/summary-card/summary-card.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { OrgMoneyPipe } from './pipes/org-money.pipe';
import { OrgCurrencyCodePipe } from './pipes/org-currency-code.pipe';
import { SignedOrgMoneyPipe } from './pipes/signed-org-money.pipe';

@NgModule({
  declarations: [ShellComponent, SummaryCardComponent, FileUploadComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FlexLayoutModule,
    MaterialModule,
    LayoutModule,
    NgChartsModule,
    OrgMoneyPipe,
    OrgCurrencyCodePipe,
    SignedOrgMoneyPipe,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FlexLayoutModule,
    MaterialModule,
    LayoutModule,
    NgChartsModule,
    ShellComponent,
    SummaryCardComponent,
    FileUploadComponent,
    OrgMoneyPipe,
    OrgCurrencyCodePipe,
    SignedOrgMoneyPipe,
  ],
})
export class SharedModule {}
