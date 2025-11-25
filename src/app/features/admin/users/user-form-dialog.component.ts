import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '../../../core/services/users.service';
import { AuthUser, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form-dialog',
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.scss'],
})
export class UserFormDialogComponent {
  readonly roles: UserRole[] = ['accountant', 'employee'];
  readonly isEdit: boolean;
  loading = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<UserFormDialogComponent>,
    private readonly usersService: UsersService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: AuthUser | null,
  ) {
    this.isEdit = Boolean(data);
    this.form = this.fb.group({
      name: [data?.name ?? '', [Validators.required]],
      email: [data?.email ?? '', [Validators.required, Validators.email]],
      password: [
        '',
        this.isEdit ? [] : [Validators.required, Validators.minLength(8)],
      ],
      role: [data?.role ?? 'accountant', Validators.required],
      phone: [data?.phone ?? ''],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    if (this.isEdit && this.data) {
      const { name, email, role, phone } = this.form.getRawValue();
      this.usersService
        .updateUser(this.data.id, {
          name: name ?? '',
          email: email ?? '',
          role: role ?? this.data.role,
          phone: phone ?? '',
        })
        .subscribe({
          next: (user) => this.handleSuccess(user),
          error: () => this.handleError('update'),
        });
    } else {
      const payload = this.form.getRawValue();
      this.usersService
        .createUser({
          name: payload.name ?? '',
          email: payload.email ?? '',
          password: payload.password ?? '',
          role: payload.role ?? 'employee',
          phone: payload.phone ?? '',
        })
        .subscribe({
          next: (user) => this.handleSuccess(user),
          error: (error) => this.handleError('create', error),
        });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private handleSuccess(user: AuthUser): void {
    this.loading = false;
    this.snackBar.open(
      `User ${this.isEdit ? 'updated' : 'invited'} successfully`,
      'Close',
      { duration: 3000 },
    );
    this.dialogRef.close(user);
  }

  private handleError(action: 'create' | 'update', error?: any): void {
    this.loading = false;
    const errorMessage =
      error?.error?.message ||
      `Failed to ${action} user. Please try again.`;
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['snack-error'],
    });
  }
}

