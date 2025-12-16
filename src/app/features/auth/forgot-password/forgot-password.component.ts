import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  loading = false;
  emailSent = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.loading = true;
    this.authService
      .forgotPassword(email ?? '')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.emailSent = true;
          this.snackBar.open(
            'If an account exists with this email, a password reset link has been sent.',
            'Close',
            {
              duration: 5000,
            },
          );
        },
        error: (err) => {
          this.snackBar.open(
            err?.error?.message || 'An error occurred. Please try again.',
            'Close',
            {
              duration: 4000,
              panelClass: ['snack-error'],
            },
          );
        },
      });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}



