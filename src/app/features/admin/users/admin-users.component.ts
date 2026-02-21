import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '../../../core/services/users.service';
import { AuthUser, UserRole } from '../../../core/models/user.model';
import { UserFormDialogComponent } from './user-form-dialog.component';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly columns = [
    'name',
    'email',
    'role',
    'phone',
    'status',
    'lastLogin',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<AuthUser>([]);
  loading = false;
  userLimitInfo: {
    currentCount: number;
    maxUsers: number | null;
    planType: string;
  } | null = null;
  canCreateUser = true;

  constructor(
    private readonly usersService: UsersService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadUserLimitInfo();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  openCreateDialog(): void {
    if (!this.canCreateUser) {
      this.snackBar.open(
        `User limit reached. Standard license allows maximum ${this.userLimitInfo?.maxUsers} users. Please upgrade to Enterprise for unlimited users.`,
        'Close',
        { duration: 5000, panelClass: ['snack-error'] },
      );
      return;
    }
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: null,
    });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.snackBar.open('User created', 'Close', { duration: 3000 });
        this.loadUsers();
        this.loadUserLimitInfo();
      }
    });
  }

  changeStatus(user: AuthUser): void {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    this.usersService.updateStatus(user.id, nextStatus).subscribe({
      next: () => {
        user.status = nextStatus;
        this.snackBar.open(
          `User ${nextStatus === 'active' ? 'activated' : 'deactivated'}`,
          'Close',
          { duration: 3000 },
        );
        this.dataSource.data = [...this.dataSource.data];
      },
      error: () => {
        this.snackBar.open('Failed to update status', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.usersService.listUsers().subscribe({
      next: (users) => {
        this.loading = false;
        this.dataSource.data = users.filter(
          (user) => user.role !== 'superadmin',
        );
        // Update limit info if we have it
        if (this.userLimitInfo) {
          this.updateCanCreateUser();
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load users', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private loadUserLimitInfo(): void {
    this.usersService.getUserLimitInfo().subscribe({
      next: (info) => {
        this.userLimitInfo = info;
        this.updateCanCreateUser();
      },
      error: () => {
        // Silently fail - limit info is not critical
      },
    });
  }

  private updateCanCreateUser(): void {
    if (!this.userLimitInfo) {
      this.canCreateUser = true;
      return;
    }
    // Enterprise has no limit (maxUsers is null)
    if (this.userLimitInfo.maxUsers === null) {
      this.canCreateUser = true;
      return;
    }
    // Standard license: check if current count is less than max
    this.canCreateUser =
      this.dataSource.data.length < this.userLimitInfo.maxUsers;
  }

  roleDisplay(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'accountant':
        return 'Accountant';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  }
}

