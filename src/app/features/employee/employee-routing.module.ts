import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from '../../shared/layout/shell/shell.component';
import { EmployeeUploadComponent } from './upload/employee-upload.component';
import { EmployeeExpensesComponent } from './my-expenses/employee-expenses.component';
import { EmployeeRemindersComponent } from './reminders/employee-reminders.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    data: {
      shell: {
        title: 'Employee Workspace',
        nav: [
          { label: 'Upload Expense', icon: 'receipt_long', route: '/employee/upload' },
          { label: 'My Expenses', icon: 'view_list', route: '/employee/my-expenses' },
          { label: 'Reminders', icon: 'notifications', route: '/employee/reminders' },
        ],
      },
    },
    children: [
      {
        path: 'upload',
        component: EmployeeUploadComponent,
        data: { shell: { title: 'Upload Receipt' } },
      },
      {
        path: 'my-expenses',
        component: EmployeeExpensesComponent,
        data: { shell: { title: 'My Expenses' } },
      },
      {
        path: 'reminders',
        component: EmployeeRemindersComponent,
        data: { shell: { title: 'Reminders & Alerts' } },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'upload',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeRoutingModule {}

