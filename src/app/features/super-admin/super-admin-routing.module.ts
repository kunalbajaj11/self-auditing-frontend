import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from '../../shared/layout/shell/shell.component';
import { SuperAdminDashboardComponent } from './dashboard/super-admin-dashboard.component';
import { SuperAdminOrganizationsComponent } from './organizations/super-admin-organizations.component';
import { SuperAdminPlansComponent } from './plans/super-admin-plans.component';
import { SuperAdminAuditLogsComponent } from './audit-logs/super-admin-audit-logs.component';
import { LicenseKeyManagementComponent } from './license-keys/license-key-management.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    data: {
      shell: {
        title: 'Super Admin Console',
        nav: [
          {
            label: 'Dashboard',
            icon: 'space_dashboard',
            route: '/super-admin/dashboard',
          },
          {
            label: 'Clients',
            icon: 'domain',
            children: [
              {
                label: 'Create Client',
                route: '/super-admin/organizations',
                queryParams: { action: 'create' },
              },
              {
                label: 'Manage Clients',
                route: '/super-admin/organizations',
              },
            ],
          },
          {
            label: 'Usage Analytics',
            icon: 'query_stats',
            route: '/super-admin/dashboard',
            queryParams: { view: 'analytics' },
          },
          {
            label: 'System Configuration',
            icon: 'tune',
            children: [
              {
                label: 'Subscription Plans',
                route: '/super-admin/plans',
              },
              {
                label: 'License Keys',
                route: '/super-admin/license-keys',
              },
            ],
          },
          {
            label: 'Audit Logs',
            icon: 'fact_check',
            route: '/super-admin/audit-logs',
          },
          {
            label: 'Account Settings',
            icon: 'settings',
            route: '/super-admin/dashboard',
            queryParams: { view: 'account' },
          },
        ],
      },
    },
    children: [
      {
        path: 'dashboard',
        component: SuperAdminDashboardComponent,
        data: {
          shell: { title: 'Platform Dashboard' },
        },
      },
      {
        path: 'organizations',
        component: SuperAdminOrganizationsComponent,
        data: {
          shell: { title: 'Client Organizations' },
        },
      },
      {
        path: 'plans',
        component: SuperAdminPlansComponent,
        data: {
          shell: { title: 'Subscription Plans' },
        },
      },
      {
        path: 'license-keys',
        component: LicenseKeyManagementComponent,
        data: {
          shell: { title: 'License Keys' },
        },
      },
      {
        path: 'audit-logs',
        component: SuperAdminAuditLogsComponent,
        data: {
          shell: { title: 'Audit Trail' },
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SuperAdminRoutingModule {}

