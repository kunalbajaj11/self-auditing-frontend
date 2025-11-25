import { Component, OnInit } from '@angular/core';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationItem } from '../../../core/models/notification.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LicenseService } from '../../../core/services/license.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-employee-reminders',
  templateUrl: './employee-reminders.component.html',
  styleUrls: ['./employee-reminders.component.scss'],
})
export class EmployeeRemindersComponent implements OnInit {
  notifications: NotificationItem[] = [];
  loading = false;
  isEnterprise$: Observable<boolean>;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly snackBar: MatSnackBar,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  toggle(notification: NotificationItem): void {
    this.notificationsService
      .markAsRead(notification.id, !notification.isRead)
      .subscribe({
        next: (updated) => {
          notification.isRead = updated.isRead;
          notification.sentAt = updated.sentAt;
          this.notifications = [...this.notifications];
        },
        error: () => {
          this.snackBar.open('Unable to update reminder', 'Close', {
            duration: 3000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  private loadNotifications(): void {
    this.isEnterprise$.subscribe((isEnterprise) => {
      if (!isEnterprise) {
        this.loading = false;
        return;
      }
      this.loading = true;
      this.notificationsService.listNotifications().subscribe({
        next: (items) => {
          this.loading = false;
          // Sort by date descending (latest first) - backend should already do this, but ensure it
          const sorted = items.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.sentAt || 0).getTime();
            const dateB = new Date(b.createdAt || b.sentAt || 0).getTime();
            return dateB - dateA; // Descending order
          });
          this.notifications = sorted;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Unable to load reminders', 'Close', {
            duration: 3000,
            panelClass: ['snack-error'],
          });
        },
      });
    });
  }
}

