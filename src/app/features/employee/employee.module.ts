import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { EmployeeRoutingModule } from './employee-routing.module';
import { EmployeeUploadComponent } from './upload/employee-upload.component';
import { EmployeeExpensesComponent } from './my-expenses/employee-expenses.component';
import { EmployeeRemindersComponent } from './reminders/employee-reminders.component';

@NgModule({
  declarations: [
    EmployeeUploadComponent,
    EmployeeExpensesComponent,
    EmployeeRemindersComponent,
  ],
  imports: [SharedModule, EmployeeRoutingModule],
})
export class EmployeeModule {}

