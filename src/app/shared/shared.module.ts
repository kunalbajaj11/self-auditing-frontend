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
  ],
})
export class SharedModule {}
