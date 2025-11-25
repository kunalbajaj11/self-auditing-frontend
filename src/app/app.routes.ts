import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user.model';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/homepage/homepage.component').then(
        (m) => m.HomepageComponent,
      ),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'super-admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['superadmin'] as UserRole[] },
    loadChildren: () =>
      import('./features/super-admin/super-admin.module').then(
        (m) => m.SuperAdminModule,
      ),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'accountant'] as UserRole[] },
    loadChildren: () =>
      import('./features/admin/admin.module').then((m) => m.AdminModule),
  },
  {
    path: 'employee',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['employee'] as UserRole[] },
    loadChildren: () =>
      import('./features/employee/employee.module').then(
        (m) => m.EmployeeModule,
      ),
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
