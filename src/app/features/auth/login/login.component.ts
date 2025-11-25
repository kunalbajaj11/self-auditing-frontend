import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loading = false;
  hidePassword = true;
  inactiveOrgMessage: string | null = null;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.inactiveOrgMessage = null;
    const { email, password } = this.form.getRawValue();
    this.loading = true;
    this.authService
      .login(email ?? '', password ?? '')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ user }) => {
          this.snackBar.open(`Welcome back, ${user.name}!`, 'Close', {
            duration: 3000,
          });
          this.navigateByRole(user.role);
        },
        error: (err) => {
          const status = err?.status;
          const message: string =
            err?.error?.message || err?.message || 'Invalid credentials, please try again.';

          if (status === 403 && /organization.*inactive/i.test(message)) {
            this.inactiveOrgMessage =
              'Your organization is inactive. Please contact your administrator.';
          } else {
            this.snackBar.open('Invalid credentials, please try again.', 'Close', {
              duration: 4000,
              panelClass: ['snack-error'],
            });
          }
        },
      });
  }

  navigateByRole(role: UserRole): void {
    const redirectMap: Record<UserRole, string> = {
      superadmin: '/super-admin/dashboard',
      admin: '/admin/dashboard',
      accountant: '/admin/expenses',
      approver: '/admin/expenses',
      auditor: '/admin/reports',
      employee: '/employee/upload',
    };
    this.router.navigateByUrl(redirectMap[role] ?? '/');
  }
}
