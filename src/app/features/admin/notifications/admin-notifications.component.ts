import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationItem, NotificationType, NotificationChannel } from '../../../core/models/notification.model';
import { LicenseService } from '../../../core/services/license.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.scss'],
})
export class AdminNotificationsComponent implements OnInit {
  notifications: NotificationItem[] = [];
  loading = false;
  isEnterprise$: Observable<boolean>;

  readonly typeOptions: NotificationType[] = [
    'accrual_reminder',
    'ocr_pending',
    'budget_alert',
    'system',
  ];
  readonly channelOptions: NotificationChannel[] = ['inapp', 'email'];

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly notificationsService: NotificationsService,
    private readonly snackBar: MatSnackBar,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      message: ['', [Validators.required]],
      type: ['system' as NotificationType, Validators.required],
      channel: ['inapp' as NotificationChannel, Validators.required],
      scheduledFor: [''],
    });
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    this.notificationsService
      .createNotification({
        title: payload.title ?? '',
        message: payload.message ?? '',
        type: payload.type ?? 'system',
        channel: payload.channel ?? 'inapp',
        scheduledFor: payload.scheduledFor || undefined,
      })
      .subscribe({
        next: (notification) => {
          this.snackBar.open('Notification scheduled', 'Close', {
            duration: 3000,
          });
          this.notifications = [notification, ...this.notifications];
          this.form.reset({
            title: '',
            message: '',
            type: 'system',
            channel: 'inapp',
            scheduledFor: '',
          });
        },
        error: () => {
          this.snackBar.open('Failed to schedule notification', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  markAsRead(notification: NotificationItem, isRead: boolean): void {
    this.notificationsService.markAsRead(notification.id, isRead).subscribe({
      next: (updated) => {
        notification.isRead = updated.isRead;
        notification.sentAt = updated.sentAt;
        this.notifications = [...this.notifications];
      },
      error: () => {
        this.snackBar.open('Failed to update notification status', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  private loadNotifications(): void {
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
        this.snackBar.open('Unable to load notifications', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }
}

