import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SuperAdminRoutingModule } from './super-admin-routing.module';
import { SuperAdminDashboardComponent } from './dashboard/super-admin-dashboard.component';
import { SuperAdminOrganizationsComponent } from './organizations/super-admin-organizations.component';
import { SuperAdminPlansComponent } from './plans/super-admin-plans.component';
import { SuperAdminAuditLogsComponent } from './audit-logs/super-admin-audit-logs.component';
import { OrganizationFormDialogComponent } from './organizations/organization-form-dialog.component';
import { ActivateOrganizationDialogComponent } from './organizations/activate-organization-dialog.component';
import { UpgradeLicenseDialogComponent } from './organizations/upgrade-license-dialog.component';
import { PlanFormDialogComponent } from './plans/plan-form-dialog.component';
import { LicenseKeyManagementComponent } from './license-keys/license-key-management.component';
import { LicenseKeyCreateDialogComponent } from './license-keys/license-key-create-dialog.component';
import { LicenseKeyRenewDialogComponent } from './license-keys/license-key-renew-dialog.component';

@NgModule({
  declarations: [
    SuperAdminDashboardComponent,
    SuperAdminOrganizationsComponent,
    SuperAdminPlansComponent,
    SuperAdminAuditLogsComponent,
    OrganizationFormDialogComponent,
    ActivateOrganizationDialogComponent,
    UpgradeLicenseDialogComponent,
    PlanFormDialogComponent,
    LicenseKeyManagementComponent,
    LicenseKeyCreateDialogComponent,
    LicenseKeyRenewDialogComponent,
  ],
  imports: [SharedModule, SuperAdminRoutingModule],
})
export class SuperAdminModule {}

