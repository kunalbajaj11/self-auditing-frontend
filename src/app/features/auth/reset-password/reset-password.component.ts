import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  resetToken: string | null = null;
  passwordReset = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator,
    });
  }

  ngOnInit(): void {
    this.resetToken = this.route.snapshot.queryParams['token'];
    if (!this.resetToken) {
      this.snackBar.open('Invalid reset link. Please request a new password reset.', 'Close', {
        duration: 5000,
        panelClass: ['snack-error'],
      });
      this.router.navigate(['/auth/forgot-password']);
    }
  }

  passwordMatchValidator(form: any) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid || !this.resetToken) {
      this.form.markAllAsTouched();
      return;
    }

    const { password } = this.form.getRawValue();
    this.loading = true;
    this.authService
      .resetPassword(this.resetToken, password ?? '')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.passwordReset = true;
          this.snackBar.open('Password reset successfully! Redirecting to login...', 'Close', {
            duration: 3000,
          });
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
        },
        error: (err) => {
          const message = err?.error?.message || 'Invalid or expired reset token. Please request a new password reset.';
          this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
          if (err?.status === 400) {
            setTimeout(() => {
              this.router.navigate(['/auth/forgot-password']);
            }, 2000);
          }
        },
      });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}



